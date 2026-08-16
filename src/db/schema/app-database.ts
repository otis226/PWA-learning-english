import Dexie, { type EntityTable } from 'dexie'
import type { AppSettingsRecord, MetaRecord, ProviderProfileRecord } from './types'

/**
 * DB schema versioning convention (Dexie):
 * - Bump `version(n)` only when stores or indexes change.
 * - Keep prior version() chains for upgrade paths.
 * - Never mutate released store definitions in place; add a new version.
 * - M0 uses version 1 only: providerProfiles, appSettings, meta.
 * - Migration test pattern: src/db/migrations/migration-chain.test.ts
 *   (fake-indexeddb + open prior schema → seed → open next schema).
 */
export const APP_DATABASE_NAME = 'pwa-learning-english'
export const APP_DATABASE_VERSION = 1

export class AppDatabase extends Dexie {
  providerProfiles!: EntityTable<ProviderProfileRecord, 'id'>
  appSettings!: EntityTable<AppSettingsRecord, 'id'>
  meta!: EntityTable<MetaRecord, 'key'>

  constructor(name = APP_DATABASE_NAME) {
    super(name)
    this.version(APP_DATABASE_VERSION).stores({
      providerProfiles: 'id, updatedAt, displayName',
      appSettings: 'id',
      meta: 'key',
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
