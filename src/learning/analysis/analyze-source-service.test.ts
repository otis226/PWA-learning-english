import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppDatabase } from '../../db/schema/app-database'
import { AppSettingsRepository } from '../../db/repositories/app-settings-repository'
import {
  ConceptOccurrenceRepository,
  ConceptRepository,
  LearningPackRepository,
  SourceRepository,
} from '../../db/repositories/learning-repositories'
import { MockAIGateway, mockActiveConfig } from '../../test/fixtures/mock-ai-gateway'
import { AnalyzeSourceService } from './analyze-source-service'
import type { ProviderSettingsService } from '../../features/settings/provider-settings-service'

describe('AnalyzeSourceService', () => {
  let db: AppDatabase
  let service: AnalyzeSourceService
  let gateway: MockAIGateway

  beforeEach(async () => {
    db = new AppDatabase(`analyze-${crypto.randomUUID()}`)
    await db.open()
    gateway = new MockAIGateway()
    const providerSettings = {
      getActiveConfig: vi.fn(async () => mockActiveConfig()),
    } as unknown as ProviderSettingsService

    service = new AnalyzeSourceService(
      new SourceRepository(db),
      new LearningPackRepository(db),
      new ConceptRepository(db),
      new ConceptOccurrenceRepository(db),
      new AppSettingsRepository(db),
      providerSettings,
      gateway,
    )
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('persists source, pack, concepts and survives reload', async () => {
    const result = await service.analyze({
      type: 'pasted_text',
      content:
        'Despite the heavy rain, the team continued the match. Although it rained, fans stayed.',
      learningGoal: 'grammar',
    })

    expect(result.pack.conceptIds.length).toBeGreaterThan(0)
    expect(result.concepts[0]?.identityKey).toContain('grammar|')
    expect(result.pack.provenance.schemaVersion).toBe('analysis.v1')

    const reloaded = await service.getPackDetail(result.pack.id)
    expect(reloaded?.pack.title).toBe(result.pack.title)
    expect(reloaded?.source.contentHash).toBe(result.source.contentHash)
    expect(reloaded?.concepts).toHaveLength(result.concepts.length)
  })

  it('does not persist when AI output is invalid', async () => {
    gateway.complete = async () => ({
      content: 'not-json',
      raw: {},
    })

    await expect(
      service.analyze({
        type: 'vocabulary_list',
        content: 'despite\nalthough',
        learningGoal: 'vocabulary',
      }),
    ).rejects.toBeTruthy()

    expect(await db.sources.count()).toBe(0)
    expect(await db.learningPacks.count()).toBe(0)
  })

  it('allows removing concepts before exercises', async () => {
    const result = await service.analyze({
      type: 'custom_topic',
      content: 'I want to practice despite vs although',
      learningGoal: 'mixed',
    })
    const removeId = result.pack.conceptIds[0]!
    const updated = await service.removeConceptFromPack(result.pack.id, removeId)
    expect(updated.conceptIds).not.toContain(removeId)
  })
})
