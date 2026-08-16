import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase } from '../../db/schema/app-database'
import { AppSettingsRepository } from '../../db/repositories/app-settings-repository'
import { ProviderProfileRepository } from '../../db/repositories/provider-profile-repository'
import { assertNoSecrets, ExportService } from './export-service'
import { EXPORT_FORMAT, EXPORT_SCHEMA_VERSION } from './export-schema'

describe('ExportService', () => {
  let db: AppDatabase
  let service: ExportService

  beforeEach(async () => {
    db = new AppDatabase(`export-test-${crypto.randomUUID()}`)
    await db.open()
    service = new ExportService(
      new ProviderProfileRepository(db),
      new AppSettingsRepository(db),
    )
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('builds a versioned envelope without secrets', async () => {
    const now = new Date().toISOString()
    await db.providerProfiles.put({
      id: 'prov_1',
      displayName: 'Local',
      baseUrl: 'https://api.example.com/v1',
      model: 'my-model',
      protocol: 'chat_completions',
      createdAt: now,
      updatedAt: now,
    })
    await db.appSettings.put({
      id: 'app',
      activeProviderProfileId: 'prov_1',
      updatedAt: now,
    })

    const envelope = await service.buildExport()
    expect(envelope.format).toBe(EXPORT_FORMAT)
    expect(envelope.schemaVersion).toBe(EXPORT_SCHEMA_VERSION)
    expect(envelope.data.providerProfiles).toHaveLength(1)
    expect(envelope.data.appSettings.activeProviderProfileId).toBe('prov_1')

    const json = JSON.stringify(envelope)
    expect(json).not.toMatch(/apiKey/i)
    expect(json).not.toMatch(/sk-/)
    expect(json).not.toMatch(/authorization/i)
    assertNoSecrets(envelope)
  })

  it('validateImport accepts a good envelope and rejects secrets', () => {
    const good = {
      format: EXPORT_FORMAT,
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        providerProfiles: [],
        appSettings: {
          activeProviderProfileId: null,
          updatedAt: new Date().toISOString(),
        },
      },
    }
    expect(service.validateImport(good).ok).toBe(true)

    const bad = {
      ...good,
      data: {
        ...good.data,
        providerProfiles: [
          {
            id: 'x',
            displayName: 'x',
            baseUrl: 'https://example.com/v1',
            model: 'm',
            protocol: 'chat_completions',
            apiKey: 'sk-should-not-be-here-1234567890',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    }
    const result = service.validateImport(bad)
    expect(result.ok).toBe(false)
  })
})
