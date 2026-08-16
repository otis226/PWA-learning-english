import type { z, ZodTypeAny } from 'zod'
import { parseOrThrow, safeParseWithSchema } from '../schemas/parse'
import type { AIProviderCapabilities } from '../schemas/capabilities'
import type {
  ChatCompletionRequest,
  ChatCompletionResult,
  ChatMessage,
} from '../providers/openai-compatible/chat-client'
import {
  AIRequestError,
  type AIErrorCategory,
} from '../providers/openai-compatible/errors'
import { AppError } from '../../shared/errors'

/**
 * Structured-output strategy order (D-007):
 * 1. json_schema when capability is enabled
 * 2. json_object when capability is enabled
 * 3. plain completion + JSON extraction + Zod validate + bounded repair
 *
 * Fallback to the next strategy applies ONLY with concrete evidence that the
 * provider rejects the current structured-output capability / response_format
 * (typically HTTP 400/422 + message about response_format / json_schema /
 * json_object / structured outputs). Terminal errors and unrelated provider
 * failures must not cascade to another strategy.
 *
 * Invalid model output never returns as success domain data.
 */

/** Errors that must stop the runner immediately (no strategy fallback). */
export const TERMINAL_STRUCTURED_OUTPUT_ERROR_CATEGORIES = [
  'unauthorized',
  'rate_limit',
  'timeout',
  'offline',
  'network_or_cors',
  'aborted',
  'missing_credential',
] as const satisfies readonly AIErrorCategory[]

const terminalStructuredOutputErrors = new Set<AIErrorCategory>(
  TERMINAL_STRUCTURED_OUTPUT_ERROR_CATEGORIES,
)

/** HTTP statuses commonly used when a request body field is unsupported. */
const UNSUPPORTED_STRUCTURED_OUTPUT_STATUSES = new Set([400, 422])

/**
 * Phrases that indicate the provider rejected structured-output machinery
 * (response_format / schema modes), not a generic bad request.
 */
const UNSUPPORTED_STRUCTURED_OUTPUT_PATTERNS: readonly RegExp[] = [
  /\bresponse[_\s-]?format\b/i,
  /\bjson[_\s-]?schema\b/i,
  /\bjson[_\s-]?object\b/i,
  /\bstructured[_\s-]?outputs?\b/i,
  /\bstructured[_\s-]?output\b/i,
]

export function isTerminalStructuredOutputError(error: unknown): boolean {
  return (
    error instanceof AIRequestError && terminalStructuredOutputErrors.has(error.category)
  )
}

/**
 * True only when the error is concrete evidence that the current strategy's
 * structured-output / response_format capability is unsupported.
 */
export function isUnsupportedStructuredOutputError(error: unknown): boolean {
  if (!(error instanceof AIRequestError)) {
    return false
  }
  if (isTerminalStructuredOutputError(error)) {
    return false
  }
  // Only client validation-style statuses; 404/5xx/etc. are not capability signals.
  if (error.status === null || !UNSUPPORTED_STRUCTURED_OUTPUT_STATUSES.has(error.status)) {
    return false
  }
  // invalid_response is a successful HTTP parse failure, not unsupported format.
  if (error.category === 'invalid_response') {
    return false
  }
  if (error.category !== 'provider_error') {
    return false
  }

  const haystack = [error.providerMessage, error.message]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join('\n')
    .toLowerCase()

  if (!haystack) {
    return false
  }

  return UNSUPPORTED_STRUCTURED_OUTPUT_PATTERNS.some((pattern) => pattern.test(haystack))
}
export type StructuredOutputStrategy = 'json_schema' | 'json_object' | 'extract_repair'

export type StructuredOutputRequest<TSchema extends ZodTypeAny> = {
  schema: TSchema
  schemaName: string
  jsonSchema: Record<string, unknown>
  messages: ChatMessage[]
  capabilities: AIProviderCapabilities
  maxRepairAttempts?: number
  temperature?: number
}

export type StructuredCompletionFn = (
  request: ChatCompletionRequest,
) => Promise<ChatCompletionResult>

export type StructuredOutputSuccess<T> = {
  ok: true
  data: T
  strategy: StructuredOutputStrategy
  attempts: number
}

export type StructuredOutputFailure = {
  ok: false
  error: AppError | AIRequestError
  strategyTried: StructuredOutputStrategy[]
  attempts: number
}

export type StructuredOutputResult<T> =
  | StructuredOutputSuccess<T>
  | StructuredOutputFailure

export function selectStructuredStrategies(
  capabilities: AIProviderCapabilities,
): StructuredOutputStrategy[] {
  const strategies: StructuredOutputStrategy[] = []
  if (capabilities.jsonSchema) {
    strategies.push('json_schema')
  }
  if (capabilities.jsonObject) {
    strategies.push('json_object')
  }
  strategies.push('extract_repair')
  return strategies
}

