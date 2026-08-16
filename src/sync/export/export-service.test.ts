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
      db,
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
    await db.sources.put({
      id: 'src_1',
      type: 'pasted_text',
      title: 'T',
      rawContent: 'hello',
      normalizedContent: 'hello',
      contentHash: 'abc',
      charCount: 5,
      createdAt: now,
      updatedAt: now,
    })

    const envelope = await service.buildExport()
    expect(envelope.format).toBe(EXPORT_FORMAT)
    expect(envelope.schemaVersion).toBe(EXPORT_SCHEMA_VERSION)
    expect(envelope.data.providerProfiles).toHaveLength(1)
    expect(envelope.data.sources).toHaveLength(1)
    expect(envelope.data.appSettings.activeProviderProfileId).toBe('prov_1')

    const json = JSON.stringify(envelope)
    expect(json).not.toMatch(/apiKey/i)
    expect(json).not.toMatch(/sk-/)
    expect(json).not.toMatch(/authorization/i)
    assertNoSecrets(envelope)
  })

  it('validateImport accepts good envelopes and rejects secrets', () => {
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
        sources: [],
        learningPacks: [],
        concepts: [],
        conceptOccurrences: [],
        exercises: [],
        studySessions: [],
        attempts: [],
        mistakeSignals: [],
        conceptMastery: [],
        reviewCards: [],
        reviewLogs: [],
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

  it('replace restore round-trips learning rows', async () => {
    const now = new Date().toISOString()
    await db.learningPacks.put({
      id: 'pack_1',
      sourceId: 'src_1',
      title: 'Pack',
      learningGoal: 'mixed',
      status: 'ready',
      learningObjectives: [],
      skills: [],
      conceptIds: [],
      exerciseIds: [],
      suggestedProgression: [],
      provenance: {
        providerProfileId: 'p',
        model: 'm',
        promptVersion: 'v',
        schemaVersion: 'v',
        sourceContentHash: 'h',
        generatedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    })
    const envelope = await service.buildExport()
    await service.clearAllLearningData()
    expect(await db.learningPacks.count()).toBe(0)
    const restored = await service.restoreReplace(envelope)
    expect(restored.ok).toBe(true)
    expect(await db.learningPacks.get('pack_1')).toBeTruthy()
  })
})
