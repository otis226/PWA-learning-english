import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  extractJsonCandidate,
  isUnsupportedStructuredOutputError,
  runStructuredOutput,
  selectStructuredStrategies,
  TERMINAL_STRUCTURED_OUTPUT_ERROR_CATEGORIES,
} from './structured-output'
import type { AIProviderCapabilities } from '../schemas/capabilities'
import { AIRequestError } from '../providers/openai-compatible/errors'
import type { AIErrorCategory } from '../providers/openai-compatible/errors'

const sampleSchema = z.object({
  title: z.string().min(1),
  score: z.number().int().nonnegative(),
})

const baseCapabilities: AIProviderCapabilities = {
  chatCompletions: true,
  responses: false,
  jsonSchema: false,
  jsonObject: false,
  streaming: false,
  vision: false,
  fileInput: false,
}

const multiStrategyCapabilities: AIProviderCapabilities = {
  ...baseCapabilities,
  jsonSchema: true,
  jsonObject: true,
}

async function runWithMultiStrategy(
  complete: ReturnType<typeof vi.fn>,
): Promise<Awaited<ReturnType<typeof runStructuredOutput>>> {
  return runStructuredOutput(complete, {
    schema: sampleSchema,
    schemaName: 'Sample',
    jsonSchema: { type: 'object' },
    messages: [{ role: 'user', content: 'go' }],
    capabilities: multiStrategyCapabilities,
    maxRepairAttempts: 2,
  })
}

