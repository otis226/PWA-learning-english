import { safeParseWithSchema } from '../../ai/schemas/parse'
import type { AppDatabase } from '../../db/schema/app-database'
import type { AppSettingsRepository } from '../../db/repositories/app-settings-repository'
import type { ProviderProfileRepository } from '../../db/repositories/provider-profile-repository'
import {
  EXPORT_FORMAT,
  EXPORT_SCHEMA_VERSION,
  exportEnvelopeSchema,
  type ExportEnvelope,
  type ImportValidationResult,
} from './export-schema'

const SECRET_KEY_PATTERN =
  /^(api[_-]?key|authorization|secret|token|password|credential)$/i

export class ExportService {
  constructor(
    private readonly db: AppDatabase,
    private readonly profiles: ProviderProfileRepository,
    private readonly settings: AppSettingsRepository,
  ) {}

  async buildExport(): Promise<ExportEnvelope> {
    const [
      providerProfiles,
      appSettings,
      sources,
      learningPacks,
      concepts,
      conceptOccurrences,
      exercises,
      studySessions,
      attempts,
      mistakeSignals,
      conceptMastery,
      reviewCards,
      reviewLogs,
    ] = await Promise.all([
      this.profiles.list(),
      this.settings.get(),
      this.db.sources.toArray(),
      this.db.learningPacks.toArray(),
      this.db.concepts.toArray(),
      this.db.conceptOccurrences.toArray(),
      this.db.exercises.toArray(),
      this.db.studySessions.toArray(),
      this.db.attempts.toArray(),
      this.db.mistakeSignals.toArray(),
      this.db.conceptMastery.toArray(),
      this.db.reviewCards.toArray(),
      this.db.reviewLogs.toArray(),
    ])

    const envelope: ExportEnvelope = {
      format: EXPORT_FORMAT,
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        providerProfiles: providerProfiles.map((profile) => ({
          id: profile.id,
          displayName: profile.displayName,
          baseUrl: profile.baseUrl,
          model: profile.model,
          protocol: profile.protocol,
          capabilityOverrides: profile.capabilityOverrides,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        })),
        appSettings: {
          activeProviderProfileId: appSettings.activeProviderProfileId,
          updatedAt: appSettings.updatedAt,
          lastMeaningfulChangeAt: appSettings.lastMeaningfulChangeAt ?? null,
          lastExportAt: appSettings.lastExportAt ?? null,
        },
        sources,
        learningPacks,
        concepts,
        conceptOccurrences,
        exercises,
        studySessions,
        attempts,
        mistakeSignals,
        conceptMastery,
        reviewCards,
        reviewLogs,
      },
    }

