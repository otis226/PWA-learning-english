import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppDatabase } from '../db/schema/app-database'
import { AppSettingsRepository } from '../db/repositories/app-settings-repository'
import {
  AttemptRepository,
  ConceptMasteryRepository,
  ConceptOccurrenceRepository,
  ConceptRepository,
  ExerciseRepository,
  LearningPackRepository,
  MistakeSignalRepository,
  ReviewCardRepository,
  ReviewLogRepository,
  SourceRepository,
  StudySessionRepository,
} from '../db/repositories/learning-repositories'
import type { ProviderSettingsService } from '../features/settings/provider-settings-service'
import { MockAIGateway, mockActiveConfig } from '../test/fixtures/mock-ai-gateway'
import { AnalyzeSourceService } from './analysis/analyze-source-service'
import { GenerateExercisesService } from './exercises/generate-exercises-service'
import { PracticeService } from './practice/practice-service'
import { ReviewService } from './review/review-service'
import { ExportService } from '../sync/export/export-service'
import { ProviderProfileRepository } from '../db/repositories/provider-profile-repository'

describe('RC1 learning loop integration', () => {
  let db: AppDatabase
  let analyze: AnalyzeSourceService
  let generate: GenerateExercisesService
  let practice: PracticeService
  let review: ReviewService
  let exportService: ExportService
  let gateway: MockAIGateway

  beforeEach(async () => {
    db = new AppDatabase(`loop-${crypto.randomUUID()}`)
    await db.open()
    gateway = new MockAIGateway()
    const providerSettings = {
      getActiveConfig: vi.fn(async () => mockActiveConfig()),
    } as unknown as ProviderSettingsService
    const settings = new AppSettingsRepository(db)
    const sources = new SourceRepository(db)
    const packs = new LearningPackRepository(db)
    const concepts = new ConceptRepository(db)
    const occurrences = new ConceptOccurrenceRepository(db)
    const exercises = new ExerciseRepository(db)
    const sessions = new StudySessionRepository(db)
    const attempts = new AttemptRepository(db)
    const mastery = new ConceptMasteryRepository(db)
    const mistakes = new MistakeSignalRepository(db)
    const reviewCards = new ReviewCardRepository(db)
    const reviewLogs = new ReviewLogRepository(db)

    analyze = new AnalyzeSourceService(
      sources,
      packs,
      concepts,
      occurrences,
      settings,
      providerSettings,
      gateway,
    )
    generate = new GenerateExercisesService(
      sources,
      packs,
      concepts,
      exercises,
      settings,
      providerSettings,
      gateway,
    )
    practice = new PracticeService(
      packs,
      exercises,
      sessions,
      attempts,
      mastery,
      mistakes,
      concepts,
      sources,
      reviewCards,
      reviewLogs,
      settings,
      providerSettings,
      gateway,
    )
    review = new ReviewService(
      reviewCards,
      concepts,
      exercises,
      mastery,
      sessions,
      settings,
    )
    exportService = new ExportService(db, new ProviderProfileRepository(db), settings)
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('analyze → generate → practice wrong → mastery weak → fsrs card → export restore', async () => {
    const analyzed = await analyze.analyze({
      type: 'pasted_text',
      content:
        'Despite the heavy rain, the team continued the match. Although fans left early, players stayed.',
      learningGoal: 'mixed',
    })

    const generated = await generate.generateForPack(analyzed.pack.id)
    expect(generated.exercises.length).toBeGreaterThanOrEqual(4)
    expect(new Set(generated.exercises.map((e) => e.type)).size).toBeGreaterThan(1)
    const although = analyzed.concepts.find((c) =>
      c.canonicalLabel.toLowerCase().includes('although'),
    )
    expect(although).toBeTruthy()
    expect(generated.exercises.some((e) => e.targetConceptIds.includes(although!.id))).toBe(true)
    expect(
      generated.exercises.every((e) => e.targetConceptIds.length > 0 && e.targetConceptIds.every((id) =>
        analyzed.pack.conceptIds.includes(id),
      )),
    ).toBe(true)

    const { session, exercises } = await practice.startPracticeSession(analyzed.pack.id)
    expect(exercises.some((e) => e.type === 'multiple_choice')).toBe(true)

    // Walk the session in order; deliberately miss closed-form items to build weakness.
    let wrongSubmitted = false
    for (let i = 0; i < session.exerciseIds.length; i += 1) {
      const view = await practice.getSessionView(session.id)
      const current = view?.currentExercise
      if (!current) break

      if (current.payload.type === 'multiple_choice') {
        const wrongIndex = current.payload.correctIndex === 0 ? 1 : 0
        const result = await practice.submitAnswer({
          sessionId: session.id,
          exerciseId: current.id,
          answer: wrongIndex,
        })
        expect(result.attempt.isCorrect).toBe(false)
        wrongSubmitted = true
      } else if (current.payload.type === 'true_false') {
        const result = await practice.submitAnswer({
          sessionId: session.id,
          exerciseId: current.id,
          answer: !current.payload.correct,
        })
        expect(result.attempt.isCorrect).toBe(false)
        wrongSubmitted = true
      } else if (current.payload.type === 'cloze') {
        await practice.submitAnswer({
          sessionId: session.id,
          exerciseId: current.id,
          answer: 'totally-wrong-answer',
        })
        wrongSubmitted = true
      } else if (current.payload.type === 'flashcard') {
        await practice.submitAnswer({
          sessionId: session.id,
          exerciseId: current.id,
          answer: 'x',
          selfRating: 'again',
        })
        wrongSubmitted = true
      } else if (current.payload.type === 'short_answer') {
        await practice.submitAnswer({
          sessionId: session.id,
          exerciseId: current.id,
          answer: current.payload.acceptedAnswers[0],
        })
      }

      if (wrongSubmitted && i >= 1) break
    }
    expect(wrongSubmitted).toBe(true)

    const masteryRows = await db.conceptMastery.toArray()
    expect(masteryRows.some((m) => m.incorrectCount > 0)).toBe(true)

    const weak = await review.listWeakConcepts()
    expect(weak.length + masteryRows.filter((m) => m.isWeak || m.strength < 0.5).length).toBeGreaterThan(
      0,
    )

    const cards = await db.reviewCards.toArray()
    expect(cards.length).toBeGreaterThan(0)

    // Make card due for offline review path
    const card = cards[0]!
    await db.reviewCards.put({
      ...card,
      fsrs: { ...card.fsrs, due: new Date(0).toISOString() },
    })
    const due = await review.listDue(new Date())
    expect(due.some((d) => d.exercise)).toBe(true)

    const envelope = await exportService.buildExport()
    expect(JSON.stringify(envelope)).not.toMatch(/apiKey/i)
    expect(envelope.data.attempts.length).toBeGreaterThan(0)

    await exportService.clearAllLearningData()
    expect(await db.learningPacks.count()).toBe(0)

    const restored = await exportService.restoreReplace(envelope)
    expect(restored.ok).toBe(true)
    expect(await db.learningPacks.count()).toBeGreaterThan(0)
    expect(await db.attempts.count()).toBeGreaterThan(0)
    expect(await db.reviewCards.count()).toBeGreaterThan(0)
  })

  it('new practice after regeneration uses only current pack.exerciseIds', async () => {
    const analyzed = await analyze.analyze({
      type: 'pasted_text',
      content:
        'Despite the heavy rain, the team continued the match. Although fans left early, players stayed.',
      learningGoal: 'mixed',
    })

    const first = await generate.generateForPack(analyzed.pack.id)
    const historicalIds = first.exercises.map((e) => e.id)
    expect(historicalIds.length).toBeGreaterThan(0)

    const second = await generate.generateForPack(analyzed.pack.id)
    const currentIds = second.pack.exerciseIds
    expect(currentIds).toEqual(second.exercises.map((e) => e.id))
    expect(currentIds.some((id) => historicalIds.includes(id))).toBe(false)

    const storedHistorical = await db.exercises.bulkGet(historicalIds)
    expect(storedHistorical.every(Boolean)).toBe(true)

    const { session, exercises } = await practice.startPracticeSession(analyzed.pack.id)
    expect(session.exerciseIds).toEqual(currentIds)
    expect(exercises.map((e) => e.id)).toEqual(currentIds)
    expect(exercises.some((e) => historicalIds.includes(e.id))).toBe(false)
    expect(await db.exercises.where('packId').equals(analyzed.pack.id).count()).toBeGreaterThan(
      currentIds.length,
    )
  })

  it('rejects unresolved target concepts so mastery/FSRS never update a fallback concept', async () => {
    const analyzed = await analyze.analyze({
      type: 'pasted_text',
      content:
        'Despite the heavy rain, the team continued the match. Although fans left early, players stayed.',
      learningGoal: 'mixed',
    })
    const firstConceptId = analyzed.pack.conceptIds[0]
    expect(firstConceptId).toBeTruthy()

    gateway.complete = async (_config, request) => {
      const blob = request.messages.map((m) => m.content).join('\n').toLowerCase()
      if (blob.includes('exercise-plan.v1') || blob.includes('plan english practice')) {
        return {
          content: JSON.stringify({
            schemaVersion: 'exercise-plan.v1',
            items: [
              {
                conceptLabel: 'unrelated fallback bait',
                exerciseType: 'flashcard',
                skill: 'grammar',
              },
            ],
          }),
          raw: {},
        }
      }
      return {
        content: JSON.stringify({
          schemaVersion: 'exercises.v1',
          exercises: [
            {
              type: 'flashcard',
              skill: 'grammar',
              targetConceptLabels: ['unrelated fallback bait'],
              prompt: 'unrelated',
              payload: { type: 'flashcard', front: 'x', back: 'y' },
              explanation: 'Would have updated the first pack concept if fallback existed.',
            },
          ],
        }),
        raw: {},
      }
    }

    await expect(generate.generateForPack(analyzed.pack.id)).rejects.toMatchObject({
      code: 'no_valid_exercises',
    })

    const pack = await db.learningPacks.get(analyzed.pack.id)
    expect(pack?.exerciseIds).toEqual([])
    expect(await db.exercises.count()).toBe(0)
    expect(await db.conceptMastery.get(firstConceptId!)).toBeUndefined()
    expect(await db.reviewCards.where('conceptId').equals(firstConceptId!).count()).toBe(0)
  })
})
