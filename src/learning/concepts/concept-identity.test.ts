import { describe, expect, it } from 'vitest'
import { buildConceptIdentityKey, labelsLikelySameConcept } from './concept-identity'

describe('concept identity', () => {
  it('merges only same kind + normalized label + pattern', () => {
    const a = buildConceptIdentityKey({ kind: 'grammar', label: 'Despite + noun' })
    const b = buildConceptIdentityKey({ kind: 'grammar', label: 'despite + noun' })
    expect(a).toBe(b)
  })

  it('keeps vocabulary and grammar separate for same surface form', () => {
    const vocab = buildConceptIdentityKey({ kind: 'vocabulary', label: 'since' })
    const grammar = buildConceptIdentityKey({
      kind: 'grammar',
      label: 'since',
      patternHint: 'since vs for',
    })
    expect(vocab).not.toBe(grammar)
  })

  it('compares labels conservatively', () => {
    expect(labelsLikelySameConcept('  In spite of ', 'in spite of')).toBe(true)
    expect(labelsLikelySameConcept('despite', 'although')).toBe(false)
  })
})