    assertNoSecrets(envelope)
    const validated = safeParseWithSchema(exportEnvelopeSchema, envelope, 'export_invalid')
    if (!validated.success) {
      throw validated.error
    }
    await this.settings.markExported()
    return validated.data
  }

  async exportJsonString(pretty = true): Promise<string> {
    const envelope = await this.buildExport()
    return pretty ? JSON.stringify(envelope, null, 2) : JSON.stringify(envelope)
  }

  validateImport(raw: unknown): ImportValidationResult {
    try {
      assertNoSecrets(raw)
    } catch (error) {
      return {
        ok: false,
        issues: [error instanceof Error ? error.message : 'Import contains secrets'],
      }
    }

    const migrated = migrateImportPayload(raw)
    const parsed = safeParseWithSchema(exportEnvelopeSchema, migrated, 'import_invalid')
    if (!parsed.success) {
      return { ok: false, issues: parsed.issues }
    }
    return {
      ok: true,
      envelope: parsed.data,
      summary: {
        providerProfileCount: parsed.data.data.providerProfiles.length,
        sourceCount: parsed.data.data.sources.length,
        packCount: parsed.data.data.learningPacks.length,
        exerciseCount: parsed.data.data.exercises.length,
        attemptCount: parsed.data.data.attempts.length,
        reviewCardCount: parsed.data.data.reviewCards.length,
        activeProviderProfileId: parsed.data.data.appSettings.activeProviderProfileId,
      },
    }
  }

  /**
   * Replace-all restore: clears learning + profile tables then writes import.
   * Credentials are never imported.
   */
  async restoreReplace(raw: unknown): Promise<ImportValidationResult> {
    const validation = this.validateImport(raw)
    if (!validation.ok) {
      return validation
    }
    const { data } = validation.envelope

    await this.db.transaction(
      'rw',
      [
        this.db.providerProfiles,
        this.db.appSettings,
        this.db.sources,
        this.db.learningPacks,
        this.db.concepts,
        this.db.conceptOccurrences,
        this.db.exercises,
        this.db.studySessions,
        this.db.attempts,
        this.db.mistakeSignals,
        this.db.conceptMastery,
        this.db.reviewCards,
        this.db.reviewLogs,
      ],
      async () => {
        await Promise.all([
          this.db.providerProfiles.clear(),
          this.db.sources.clear(),
          this.db.learningPacks.clear(),
          this.db.concepts.clear(),
          this.db.conceptOccurrences.clear(),
          this.db.exercises.clear(),
          this.db.studySessions.clear(),
          this.db.attempts.clear(),
          this.db.mistakeSignals.clear(),
          this.db.conceptMastery.clear(),
          this.db.reviewCards.clear(),
          this.db.reviewLogs.clear(),
        ])

        await this.db.providerProfiles.bulkPut(data.providerProfiles)
        await this.db.appSettings.put({
          id: 'app',
          activeProviderProfileId: data.appSettings.activeProviderProfileId,
          updatedAt: data.appSettings.updatedAt,
          lastMeaningfulChangeAt: data.appSettings.lastMeaningfulChangeAt ?? null,
          lastExportAt: data.appSettings.lastExportAt ?? null,
        })
        await this.db.sources.bulkPut(data.sources)
        await this.db.learningPacks.bulkPut(data.learningPacks)
        await this.db.concepts.bulkPut(data.concepts)
        await this.db.conceptOccurrences.bulkPut(data.conceptOccurrences)
        await this.db.exercises.bulkPut(data.exercises as never)
        await this.db.studySessions.bulkPut(data.studySessions)
        await this.db.attempts.bulkPut(
          data.attempts.map((row) => ({
            ...row,
            answer: row.answer ?? null,
            selfRating: row.selfRating ?? null,
            explanationShown: row.explanationShown ?? null,
            responseTimeMs: row.responseTimeMs ?? null,
          })) as never,
        )
        await this.db.mistakeSignals.bulkPut(data.mistakeSignals)
        await this.db.conceptMastery.bulkPut(data.conceptMastery)
        await this.db.reviewCards.bulkPut(data.reviewCards)
        await this.db.reviewLogs.bulkPut(data.reviewLogs)
      },
    )

    return validation
  }

  async clearAllLearningData(): Promise<void> {
    await this.db.transaction(
      'rw',
      [
        this.db.sources,
        this.db.learningPacks,
        this.db.concepts,
        this.db.conceptOccurrences,
        this.db.exercises,
        this.db.studySessions,
        this.db.attempts,
        this.db.mistakeSignals,
        this.db.conceptMastery,
        this.db.reviewCards,
        this.db.reviewLogs,
      ],
      async () => {
        await Promise.all([
          this.db.sources.clear(),
          this.db.learningPacks.clear(),
          this.db.concepts.clear(),
          this.db.conceptOccurrences.clear(),
          this.db.exercises.clear(),
          this.db.studySessions.clear(),
          this.db.attempts.clear(),
          this.db.mistakeSignals.clear(),
          this.db.conceptMastery.clear(),
          this.db.reviewCards.clear(),
          this.db.reviewLogs.clear(),
        ])
      },
    )
    await this.settings.touchMeaningfulChange()
  }

  shouldRemindBackup(settings: {
    lastMeaningfulChangeAt?: string | null
    lastExportAt?: string | null
  }): boolean {
    if (!settings.lastMeaningfulChangeAt) return false
    if (!settings.lastExportAt) return true
    return settings.lastMeaningfulChangeAt > settings.lastExportAt
  }
}

/** Accept legacy v1 envelopes (settings only) by filling empty learning arrays. */
function migrateImportPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const obj = raw as Record<string, unknown>
  if (obj.schemaVersion === 1 && obj.format === EXPORT_FORMAT) {
    const data = (obj.data ?? {}) as Record<string, unknown>
    return {
      ...obj,
      schemaVersion: EXPORT_SCHEMA_VERSION,
      data: {
        providerProfiles: data.providerProfiles ?? [],
        appSettings: data.appSettings,
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
  }
  return raw
}

export function assertNoSecrets(value: unknown, path = 'root'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecrets(item, `${path}[${index}]`))
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        throw new Error(`Secret-like key "${key}" must not appear in export at ${path}`)
      }
      if (
        typeof child === 'string' &&
        /sk-[a-zA-Z0-9]{10,}/.test(child) &&
        key.toLowerCase().includes('key')
      ) {
        throw new Error(`Possible API key value at ${path}.${key}`)
      }
      assertNoSecrets(child, `${path}.${key}`)
    }
  }
}