export async function runStructuredOutput<TSchema extends ZodTypeAny>(
  complete: StructuredCompletionFn,
  request: StructuredOutputRequest<TSchema>,
): Promise<StructuredOutputResult<z.infer<TSchema>>> {
  const strategies = selectStructuredStrategies(request.capabilities)
  const maxRepairAttempts = request.maxRepairAttempts ?? 1
  let attempts = 0
  const tried: StructuredOutputStrategy[] = []
  let lastError: AppError | AIRequestError = new AppError(
    'structured_output_failed',
    'Structured output failed',
  )

  for (const strategy of strategies) {
    tried.push(strategy)
    const maxPasses = strategy === 'extract_repair' ? 1 + maxRepairAttempts : 1
    let messages = [...request.messages]

    for (let pass = 0; pass < maxPasses; pass += 1) {
      attempts += 1
      try {
        const completion = await complete({
          model: '',
          messages,
          temperature: request.temperature ?? 0,
          response_format: responseFormatForStrategy(strategy, request),
        })

        const candidate = extractJsonCandidate(completion.content)
        if (candidate === null) {
          lastError = new AppError(
            'invalid_json',
            'Model output did not contain valid JSON',
          )
          if (strategy === 'extract_repair' && pass < maxPasses - 1) {
            messages = appendRepairMessage(messages, lastError.message)
            continue
          }
          break
        }

        const parsed = safeParseWithSchema(request.schema, candidate, 'schema_mismatch')
        if (parsed.success) {
          return {
            ok: true,
            data: parsed.data,
            strategy,
            attempts,
          }
        }

        lastError = parsed.error
        if (strategy === 'extract_repair' && pass < maxPasses - 1) {
          messages = appendRepairMessage(messages, parsed.issues.join('; '))
          continue
        }
      } catch (error) {
        if (error instanceof AIRequestError) {
          lastError = error
          // Only concrete unsupported response_format / structured-output evidence
          // may try the next strategy. Everything else fails immediately.
          if (isUnsupportedStructuredOutputError(error)) {
            break
          }
          return {
            ok: false,
            error: lastError,
            strategyTried: tried,
            attempts,
          }
        }
        lastError =
          error instanceof AppError
            ? error
            : new AppError('structured_output_failed', 'Structured output failed', {
                cause: error,
              })
        // Non-AI errors (including generic Error) are not capability evidence.
        return {
          ok: false,
          error: lastError,
          strategyTried: tried,
          attempts,
        }
      }
    }
  }

  return {
    ok: false,
    error: lastError,
    strategyTried: tried,
    attempts,
  }
}

/** Convenience that throws instead of returning a result object. */
export async function runStructuredOutputOrThrow<TSchema extends ZodTypeAny>(
  complete: StructuredCompletionFn,
  request: StructuredOutputRequest<TSchema>,
): Promise<z.infer<TSchema>> {
  const result = await runStructuredOutput(complete, request)
  if (!result.ok) {
    throw result.error
  }
  return result.data
}

function responseFormatForStrategy(
  strategy: StructuredOutputStrategy,
  request: StructuredOutputRequest<ZodTypeAny>,
): ChatCompletionRequest['response_format'] | undefined {
  switch (strategy) {
    case 'json_schema':
      return {
        type: 'json_schema',
        json_schema: {
          name: request.schemaName,
          strict: true,
          schema: request.jsonSchema,
        },
      }
    case 'json_object':
      return { type: 'json_object' }
    case 'extract_repair':
      return undefined
    default: {
      const _exhaustive: never = strategy
      return _exhaustive
    }
  }
}

export function extractJsonCandidate(text: string): unknown | null {
  const trimmed = text.trim()
  if (!trimmed) {
    return null
  }

  const attempts = [trimmed]
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    attempts.push(fenced[1].trim())
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    attempts.push(trimmed.slice(firstBrace, lastBrace + 1))
  }

  const firstBracket = trimmed.indexOf('[')
  const lastBracket = trimmed.lastIndexOf(']')
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    attempts.push(trimmed.slice(firstBracket, lastBracket + 1))
  }

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate) as unknown
    } catch {
      // try next
    }
  }
  return null
}

function appendRepairMessage(messages: ChatMessage[], issues: string): ChatMessage[] {
  return [
    ...messages,
    {
      role: 'user',
      content: `Your previous response was invalid JSON for the required schema. Fix these issues and respond with JSON only:\n${issues}`,
    },
  ]
}

/** Re-export for callers that only need throw-on-invalid parse after extraction. */
export { parseOrThrow }
