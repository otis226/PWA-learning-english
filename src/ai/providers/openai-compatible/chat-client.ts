import type { CredentialStore } from '../../credentials/types'
import {
  AIRequestError,
  categorizeHttpStatus,
  extractProviderErrorMessage,
  userMessageForCategory,
} from './errors'
import { normalizeChatCompletionsUrl } from './normalize-url'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type ChatCompletionRequest = {
  model: string
  messages: ChatMessage[]
  max_tokens?: number
  temperature?: number
  response_format?:
    | { type: 'json_object' }
    | {
        type: 'json_schema'
        json_schema: {
          name: string
          strict?: boolean
          schema: Record<string, unknown>
        }
      }
}

export type ChatCompletionResult = {
  content: string
  raw: unknown
}

export type OpenAICompatibleChatClientOptions = {
  baseUrl: string
  model: string
  providerProfileId: string
  credentialStore: CredentialStore
  fetchImpl?: typeof fetch
  /**
   * Optional request timeout in ms. `null` / omitted means no client-side
   * deadline (slow OpenAI-compatible providers must not hit a hard 30s ceiling).
   * Callers may still cancel via `AbortSignal`.
   */
  timeoutMs?: number | null
  isOnline?: () => boolean
}

export class OpenAICompatibleChatClient {
  private readonly endpoint: string
  private readonly model: string
  private readonly providerProfileId: string
  private readonly credentialStore: CredentialStore
  private readonly fetchImpl: typeof fetch
  private readonly timeoutMs: number | null
  private readonly isOnline: () => boolean

  constructor(options: OpenAICompatibleChatClientOptions) {
    this.endpoint = normalizeChatCompletionsUrl(options.baseUrl)
    this.model = options.model
    this.providerProfileId = options.providerProfileId
    this.credentialStore = options.credentialStore
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.timeoutMs =
      options.timeoutMs === undefined || options.timeoutMs === null
        ? null
        : options.timeoutMs
    this.isOnline =
      options.isOnline ??
      (() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false))
  }

  /**
   * Minimal compatibility probe: model + a tiny user message only.
   * Does not send optional generation knobs (temperature, max_tokens, response_format).
   * Capability probing belongs elsewhere.
   */
  async testConnection(signal?: AbortSignal): Promise<ChatCompletionResult> {
    return this.complete(
      {
        model: this.model,
        messages: [{ role: 'user', content: 'ping' }],
      },
      signal,
    )
  }

  async complete(
    request: ChatCompletionRequest,
    signal?: AbortSignal,
  ): Promise<ChatCompletionResult> {
    if (!this.isOnline()) {
      throw new AIRequestError('offline', userMessageForCategory('offline'))
    }

    const credential = await this.credentialStore.get(this.providerProfileId)
    if (!credential?.apiKey) {
      throw new AIRequestError(
        'missing_credential',
        userMessageForCategory('missing_credential'),
      )
    }

    const controller = new AbortController()
    const onAbort = () => controller.abort()
    if (signal) {
      if (signal.aborted) {
        controller.abort()
      } else {
        signal.addEventListener('abort', onAbort, { once: true })
      }
    }

    const timeoutId =
      this.timeoutMs === null
        ? null
        : setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const body: Record<string, unknown> = {
        model: request.model || this.model,
        messages: request.messages,
      }
      if (request.max_tokens !== undefined) {
        body.max_tokens = request.max_tokens
      }
      if (request.temperature !== undefined) {
        body.temperature = request.temperature
      }
      if (request.response_format !== undefined) {
        body.response_format = request.response_format
      }

      const response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${credential.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      const text = await response.text()
      let parsed: unknown = null
      if (text) {
        try {
          parsed = JSON.parse(text) as unknown
        } catch {
          parsed = text
        }
      }

      if (!response.ok) {
        const category = categorizeHttpStatus(response.status)
        const providerMessage = extractProviderErrorMessage(parsed)
        throw new AIRequestError(category, userMessageForCategory(category), {
          status: response.status,
          providerMessage,
        })
      }

      const content = extractAssistantContent(parsed)
      if (content === null) {
        throw new AIRequestError(
          'invalid_response',
          userMessageForCategory('invalid_response'),
          { status: response.status },
        )
      }

      return { content, raw: parsed }
    } catch (error) {
      if (error instanceof AIRequestError) {
        throw error
      }
      if (isAbortError(error)) {
        if (signal?.aborted) {
          throw new AIRequestError('aborted', userMessageForCategory('aborted'), {
            cause: error,
          })
        }
        throw new AIRequestError('timeout', userMessageForCategory('timeout'), {
          cause: error,
        })
      }
      throw new AIRequestError(
        'network_or_cors',
        userMessageForCategory('network_or_cors'),
        { cause: error },
      )
    } finally {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
      if (signal) {
        signal.removeEventListener('abort', onAbort)
      }
    }
  }
}

function extractAssistantContent(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }
  const choices = (payload as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) {
    return null
  }
  const first = choices[0] as { message?: { content?: unknown } }
  const content = first?.message?.content
  if (typeof content === 'string') {
    return content
  }
  return null
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }
  const name = (error as { name?: string }).name
  return name === 'AbortError'
}
