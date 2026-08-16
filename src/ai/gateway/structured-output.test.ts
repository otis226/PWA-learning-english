import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  extractJsonCandidate,
  runStructuredOutput,
  selectStructuredStrategies,
} from './structured-output'
import type { AIProviderCapabilities } from '../schemas/capabilities'

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

  it('falls back from json_schema to extract when first strategy fails hard', async () => {
    const complete = vi
      .fn()
      .mockRejectedValueOnce(new Error('schema unsupported'))
      .mockResolvedValueOnce({
        content: '{"title":"via extract","score":2}',
        raw: {},
      })

    const result = await runStructuredOutput(complete, {
      schema: sampleSchema,
      schemaName: 'Sample',
      jsonSchema: { type: 'object' },
      messages: [{ role: 'user', content: 'go' }],
      capabilities: { ...baseCapabilities, jsonSchema: true },
      maxRepairAttempts: 0,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.strategy).toBe('extract_repair')
    }
  })
})
