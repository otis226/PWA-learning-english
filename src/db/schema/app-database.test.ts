import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase, APP_DATABASE_VERSION } from './app-database'
import { ProviderProfileRepository } from '../repositories/provider-profile-repository'
import { AppSettingsRepository } from '../repositories/app-settings-repository'

describe('AppDatabase v1', () => {
  let db: AppDatabase

  beforeEach(async () => {
    db = new AppDatabase(`db-test-${crypto.randomUUID()}`)
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('opens at version 1 with required stores', async () => {
    expect(db.verno).toBe(APP_DATABASE_VERSION)
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      ['appSettings', 'meta', 'providerProfiles'].sort(),
    )
  })

  it('supports provider profile and settings repositories', async () => {
    const profiles = new ProviderProfileRepository(db)
    const settings = new AppSettingsRepository(db)
    const now = new Date().toISOString()

    await profiles.upsert({
      id: 'p1',
      displayName: 'Test',
      baseUrl: 'https://example.com/v1',
      model: 'free-text-model',
      protocol: 'chat_completions',
      createdAt: now,
      updatedAt: now,
    })

    await settings.setActiveProviderProfileId('p1')

    expect(await profiles.getById('p1')).toMatchObject({
      model: 'free-text-model',
      displayName: 'Test',
    })
    expect((await settings.get()).activeProviderProfileId).toBe('p1')

    const stored = await profiles.getById('p1')
    expect(stored && 'apiKey' in stored).toBe(false)
  })
})
