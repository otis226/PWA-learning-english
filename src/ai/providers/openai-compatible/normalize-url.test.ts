import { describe, expect, it } from 'vitest'
import { normalizeChatCompletionsUrl } from './normalize-url'

describe('normalizeChatCompletionsUrl', () => {
  it('appends /v1/chat/completions to origin-only base', () => {
    expect(normalizeChatCompletionsUrl('https://api.openai.com')).toBe(
      'https://api.openai.com/v1/chat/completions',
    )
  })

  it('handles trailing slash on /v1', () => {
    expect(normalizeChatCompletionsUrl('https://api.openai.com/v1/')).toBe(
      'https://api.openai.com/v1/chat/completions',
    )
  })

  it('does not duplicate chat/completions', () => {
    expect(
      normalizeChatCompletionsUrl('https://api.openai.com/v1/chat/completions'),
    ).toBe('https://api.openai.com/v1/chat/completions')
  })

  it('avoids /v1/v1 duplication', () => {
    expect(normalizeChatCompletionsUrl('https://example.com/v1/v1')).toBe(
      'https://example.com/v1/chat/completions',
    )
  })

  it('rejects non-http protocols', () => {
    expect(() => normalizeChatCompletionsUrl('ftp://example.com')).toThrow(
      /http/,
    )
  })
})
