import type {
  AttemptRecord,
  LearningPackRecord,
  StudySessionRecord,
} from '../../db/schema/types'
import {
  AttemptRepository,
  LearningPackRepository,
  StudySessionRepository,
} from '../../db/repositories/learning-repositories'
import type { ReviewService } from '../review/review-service'

export type DashboardSnapshot = {
  dueCount: number
  recentPacks: LearningPackRecord[]
  weakConcepts: Array<{
    id: string
    label: string
    kind: string
    strength: number
    incorrectCount: number
  }>
  recentActivity: Array<{
    id: string
    kind: 'session' | 'attempt'
    label: string
    at: string
  }>
  recentSessions: StudySessionRecord[]
}

export class DashboardService {
  constructor(
    private readonly packs: LearningPackRepository,
    private readonly sessions: StudySessionRepository,
    private readonly attempts: AttemptRepository,
    private readonly review: ReviewService,
  ) {}

  async getSnapshot(): Promise<DashboardSnapshot> {
    const [dueCount, recentPacks, weak, recentSessions, recentAttempts] =
      await Promise.all([
        this.review.countDue(),
        this.packs.listRecent(5),
        this.review.listWeakConcepts(8),
        this.sessions.listRecent(8),
        this.attempts.listRecent(12),
      ])

    const recentActivity = buildActivity(recentSessions, recentAttempts)

    return {
      dueCount,
      recentPacks,
      weakConcepts: weak.map((w) => ({
        id: w.concept.id,
        label: w.concept.canonicalLabel,
        kind: w.concept.kind,
        strength: w.strength,
        incorrectCount: w.incorrectCount,
      })),
      recentActivity,
      recentSessions,
    }
  }
}

function buildActivity(
  sessions: StudySessionRecord[],
  attempts: AttemptRecord[],
): DashboardSnapshot['recentActivity'] {
  const items: DashboardSnapshot['recentActivity'] = []
  for (const session of sessions) {
    items.push({
      id: session.id,
      kind: 'session',
      label: `${session.kind} session · ${session.status} · ${session.correctCount} correct`,
      at: session.updatedAt,
    })
  }
  for (const attempt of attempts.slice(0, 6)) {
    items.push({
      id: attempt.id,
      kind: 'attempt',
      label:
        attempt.isCorrect === true
          ? 'Correct attempt'
          : attempt.isCorrect === false
            ? 'Incorrect attempt'
            : 'Attempt recorded',
      at: attempt.createdAt,
    })
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12)
}
