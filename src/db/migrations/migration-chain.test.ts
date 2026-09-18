import Dexie, { type EntityTable } from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { DB_MIGRATION_CONVENTIONS } from './conventions'
import { AppDatabase } from '../schema/app-database'

type V1Profile = {
  id: string
  displayName: string
  baseUrl: string
  model: string
  protocol: 'chat_completions'
  createdAt: string
  updatedAt: string
}

type V1Settings = {
  id: 'app'
  activeProviderProfileId: string | null
  updatedAt: string
}

/** Mirrors shipped AppDatabase v1 stores. */
class SchemaV1 extends Dexie {
  providerProfiles!: EntityTable<V1Profile, 'id'>
  appSettings!: EntityTable<V1Settings, 'id'>
  meta!: EntityTable<{ key: string; value: string }, 'key'>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      providerProfiles: 'id, updatedAt, displayName',
      appSettings: 'id',
      meta: 'key',
    })
  }
}

describe('Dexie migration chain', () => {
  const openDbs: Dexie[] = []

  afterEach(async () => {
    for (const db of openDbs.splice(0)) {
      db.close()
      await db.delete()
    }
  })

  it('documents initial version convention', () => {
    expect(DB_MIGRATION_CONVENTIONS.initialVersion).toBe(1)
  })

  it('upgrades seeded v1 data through production AppDatabase v3 without data loss', async () => {
    const name = `migration-chain-${crypto.randomUUID()}`
    const now = new Date().toISOString()

    const v1 = new SchemaV1(name)
    openDbs.push(v1)
    await v1.open()
    expect(v1.verno).toBe(1)

    await v1.providerProfiles.put({
      id: 'p1',
      displayName: 'Seeded',
      baseUrl: 'https://api.example.com/v1',
      model: 'free-text-model',
      protocol: 'chat_completions',
      createdAt: now,
      updatedAt: now,
    })
    await v1.appSettings.put({
      id: 'app',
      activeProviderProfileId: 'p1',
      updatedAt: now,
    })
    await v1.meta.put({ key: 'schemaNote', value: 'from-v1' })
    v1.close()

    const v3 = new AppDatabase(name)
    openDbs.push(v3)
    await v3.open()

    expect(v3.verno).toBe(3)
    expect(v3.tables.map((t) => t.name)).toContain('sources')
    expect(v3.tables.map((t) => t.name)).toContain('reviewCards')
    expect(v3.tables.map((t) => t.name)).toContain('skillAttempts')

    const profile = await v3.providerProfiles.get('p1')
    expect(profile?.displayName).toBe('Seeded')
    expect((await v3.appSettings.get('app'))?.activeProviderProfileId).toBe('p1')
    expect(await v3.meta.get('schemaNote')).toEqual({
      key: 'schemaNote',
      value: 'from-v1',
    })
    expect(await v3.meta.get('migratedTo')).toEqual({
      key: 'migratedTo',
      value: '3',
    })
  })
})
