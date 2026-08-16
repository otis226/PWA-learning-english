import Dexie, { type EntityTable } from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { DB_MIGRATION_CONVENTIONS } from './conventions'

/**
 * Migration test pattern (fake-indexeddb + Dexie version chain).
 *
 * How M1+ should extend this:
 * 1. Keep historical `version(n).stores(...)` definitions forever once shipped.
 * 2. Open the prior schema class, seed representative rows, close.
 * 3. Open the next schema class on the **same DB name**.
 * 4. Assert upgraded `verno`, store list, and preserved row data.
 *
 * This file uses a local throwaway Dexie subclass so production `AppDatabase`
 * stays at M0 v1 only — do not add M1 domain tables here.
 */
type V1Profile = {
  id: string
  displayName: string
  baseUrl: string
  model: string
}

type V1Settings = {
  id: 'app'
  activeProviderProfileId: string | null
}

/** Mirrors shipped AppDatabase v1 stores for chain tests. */
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

/**
 * Illustrative v2 used only in tests: adds an index, not M1 learning tables.
 * Production code must not import this class.
 */
class SchemaV2ForPattern extends Dexie {
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
    this.version(2)
      .stores({
        providerProfiles: 'id, updatedAt, displayName, model',
        appSettings: 'id',
        meta: 'key',
      })
      .upgrade(async (tx) => {
        // Example upgrade hook: touch meta so tests can assert upgrade ran.
        await tx
          .table('meta')
          .put({ key: 'migratedTo', value: '2' })
      })
  }
}

describe('Dexie migration chain pattern', () => {
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

  it('upgrades seeded v1 data through a v2 version chain without data loss', async () => {
    const name = `migration-chain-${crypto.randomUUID()}`

    const v1 = new SchemaV1(name)
    openDbs.push(v1)
    await v1.open()
    expect(v1.verno).toBe(1)

    await v1.providerProfiles.put({
      id: 'p1',
      displayName: 'Seeded',
      baseUrl: 'https://api.example.com/v1',
      model: 'free-text-model',
    })
    await v1.appSettings.put({
      id: 'app',
      activeProviderProfileId: 'p1',
    })
    await v1.meta.put({ key: 'schemaNote', value: 'from-v1' })
    v1.close()

    const v2 = new SchemaV2ForPattern(name)
    openDbs.push(v2)
    await v2.open()

    expect(v2.verno).toBe(2)
    expect(v2.tables.map((t) => t.name).sort()).toEqual(
      ['appSettings', 'meta', 'providerProfiles'].sort(),
    )

    const profile = await v2.providerProfiles.get('p1')
    expect(profile).toEqual({
      id: 'p1',
      displayName: 'Seeded',
      baseUrl: 'https://api.example.com/v1',
      model: 'free-text-model',
    })
    expect((await v2.appSettings.get('app'))?.activeProviderProfileId).toBe('p1')
    expect(await v2.meta.get('schemaNote')).toEqual({
      key: 'schemaNote',
      value: 'from-v1',
    })
    expect(await v2.meta.get('migratedTo')).toEqual({
      key: 'migratedTo',
      value: '2',
    })
  })
})
