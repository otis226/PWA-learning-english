import type { ExerciseRecord } from '../../db/schema/types'

export type ScoreInput = {
  exercise: ExerciseRecord
  answer: unknown
  /** Flashcard self-rating when type is flashcard. */
  selfRating?: 'again' | 'hard' | 'good' | 'easy'
}

export type ScoreResult = {
  isCorrect: boolean | null
  score: number | null
  gradingMode: 'deterministic' | 'self' | 'uncertain'
  normalizedAnswer?: string
  needsAiGrade?: boolean
}

/**
 * Deterministic scoring for closed forms. Flashcard uses explicit self-rating.
 * Short answer: normalize first; flag needsAiGrade when no deterministic match.
 */
export function scoreAnswer(input: ScoreInput): ScoreResult {
  const { exercise, answer } = input
  const payload = exercise.payload

  switch (payload.type) {
    case 'flashcard': {
      const rating = input.selfRating
      if (!rating) {
        return {
          isCorrect: null,
          score: null,
          gradingMode: 'self',
        }
      }
      const isCorrect = rating === 'hard' || rating === 'good' || rating === 'easy'
      const score =
        rating === 'easy' ? 1 : rating === 'good' ? 0.85 : rating === 'hard' ? 0.6 : 0
      return {
        isCorrect,
        score,
        gradingMode: 'self',
      }
    }
    case 'multiple_choice': {
      const index = typeof answer === 'number' ? answer : Number(answer)
      if (!Number.isInteger(index)) {
        return { isCorrect: false, score: 0, gradingMode: 'deterministic' }
      }
      const isCorrect = index === payload.correctIndex
      return {
        isCorrect,
        score: isCorrect ? 1 : 0,
        gradingMode: 'deterministic',
      }
    }
    case 'true_false': {
      const value = normalizeBoolean(answer)
      if (value === null) {
        return { isCorrect: false, score: 0, gradingMode: 'deterministic' }
      }
      const isCorrect = value === payload.correct
      return {
        isCorrect,
        score: isCorrect ? 1 : 0,
        gradingMode: 'deterministic',
      }
    }
    case 'cloze': {
      const text = normalizeAnswerText(String(answer ?? ''))
      const accepted = payload.acceptedAnswers.map(normalizeAnswerText)
      const isCorrect = accepted.includes(text)
      return {
        isCorrect,
        score: isCorrect ? 1 : 0,
        gradingMode: 'deterministic',
        normalizedAnswer: text,
      }
    }
    case 'short_answer': {
      const text = normalizeAnswerText(String(answer ?? ''))
      const accepted = payload.acceptedAnswers.map(normalizeAnswerText)
      if (accepted.includes(text)) {
        return {
          isCorrect: true,
          score: 1,
          gradingMode: 'deterministic',
          normalizedAnswer: text,
          needsAiGrade: false,
        }
      }
      // Fuzzy: strip punctuation and compare.
      const fuzzy = accepted.some((a) => fuzzyEqual(a, text))
      if (fuzzy) {
        return {
          isCorrect: true,
          score: 1,
          gradingMode: 'deterministic',
          normalizedAnswer: text,
          needsAiGrade: false,
        }
      }
      if (payload.allowAiGrade) {
        return {
          isCorrect: null,
          score: null,
          gradingMode: 'uncertain',
          normalizedAnswer: text,
          needsAiGrade: true,
        }
      }
      return {
        isCorrect: false,
        score: 0,
        gradingMode: 'deterministic',
        normalizedAnswer: text,
        needsAiGrade: false,
      }
    }
    default: {
      const _exhaustive: never = payload
      return _exhaustive
    }
  }
}

/** Cloze/short-answer normalization rules (documented + tested). */
export function normalizeAnswerText(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[’']/g, "'")
}

function fuzzyEqual(a: string, b: string): boolean {
  const strip = (s: string) => s.replace(/[^\p{L}\p{N}\s']/gu, '').replace(/\s+/g, ' ').trim()
  return strip(a) === strip(b)
}

function normalizeBoolean(answer: unknown): boolean | null {
  if (typeof answer === 'boolean') return answer
  if (typeof answer === 'string') {
    const v = answer.trim().toLowerCase()
    if (v === 'true' || v === 't' || v === 'yes') return true
    if (v === 'false' || v === 'f' || v === 'no') return false
  }
  if (answer === 1) return true
  if (answer === 0) return false
  return null
}
