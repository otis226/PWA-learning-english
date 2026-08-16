import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { parseOrThrow, safeParseWithSchema } from './parse'

const sampleSchema = z.object({
  name: z.string().min(1),
  count: z.number().int().positive(),
})

describe('parse helpers', () => {
  it('parseOrThrow returns validated data', () => {
    const data = parseOrThrow(sampleSchema, { name: 'a', count: 2 })
    expect(data).toEqual({ name: 'a', count: 2 })
  })

  it('parseOrThrow throws AppError on invalid input', () => {
    expect(() => parseOrThrow(sampleSchema, { name: '', count: -1 })).toThrow(
      /name|count/,
    )
  })

  it('safeParseWithSchema returns failure issues without throwing', () => {
    const result = safeParseWithSchema(sampleSchema, { name: 1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues.length).toBeGreaterThan(0)
      expect(result.error.code).toBe('validation_failed')
    }
  })
})
