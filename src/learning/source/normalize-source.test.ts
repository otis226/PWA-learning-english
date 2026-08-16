import { describe, expect, it } from 'vitest'
import { MAX_SOURCE_CHARS, normalizeSourceInput } from './normalize-source'
import { AppError } from '../../shared/errors'

describe('normalizeSourceInput', () => {
  it('normalizes pasted text and derives a title', () => {
    const result = normalizeSourceInput({
      type: 'pasted_text',
      content: '  Hello   world\n\n\nSecond  line  ',
    })
    expect(result.normalizedContent).toContain('Hello world')
    expect(result.title).toBe('Hello world')
  })

  it('dedupes vocabulary list lines', () => {
    const result = normalizeSourceInput({
      type: 'vocabulary_list',
      content: 'despite\nAlthough\ndespite\nin spite of',
    })
    expect(result.normalizedContent.split('\n')).toEqual([
      'despite',
      'Although',
      'in spite of',
    ])
  })

  it('rejects empty and oversized input', () => {
    expect(() =>
      normalizeSourceInput({ type: 'custom_topic', content: '   ' }),
    ).toThrow(AppError)
    expect(() =>
      normalizeSourceInput({
        type: 'pasted_text',
        content: 'x'.repeat(MAX_SOURCE_CHARS + 1),
      }),
    ).toThrow(/too large/i)
  })
})
