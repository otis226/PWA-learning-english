import {
  learnerExplanationV1JsonSchema,
  learnerExplanationV1Schema,
  shortAnswerGradeV1JsonSchema,
  shortAnswerGradeV1Schema,
} from '../../ai/schemas/exercises-v1'
import { runStructuredOutput } from '../../ai/gateway/structured-output'
import type { AIGateway } from '../../ai/gateway/types'
import type { ProviderSettingsService } from '../../features/settings/provider-settings-service'
import type {
  AttemptRecord,
  ExerciseRecord,
  StudySessionRecord,
} from '../../db/schema/types'
import {
  AttemptRepository,
  ConceptMasteryRepository,
  ConceptRepository,
  ExerciseRepository,
  LearningPackRepository,
  MistakeSignalRepository,
  ReviewCardRepository,
  ReviewLogRepository,
  SourceRepository,
  StudySessionRepository,
} from '../../db/repositories/learning-repositories'
import type { AppSettingsRepository } from '../../db/repositories/app-settings-repository'
import { createId } from '../../shared/ids'
import { AppError } from '../../shared/errors'
import { applyAttemptToMastery } from '../mastery/update-mastery'
import {
  createNewReviewCard,
  mapResultToFsrsRating,
  scheduleReview,
  type FsrsRatingLabel,
} from '../review/fsrs-scheduler'
import { scoreAnswer } from './score-answer'

export type SubmitAnswerInput = {
  sessionId: string
  exerciseId: string
  answer: unknown
  selfRating?: FsrsRatingLabel
  responseTimeMs?: number
  signal?: AbortSignal
  /** Request lazy learner-specific explanation when wrong. */
  requestLearnerExplanation?: boolean
}

export type SubmitAnswerResult = {
  attempt: AttemptRecord
  session: StudySessionRecord
  exercise: ExerciseRecord
  explanation: string
  scoredLocally: boolean
}

export class PracticeService {
  constructor(
    private readonly packs: LearningPackRepository,
    private readonly exercises: ExerciseRepository,
    private readonly sessions: StudySessionRepository,
    private readonly attempts: AttemptRepository,
    private readonly mastery: ConceptMasteryRepository,
    private readonly mistakes: MistakeSignalRepository,
    private readonly concepts: ConceptRepository,
    private readonly sources: SourceRepository,
    private readonly reviewCards: ReviewCardRepository,
    private readonly reviewLogs: ReviewLogRepository,
    private readonly settings: AppSettingsRepository,
    private readonly providerSettings: ProviderSettingsService,
    private readonly gateway: AIGateway,
  ) {}

  async startPracticeSession(packId: string): Promise<{
    session: StudySessionRecord
    exercises: ExerciseRecord[]
  }> {
    const pack = await this.packs.getById(packId)
    if (!pack) {
      throw new AppError('pack_not_found', 'Learning pack not found.')
    }
    // pack.exerciseIds is the current generation; historical rows stay in IDB.
    const exercises = await this.exercises.getMany(pack.exerciseIds)
    if (exercises.length === 0) {
      throw new AppError('no_exercises', 'Generate exercises before practicing.')
    }
    const now = new Date().toISOString()
    const session: StudySessionRecord = {
      id: createId('session'),
      packId,
      kind: 'practice',
      status: 'in_progress',
      exerciseIds: exercises.map((e) => e.id),
      currentIndex: 0,
      correctCount: 0,
      incorrectCount: 0,
      startedAt: now,
      completedAt: null,
      updatedAt: now,
    }
    await this.sessions.put(session)
    await this.settings.touchMeaningfulChange()
    return { session, exercises }
  }

  async getSessionView(sessionId: string): Promise<{
    session: StudySessionRecord
    exercises: ExerciseRecord[]
    attempts: AttemptRecord[]
    currentExercise: ExerciseRecord | null
  } | null> {
    const session = await this.sessions.getById(sessionId)
    if (!session) return null
    const exercises = await this.exercises.getMany(session.exerciseIds)
    const attempts = await this.attempts.listBySession(sessionId)
    const currentExercise =
      session.status === 'completed'
        ? null
        : (exercises.find((e) => e.id === session.exerciseIds[session.currentIndex]) ?? null)
    return { session, exercises, attempts, currentExercise }
  }

