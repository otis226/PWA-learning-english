import Dexie, { type EntityTable } from 'dexie'
import type {
  AppSettingsRecord,
  AttemptRecord,
  ConceptMasteryRecord,
  ConceptOccurrenceRecord,
  ConceptRecord,
  ExerciseRecord,
  LearningPackRecord,
  MetaRecord,
  MistakeSignalRecord,
  ProviderProfileRecord,
  ReviewCardRecord,
  ReviewLogRecord,
  SkillAttemptRecord,
  SourceRecord,
  StudySessionRecord,
} from './types'

/**
 * DB schema versioning convention (Dexie):
 * - Bump `version(n)` only when stores or indexes change.
 * - Keep prior version() chains for upgrade paths.
 * - Never mutate released store definitions in place; add a new version.
 * - M0 shipped version 1: providerProfiles, appSettings, meta.
 * - RC1 ships version 2: learning + review tables.
 * - Learning Studio ships version 3: durable listening/pronunciation/reading attempts.
 * - Migration test pattern: src/db/migrations/migration-chain.test.ts
 */
export const APP_DATABASE_NAME = 'pwa-learning-english'
export const APP_DATABASE_VERSION = 3

const V1_STORES = {
  providerProfiles: 'id, updatedAt, displayName',
  appSettings: 'id',
  meta: 'key',
} as const

const V2_STORES = {
  ...V1_STORES,
  sources: 'id, type, contentHash, createdAt, updatedAt',
  learningPacks: 'id, sourceId, status, learningGoal, updatedAt, createdAt',
  concepts: 'id, identityKey, kind, updatedAt',
  conceptOccurrences: 'id, conceptId, sourceId, packId, createdAt',
  exercises: 'id, packId, sourceId, type, createdAt',
  studySessions: 'id, packId, kind, status, updatedAt, startedAt',
  attempts: 'id, sessionId, exerciseId, packId, createdAt',
  mistakeSignals: 'id, conceptId, attemptId, tag, createdAt',
  conceptMastery: 'conceptId, strength, updatedAt, lastPracticedAt',
  reviewCards: 'id, conceptId, updatedAt',
  reviewLogs: 'id, reviewCardId, conceptId, createdAt',
} as const

const V3_STORES = {
  ...V2_STORES,
  skillAttempts: 'id, mode, conceptId, sourceId, packId, createdAt, score',
} as const

export class AppDatabase extends Dexie {
  providerProfiles!: EntityTable<ProviderProfileRecord, 'id'>
  appSettings!: EntityTable<AppSettingsRecord, 'id'>
  meta!: EntityTable<MetaRecord, 'key'>
  sources!: EntityTable<SourceRecord, 'id'>
  learningPacks!: EntityTable<LearningPackRecord, 'id'>
  concepts!: EntityTable<ConceptRecord, 'id'>
  conceptOccurrences!: EntityTable<ConceptOccurrenceRecord, 'id'>
  exercises!: EntityTable<ExerciseRecord, 'id'>
  studySessions!: EntityTable<StudySessionRecord, 'id'>
  attempts!: EntityTable<AttemptRecord, 'id'>
  mistakeSignals!: EntityTable<MistakeSignalRecord, 'id'>
  conceptMastery!: EntityTable<ConceptMasteryRecord, 'conceptId'>
  reviewCards!: EntityTable<ReviewCardRecord, 'id'>
  reviewLogs!: EntityTable<ReviewLogRecord, 'id'>
  skillAttempts!: EntityTable<SkillAttemptRecord, 'id'>

  constructor(name = APP_DATABASE_NAME) {
    super(name)

    this.version(1).stores({ ...V1_STORES })

    this.version(2)
      .stores({ ...V2_STORES })
      .upgrade(async (tx) => {
        await tx.table('meta').put({ key: 'migratedTo', value: '2' })
      })

    this.version(3)
      .stores({ ...V3_STORES })
      .upgrade(async (tx) => {
        await tx.table('meta').put({ key: 'migratedTo', value: '3' })
      })
  }
}

let defaultDb: AppDatabase | null = null

export function getAppDatabase(): AppDatabase {
  if (!defaultDb) {
    defaultDb = new AppDatabase()
  }
  return defaultDb
}

/** Test helper: drop singleton so each suite can open a fresh DB name. */
export function resetAppDatabaseSingleton(): void {
  defaultDb = null
}
