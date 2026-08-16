import { BrowserCredentialStore } from '../ai/credentials/browser-credential-store'
import { DefaultAIGateway } from '../ai/gateway/ai-gateway'
import { AppDatabase, getAppDatabase } from '../db/schema/app-database'
import { AppSettingsRepository } from '../db/repositories/app-settings-repository'
import { ProviderProfileRepository } from '../db/repositories/provider-profile-repository'
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
import { ProviderSettingsService } from '../features/settings/provider-settings-service'
import { AnalyzeSourceService } from '../learning/analysis/analyze-source-service'
import { DashboardService } from '../learning/dashboard/dashboard-service'
import { GenerateExercisesService } from '../learning/exercises/generate-exercises-service'
import { PracticeService } from '../learning/practice/practice-service'
import { ReviewService } from '../learning/review/review-service'
import { StoragePersistenceService } from '../shared/storage/persistence'
import { ExportService } from '../sync/export/export-service'
import type { CredentialStore } from '../ai/credentials/types'
import type { AIGateway } from '../ai/gateway/types'

export type AppServices = {
  db: AppDatabase
  credentials: CredentialStore
  gateway: AIGateway
  providerSettings: ProviderSettingsService
  storagePersistence: StoragePersistenceService
  exportService: ExportService
  analyzeSource: AnalyzeSourceService
  generateExercises: GenerateExercisesService
  practice: PracticeService
  review: ReviewService
  dashboard: DashboardService
  packs: LearningPackRepository
  sources: SourceRepository
  exercises: ExerciseRepository
  concepts: ConceptRepository
  sessions: StudySessionRepository
  settings: AppSettingsRepository
}

export function createAppServices(options?: {
  db?: AppDatabase
  credentials?: CredentialStore
  fetchImpl?: typeof fetch
}): AppServices {
  const db = options?.db ?? getAppDatabase()
  const credentials = options?.credentials ?? new BrowserCredentialStore()
  const gateway = new DefaultAIGateway(
    credentials,
    options?.fetchImpl ?? fetch.bind(globalThis),
  )
  const profiles = new ProviderProfileRepository(db)
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

  const providerSettings = new ProviderSettingsService(
    profiles,
    settings,
    credentials,
    gateway,
  )

  const analyzeSource = new AnalyzeSourceService(
    sources,
    packs,
    concepts,
    occurrences,
    settings,
    providerSettings,
    gateway,
  )

  const generateExercises = new GenerateExercisesService(
    sources,
    packs,
    concepts,
    exercises,
    settings,
    providerSettings,
    gateway,
  )

  const practice = new PracticeService(
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

  const review = new ReviewService(
    reviewCards,
    concepts,
    exercises,
    mastery,
    sessions,
    settings,
  )

  const dashboard = new DashboardService(packs, sessions, attempts, review)

  return {
    db,
    credentials,
    gateway,
    providerSettings,
    storagePersistence: new StoragePersistenceService(),
    exportService: new ExportService(db, profiles, settings),
    analyzeSource,
    generateExercises,
    practice,
    review,
    dashboard,
    packs,
    sources,
    exercises,
    concepts,
    sessions,
    settings,
  }
}

export function createDefaultAppServices(): AppServices {
  return createAppServices()
}
