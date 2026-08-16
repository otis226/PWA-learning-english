import type {
  ConceptRecord,
  ExerciseRecord,
  ReviewCardRecord,
  StudySessionRecord,
} from '../../db/schema/types'
import {
  ConceptMasteryRepository,
  ConceptRepository,
  ExerciseRepository,
  ReviewCardRepository,
  StudySessionRepository,
} from '../../db/repositories/learning-repositories'
import type { AppSettingsRepository } from '../../db/repositories/app-settings-repository'
import { createId } from '../../shared/ids'
import { AppError } from '../../shared/errors'

export type DueReviewItem = {
  card: ReviewCardRecord
  concept: ConceptRecord
  exercise: ExerciseRecord | null
}

export class ReviewService {
  constructor(
    private readonly reviewCards: ReviewCardRepository,
    private readonly concepts: ConceptRepository,
    private readonly exercises: ExerciseRepository,
    private readonly mastery: ConceptMasteryRepository,
    private readonly sessions: StudySessionRepository,
    private readonly settings: AppSettingsRepository,
  ) {}

  async listDue(now = new Date(), limit = 30): Promise<DueReviewItem[]> {
    const cards = await this.reviewCards.listDue(now.toISOString(), limit)
    const items: DueReviewItem[] = []
    for (const card of cards) {
      const concept = await this.concepts.getById(card.conceptId)
      if (!concept) continue
      let exercise: ExerciseRecord | null = null
      if (card.preferredExerciseId) {
        exercise = (await this.exercises.getById(card.preferredExerciseId)) ?? null
      }
      if (!exercise) {
        // Offline-friendly fallback: any exercise targeting this concept.
        const all = await this.exercises.listAll()
        exercise =
          all.find((e) => e.targetConceptIds.includes(card.conceptId)) ?? null
      }
      items.push({ card, concept, exercise })
    }
    return items
  }

  async countDue(now = new Date()): Promise<number> {
    const cards = await this.reviewCards.listDue(now.toISOString(), 500)
    return cards.length
  }

  /**
   * Start a review session from due cards that already have stored exercises.
   * Cards without stored material are skipped so offline review still works.
   */
  async startReviewSession(now = new Date()): Promise<{
    session: StudySessionRecord
    exercises: ExerciseRecord[]
    skippedWithoutMaterial: number
  }> {
    const due = await this.listDue(now, 40)
    const withMaterial = due.filter((item) => item.exercise)
    const skippedWithoutMaterial = due.length - withMaterial.length
    if (withMaterial.length === 0) {
      throw new AppError(
        'no_due_reviews',
        due.length === 0
          ? 'No reviews are due right now.'
          : 'Due concepts have no stored exercises yet. Practice a pack online first.',
      )
    }

    const exercises = withMaterial.map((item) => item.exercise!)
    const iso = now.toISOString()
    const session: StudySessionRecord = {
      id: createId('session'),
      packId: null,
      kind: 'review',
      status: 'in_progress',
      exerciseIds: exercises.map((e) => e.id),
      currentIndex: 0,
      correctCount: 0,
      incorrectCount: 0,
      startedAt: iso,
      completedAt: null,
      updatedAt: iso,
    }
    await this.sessions.put(session)
    await this.settings.touchMeaningfulChange()
    return { session, exercises, skippedWithoutMaterial }
  }

  async listWeakConcepts(limit = 10): Promise<
    Array<{
      concept: ConceptRecord
      strength: number
      incorrectCount: number
    }>
  > {
    const weak = await this.mastery.listWeak(limit * 2)
    // Fallback: strength sort if boolean index empty on some browsers
    const all =
      weak.length > 0
        ? weak
        : (await this.mastery.listAll())
            .filter((m) => m.isWeak || m.strength < 0.45)
            .sort((a, b) => a.strength - b.strength)
            .slice(0, limit)

    const result: Array<{
      concept: ConceptRecord
      strength: number
      incorrectCount: number
    }> = []
    for (const row of all.slice(0, limit)) {
      const concept = await this.concepts.getById(row.conceptId)
      if (concept) {
        result.push({
          concept,
          strength: row.strength,
          incorrectCount: row.incorrectCount,
        })
      }
    }
    return result
  }
}