describe('structured-output contract', () => {
  it('orders strategies by capability', () => {
    expect(
      selectStructuredStrategies({ ...baseCapabilities, jsonSchema: true, jsonObject: true }),
    ).toEqual(['json_schema', 'json_object', 'extract_repair'])
    expect(selectStructuredStrategies(baseCapabilities)).toEqual(['extract_repair'])
  })

  it('extracts JSON from fenced model output', () => {
    expect(extractJsonCandidate('```json\n{"a":1}\n```')).toEqual({ a: 1 })
  })

  it('does not send temperature unless the caller configured it', async () => {
    const complete = vi.fn().mockResolvedValue({
      content: JSON.stringify({ title: 'ok', score: 3 }),
      raw: {},
    })
    await runStructuredOutput(complete, {
      schema: sampleSchema,
      schemaName: 'Sample',
      jsonSchema: {},
      messages: [{ role: 'user', content: 'go' }],
      capabilities: baseCapabilities,
    })
    expect(complete).toHaveBeenCalledOnce()
    const body = complete.mock.calls[0]?.[0] as { temperature?: number }
    expect(body).not.toHaveProperty('temperature')
  })

  it('forwards temperature only when explicitly configured', async () => {
    const complete = vi.fn().mockResolvedValue({
      content: JSON.stringify({ title: 'ok', score: 3 }),
      raw: {},
    })
    await runStructuredOutput(complete, {
      schema: sampleSchema,
      schemaName: 'Sample',
      jsonSchema: {},
      messages: [{ role: 'user', content: 'go' }],
      capabilities: baseCapabilities,
      temperature: 0.2,
    })
    expect(complete.mock.calls[0]?.[0]).toMatchObject({ temperature: 0.2 })
  })

  it('returns validated data on success', async () => {
    const complete = vi.fn().mockResolvedValue({
      content: JSON.stringify({ title: 'ok', score: 3 }),
      raw: {},
    })
    const result = await runStructuredOutput(complete, {
      schema: sampleSchema,
      schemaName: 'Sample',
      jsonSchema: {},
      messages: [{ role: 'user', content: 'go' }],
      capabilities: baseCapabilities,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual({ title: 'ok', score: 3 })
      expect(result.strategy).toBe('extract_repair')
    }
  })

  it('never returns invalid data as success', async () => {
    const complete = vi.fn().mockResolvedValue({
      content: JSON.stringify({ title: '', score: -1 }),
      raw: {},
    })
    const result = await runStructuredOutput(complete, {
      schema: sampleSchema,
      schemaName: 'Sample',
      jsonSchema: {},
      messages: [{ role: 'user', content: 'go' }],
      capabilities: baseCapabilities,
      maxRepairAttempts: 0,
    })
    expect(result.ok).toBe(false)
  })

  it('bounded repair can recover after schema mismatch', async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce({
        content: JSON.stringify({ title: '', score: 1 }),
        raw: {},
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({ title: 'fixed', score: 1 }),
        raw: {},
      })

    const result = await runStructuredOutput(complete, {
      schema: sampleSchema,
      schemaName: 'Sample',
      jsonSchema: {},
      messages: [{ role: 'user', content: 'go' }],
      capabilities: baseCapabilities,
      maxRepairAttempts: 1,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.title).toBe('fixed')
      expect(result.attempts).toBe(2)
    }
  })

  it('detects unsupported structured-output evidence on 400/422 messages', () => {
    expect(
      isUnsupportedStructuredOutputError(
        new AIRequestError('provider_error', 'bad request', {
          status: 400,
          providerMessage: 'unknown parameter response_format',
        }),
      ),
    ).toBe(true)
    expect(
      isUnsupportedStructuredOutputError(
        new AIRequestError('provider_error', 'json_schema not supported', {
          status: 422,
          providerMessage: 'Invalid type for json_schema',
        }),
      ),
    ).toBe(true)
    expect(
      isUnsupportedStructuredOutputError(
        new AIRequestError('provider_error', 'model not found', {
          status: 404,
          providerMessage: 'model_not_found',
        }),
      ),
    ).toBe(false)
    expect(
      isUnsupportedStructuredOutputError(
        new AIRequestError('provider_error', 'invalid max_tokens', {
          status: 400,
          providerMessage: 'max_tokens must be positive',
        }),
      ),
    ).toBe(false)
  })

  it.each([
    {
      name: 'response_format unsupported 400',
      status: 400,
      providerMessage: 'unknown parameter: response_format',
    },
    {
      name: 'json_schema unsupported 422',
      status: 422,
      providerMessage: 'json_schema is not supported for this model',
    },
  ])(
    'falls back when $name (more than one provider call)',
    async ({ status, providerMessage }) => {
      const complete = vi
        .fn()
        .mockRejectedValueOnce(
          new AIRequestError('provider_error', 'Structured output rejected', {
            status,
            providerMessage,
          }),
        )
        .mockResolvedValueOnce({
          content: '{"title":"via object","score":2}',
          raw: {},
        })

      const result = await runWithMultiStrategy(complete)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.strategy).toBe('json_object')
      }
      expect(complete).toHaveBeenCalledTimes(2)
      expect(result.attempts).toBe(2)
    },
  )

  it('unauthorized → exactly 1 provider call', async () => {
    const complete = vi
      .fn()
      .mockRejectedValue(new AIRequestError('unauthorized', 'bad key', { status: 401 }))

    const result = await runWithMultiStrategy(complete)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect((result.error as AIRequestError).category).toBe('unauthorized')
      expect(result.strategyTried).toEqual(['json_schema'])
      expect(result.attempts).toBe(1)
    }
    expect(complete).toHaveBeenCalledTimes(1)
  })

  it('rate limit → exactly 1 provider call', async () => {
    const complete = vi
      .fn()
      .mockRejectedValue(new AIRequestError('rate_limit', 'slow down', { status: 429 }))

    const result = await runWithMultiStrategy(complete)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect((result.error as AIRequestError).category).toBe('rate_limit')
      expect(result.strategyTried).toEqual(['json_schema'])
      expect(result.attempts).toBe(1)
    }
    expect(complete).toHaveBeenCalledTimes(1)
  })

  it('model_not_found 404 → exactly 1 provider call', async () => {
    const complete = vi.fn().mockRejectedValue(
      new AIRequestError('provider_error', 'The provider returned an error', {
        status: 404,
        providerMessage: 'model_not_found: gpt-missing',
      }),
    )

    const result = await runWithMultiStrategy(complete)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect((result.error as AIRequestError).category).toBe('provider_error')
      expect((result.error as AIRequestError).status).toBe(404)
      expect(result.strategyTried).toEqual(['json_schema'])
      expect(result.attempts).toBe(1)
    }
    expect(complete).toHaveBeenCalledTimes(1)
  })

  it('server 500 → exactly 1 provider call', async () => {
    const complete = vi.fn().mockRejectedValue(
      new AIRequestError('provider_error', 'The provider returned an error', {
        status: 500,
        providerMessage: 'internal server error',
      }),
    )

    const result = await runWithMultiStrategy(complete)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect((result.error as AIRequestError).status).toBe(500)
      expect(result.strategyTried).toEqual(['json_schema'])
      expect(result.attempts).toBe(1)
    }
    expect(complete).toHaveBeenCalledTimes(1)
  })

  it('generic 400 unrelated to response_format → exactly 1 provider call', async () => {
    const complete = vi.fn().mockRejectedValue(
      new AIRequestError('provider_error', 'The provider returned an error', {
        status: 400,
        providerMessage: 'temperature must be between 0 and 2',
      }),
    )

    const result = await runWithMultiStrategy(complete)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect((result.error as AIRequestError).status).toBe(400)
      expect(result.strategyTried).toEqual(['json_schema'])
      expect(result.attempts).toBe(1)
    }
    expect(complete).toHaveBeenCalledTimes(1)
  })

  it('generic Error is not capability evidence (single provider call)', async () => {
    const complete = vi.fn().mockRejectedValueOnce(new Error('schema unsupported'))

    const result = await runWithMultiStrategy(complete)

    expect(result.ok).toBe(false)
    expect(complete).toHaveBeenCalledTimes(1)
    if (!result.ok) {
      expect(result.strategyTried).toEqual(['json_schema'])
      expect(result.attempts).toBe(1)
    }
  })

  it.each(
    [...TERMINAL_STRUCTURED_OUTPUT_ERROR_CATEGORIES] as AIErrorCategory[],
  )(
    'does not fallback on terminal AI error category %s (single provider call)',
    async (category) => {
      const complete = vi
        .fn()
        .mockRejectedValue(new AIRequestError(category, `terminal:${category}`))

      const result = await runWithMultiStrategy(complete)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(AIRequestError)
        expect((result.error as AIRequestError).category).toBe(category)
        expect(result.attempts).toBe(1)
        expect(result.strategyTried).toEqual(['json_schema'])
      }
      expect(complete).toHaveBeenCalledTimes(1)
    },
  )
})