  async submitAnswer(input: SubmitAnswerInput): Promise<SubmitAnswerResult> {
    const session = await this.sessions.getById(input.sessionId)
    if (!session) {
      throw new AppError('session_not_found', 'Study session not found.')
    }
    if (session.status !== 'in_progress') {
      throw new AppError('session_closed', 'This session is already finished.')
    }
    const exercise = await this.exercises.getById(input.exerciseId)
    if (!exercise) {
      throw new AppError('exercise_not_found', 'Exercise not found.')
    }
    if (session.exerciseIds[session.currentIndex] !== exercise.id) {
      throw new AppError('exercise_out_of_order', 'Answer the current exercise first.')
    }

    let score = scoreAnswer({
      exercise,
      answer: input.answer,
      selfRating: input.selfRating,
    })

    let explanation = exercise.explanation
    let gradingMode: AttemptRecord['gradingMode'] = score.gradingMode
    let misconceptionTags: string[] = []

    if (score.needsAiGrade) {
      const aiGrade = await this.gradeShortAnswerWithAi({
        exercise,
        answer: String(input.answer ?? ''),
        signal: input.signal,
      })
      if (aiGrade) {
        score = {
          isCorrect: aiGrade.isCorrect,
          score: aiGrade.score,
          gradingMode: aiGrade.confidence === 'low' ? 'uncertain' : 'deterministic',
          needsAiGrade: false,
        }
        gradingMode = aiGrade.confidence === 'low' ? 'uncertain' : 'ai'
        explanation = aiGrade.explanation || explanation
        misconceptionTags = aiGrade.misconceptionTags
      }
    }

    if (
      input.requestLearnerExplanation &&
      score.isCorrect === false &&
      exercise.evidenceText
    ) {
      const lazy = await this.maybeLearnerExplanation({
        exercise,
        answer: input.answer,
        signal: input.signal,
      })
      if (lazy) {
        explanation = lazy.explanation
        misconceptionTags = [...new Set([...misconceptionTags, ...lazy.misconceptionTags])]
      }
    }

    const now = new Date().toISOString()
    const attempt: AttemptRecord = {
      id: createId('attempt'),
      sessionId: session.id,
      exerciseId: exercise.id,
      packId: session.packId,
      conceptIds: exercise.targetConceptIds,
      answer: input.answer,
      isCorrect: score.isCorrect,
      score: score.score,
      selfRating: input.selfRating ?? null,
      gradingMode,
      explanationShown: explanation,
      misconceptionTags,
      responseTimeMs: input.responseTimeMs ?? null,
      createdAt: now,
    }

    await this.attempts.put(attempt)

    // Mastery + mistakes + FSRS
    for (const conceptId of exercise.targetConceptIds) {
      const current = await this.mastery.get(conceptId)
      const next = applyAttemptToMastery(current, {
        conceptId,
        isCorrect: score.isCorrect,
        now,
      })
      await this.mastery.put(next)

      if (score.isCorrect === false) {
        const tags =
          misconceptionTags.length > 0 ? misconceptionTags : ['incorrect_answer']
        await this.mistakes.putMany(
          tags.map((tag) => ({
            id: createId('mistake'),
            conceptId,
            attemptId: attempt.id,
            tag,
            detail: typeof input.answer === 'string' ? input.answer : null,
            createdAt: now,
          })),
        )
      }

      await this.applyFsrsForConcept({
        conceptId,
        exerciseId: exercise.id,
        isCorrect: score.isCorrect,
        selfRating: input.selfRating,
        attemptId: attempt.id,
        now,
      })
    }

    const nextIndex = session.currentIndex + 1
    const completed = nextIndex >= session.exerciseIds.length
    const updatedSession: StudySessionRecord = {
      ...session,
      currentIndex: completed ? session.currentIndex : nextIndex,
      correctCount: session.correctCount + (score.isCorrect === true ? 1 : 0),
      incorrectCount: session.incorrectCount + (score.isCorrect === false ? 1 : 0),
      status: completed ? 'completed' : 'in_progress',
      completedAt: completed ? now : null,
      updatedAt: now,
    }
    await this.sessions.put(updatedSession)
    await this.settings.touchMeaningfulChange()

    return {
      attempt,
      session: updatedSession,
      exercise,
      explanation,
      scoredLocally: gradingMode === 'deterministic' || gradingMode === 'self',
    }
  }

