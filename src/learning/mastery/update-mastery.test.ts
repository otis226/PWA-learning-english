import { describe, expect, it } from 'vitest'
import { applyAttemptToMastery, createInitialMastery } from './update-mastery'

describe('mastery projection', () => {
  it('marks weak after repeated incorrect answers', () => {
    let m = createInitialMastery('c1')
    m = applyAttemptToMastery(m, { conceptId: 'c1', isCorrect: false })
    m = applyAttemptToMastery(m, { conceptId: 'c1', isCorrect: false })
    expect(m.incorrectCount).toBe(2)
    expect(m.isWeak).toBe(true)
    expect(m.strength).toBeLessThan(0.5)
  })

  it('strengthens on correct answers without erasing counts', () => {
    let m = createInitialMastery('c1')
    m = applyAttemptToMastery(m, { conceptId: 'c1', isCorrect: true })
    m = applyAttemptToMastery(m, { conceptId: 'c1', isCorrect: true })
    expect(m.correctCount).toBe(2)
    expect(m.strength).toBeGreaterThan(0.5)
  })
})
