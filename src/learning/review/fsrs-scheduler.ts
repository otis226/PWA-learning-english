import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card,
  type Grade,
} from 'ts-fsrs'
import type { FsrsCardState, ReviewCardRecord } from '../../db/schema/types'
import { createId } from '../../shared/ids'

/**
 * FSRS rating UX (locked for M4 — see docs/DECISIONS.md D-023):
 * - Incorrect closed-form / Again self-rate → Again (1)
 * - Correct without finer rating → Good (3)
 * - Flashcard / explicit learner choice: Again | Hard | Good | Easy
 * - Short-answer uncertain → Hard (2) when learner continues, else skip scheduling
 */
export type FsrsRatingLabel = 'again' | 'hard' | 'good' | 'easy'

const scheduler = fsrs(
  generatorParameters({
    enable_fuzz: false,
    enable_short_term: true,
  }),
)

export function mapResultToFsrsRating(input: {
  isCorrect: boolean | null
  selfRating?: FsrsRatingLabel | null
}): Grade | null {
  if (input.selfRating) {
    return labelToGrade(input.selfRating)
  }
  if (input.isCorrect === true) {
    return Rating.Good
  }
  if (input.isCorrect === false) {
    return Rating.Again
  }
  return null
}

function labelToGrade(label: FsrsRatingLabel): Grade {
  switch (label) {
    case 'again':
      return Rating.Again
    case 'hard':
      return Rating.Hard
    case 'good':
      return Rating.Good
    case 'easy':
      return Rating.Easy
    default: {
      const _exhaustive: never = label
      return _exhaustive
    }
  }
}

export function gradeToLabel(grade: Grade): FsrsRatingLabel {
  switch (grade) {
    case Rating.Again:
      return 'again'
    case Rating.Hard:
      return 'hard'
    case Rating.Good:
      return 'good'
    case Rating.Easy:
      return 'easy'
    default: {
      // Rating.Manual is not used in product UX.
      return 'good'
    }
  }
}

export function createNewReviewCard(input: {
  conceptId: string
  preferredExerciseId?: string | null
  now?: Date
}): ReviewCardRecord {
  const now = input.now ?? new Date()
  const empty = createEmptyCard(now)
  const iso = now.toISOString()
  return {
    id: createId('review'),
    conceptId: input.conceptId,
    preferredExerciseId: input.preferredExerciseId ?? null,
    fsrs: cardToState(empty),
    createdAt: iso,
    updatedAt: iso,
  }
}

export function scheduleReview(
  card: ReviewCardRecord,
  grade: Grade,
  now = new Date(),
): {
  nextCard: ReviewCardRecord
  log: {
    rating: 1 | 2 | 3 | 4
    stateBefore: number
    stateAfter: number
    dueBefore: string
    dueAfter: string
    scheduledDays: number
  }
} {
  const before = stateToCard(card.fsrs)
  const record = scheduler.next(before, now, grade)
  const nextState = cardToState(record.card)
  const rating = grade as 1 | 2 | 3 | 4

  return {
    nextCard: {
      ...card,
      fsrs: nextState,
      updatedAt: now.toISOString(),
    },
    log: {
      rating,
      stateBefore: before.state,
      stateAfter: record.card.state,
      dueBefore: toIso(before.due),
      dueAfter: nextState.due,
      scheduledDays: record.card.scheduled_days,
    },
  }
}

export function cardToState(card: Card): FsrsCardState {
  return {
    due: toIso(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? toIso(card.last_review) : null,
  }
}

export function stateToCard(state: FsrsCardState): Card {
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsed_days,
    scheduled_days: state.scheduled_days,
    learning_steps: state.learning_steps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state,
    last_review: state.last_review ? new Date(state.last_review) : undefined,
  }
}

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

export { Rating }