  private async applyFsrsForConcept(input: {
    conceptId: string
    exerciseId: string
    isCorrect: boolean | null
    selfRating?: FsrsRatingLabel
    attemptId: string
    now: string
  }): Promise<void> {
    const grade = mapResultToFsrsRating({
      isCorrect: input.isCorrect,
      selfRating: input.selfRating,
    })
    if (grade === null) {
      return
    }

    let card = await this.reviewCards.getByConceptId(input.conceptId)
    if (!card) {
      card = createNewReviewCard({
        conceptId: input.conceptId,
        preferredExerciseId: input.exerciseId,
        now: new Date(input.now),
      })
    } else if (!card.preferredExerciseId) {
      card = { ...card, preferredExerciseId: input.exerciseId }
    }

    const scheduled = scheduleReview(card, grade, new Date(input.now))
    await this.reviewCards.put(scheduled.nextCard)
    await this.reviewLogs.put({
      id: createId('rlog'),
      reviewCardId: scheduled.nextCard.id,
      conceptId: input.conceptId,
      rating: scheduled.log.rating,
      stateBefore: scheduled.log.stateBefore,
      stateAfter: scheduled.log.stateAfter,
      dueBefore: scheduled.log.dueBefore,
      dueAfter: scheduled.log.dueAfter,
      scheduledDays: scheduled.log.scheduledDays,
      attemptId: input.attemptId,
      createdAt: input.now,
    })
  }

  private async gradeShortAnswerWithAi(input: {
    exercise: ExerciseRecord
    answer: string
    signal?: AbortSignal
  }): Promise<{
    isCorrect: boolean | null
    score: number | null
    confidence: 'high' | 'medium' | 'low'
    explanation: string
    misconceptionTags: string[]
  } | null> {
    const config = await this.providerSettings.getActiveConfig()
    if (!config?.hasCredential) {
      return null
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return null
    }

    const payload = input.exercise.payload
    if (payload.type !== 'short_answer') return null

    const result = await runStructuredOutput(
      (request) =>
        this.gateway.complete(
          config,
          {
            messages: request.messages,
            response_format: request.response_format,
            ...(request.temperature !== undefined
              ? { temperature: request.temperature }
              : {}),
          },
          input.signal,
        ),
      {
        schema: shortAnswerGradeV1Schema,
        schemaName: 'short_answer_grade_v1',
        jsonSchema: shortAnswerGradeV1JsonSchema,
        messages: [
          {
            role: 'system',
            content:
              'Grade a short English answer. Return JSON only. schemaVersion must be "short-answer-grade.v1". If uncertain, set confidence low and isCorrect null.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              prompt: payload.prompt,
              acceptedAnswers: payload.acceptedAnswers,
              learnerAnswer: input.answer,
              exerciseExplanation: input.exercise.explanation,
              evidenceText: input.exercise.evidenceText,
            }),
          },
        ],
        capabilities: config.capabilities,
        maxRepairAttempts: 0,
      },
    )

    if (!result.ok) return null
    return {
      isCorrect: result.data.isCorrect,
      score: result.data.score,
      confidence: result.data.confidence,
      explanation: result.data.explanation,
      misconceptionTags: result.data.misconceptionTags,
    }
  }

  private async maybeLearnerExplanation(input: {
    exercise: ExerciseRecord
    answer: unknown
    signal?: AbortSignal
  }): Promise<{ explanation: string; misconceptionTags: string[] } | null> {
    const config = await this.providerSettings.getActiveConfig()
    if (!config?.hasCredential) return null
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return null

    const source = await this.sources.getById(input.exercise.sourceId)
    const concepts = await this.concepts.getMany(input.exercise.targetConceptIds)

    const result = await runStructuredOutput(
      (request) =>
        this.gateway.complete(
          config,
          {
            messages: request.messages,
            response_format: request.response_format,
            ...(request.temperature !== undefined
              ? { temperature: request.temperature }
              : {}),
          },
          input.signal,
        ),
      {
        schema: learnerExplanationV1Schema,
        schemaName: 'learner_explanation_v1',
        jsonSchema: learnerExplanationV1JsonSchema,
        messages: [
          {
            role: 'system',
            content:
              'Explain the mistake for an English learner. Ground in source evidence when provided. JSON only. schemaVersion "learner-explanation.v1".',
          },
          {
            role: 'user',
            content: JSON.stringify({
              prompt: input.exercise.prompt,
              learnerAnswer: input.answer,
              correctExplanation: input.exercise.explanation,
              evidenceText: input.exercise.evidenceText,
              concepts: concepts.map((c) => c.canonicalLabel),
              sourceExcerpt: source?.normalizedContent.slice(0, 2000) ?? null,
            }),
          },
        ],
        capabilities: config.capabilities,
        maxRepairAttempts: 0,
      },
    )
    if (!result.ok) return null
    return {
      explanation: result.data.explanation,
      misconceptionTags: result.data.misconceptionTags,
    }
  }
}
