import type { ConceptMasteryRecord } from '../../db/schema/types'

const WEAK_STRENGTH_THRESHOLD = 0.45

export function createInitialMastery(conceptId: string, now = new Date().toISOString()): ConceptMasteryRecord {
  return {
    conceptId,
    strength: 0.5,
    correctCount: 0,
    incorrectCount: 0,
    lastPracticedAt: null,
    isWeak: false,
    updatedAt: now,
  }
}

/**
 * Pure projection update from a single attempt outcome.
 * History (attempts) remains immutable; this only updates current mastery.
 */
export function applyAttemptToMastery(
  current: ConceptMasteryRecord | undefined,
  input: {
    conceptId: string
    isCorrect: boolean | null
    now?: string
  },
): ConceptMasteryRecord {
  const now = input.now ?? new Date().toISOString()
  const base = current ?? createInitialMastery(input.conceptId, now)

  if (input.isCorrect === null) {
    return {
      ...base,
      lastPracticedAt: now,
      updatedAt: now,
    }
  }

  const correctCount = base.correctCount + (input.isCorrect ? 1 : 0)
  const incorrectCount = base.incorrectCount + (input.isCorrect ? 0 : 1)
  const delta = input.isCorrect ? 0.12 : -0.18
  const strength = clamp(base.strength + delta, 0, 1)
  const isWeak =
    strength < WEAK_STRENGTH_THRESHOLD ||
    (incorrectCount >= 2 && incorrectCount >= correctCount)

  return {
    conceptId: input.conceptId,
    strength,
    correctCount,
    incorrectCount,
    lastPracticedAt: now,
    isWeak,
    updatedAt: now,
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
