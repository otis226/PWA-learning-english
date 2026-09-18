import { describe, expect, it } from 'vitest'
import { normalizeEnglishText, textSimilarityPercent } from './text-scoring'

describe('study text scoring', () => {
  it('normalizes punctuation and casing', () => {
    expect(normalizeEnglishText('  Hello, WORLD!  ')).toBe('hello world')
  })

  it('scores exact normalized answers as 100', () => {
    expect(textSimilarityPercent("Don't stop.", "don't stop")).toBe(100)
  })

  it('penalizes materially different answers', () => {
    expect(textSimilarityPercent('I work from home', 'I walk home')).toBeLessThan(80)
  })
})
