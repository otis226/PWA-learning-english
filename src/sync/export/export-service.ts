import { safeParseWithSchema } from '../../ai/schemas/parse'
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
    private readonly profiles: ProviderProfileRepository,
    private readonly settings: AppSettingsRepository,
  ) {}

  async buildExport(): Promise<ExportEnvelope> {
    const [providerProfiles, appSettings] = await Promise.all([
      this.profiles.list(),
      this.settings.get(),
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
        },
      },
    }

    assertNoSecrets(envelope)
    const validated = safeParseWithSchema(exportEnvelopeSchema, envelope, 'export_invalid')
    if (!validated.success) {
      throw validated.error
    }
    return validated.data
  }

  async exportJsonString(pretty = true): Promise<string> {
    const envelope = await this.buildExport()
    return pretty ? JSON.stringify(envelope, null, 2) : JSON.stringify(envelope)
  }

  /**
   * M0: validate/preview only. Destructive restore is deferred.
   * Secret-like keys are rejected on the raw payload before Zod stripping.
   */
  validateImport(raw: unknown): ImportValidationResult {
    try {
      assertNoSecrets(raw)
    } catch (error) {
      return {
        ok: false,
        issues: [error instanceof Error ? error.message : 'Import contains secrets'],
      }
    }

    const parsed = safeParseWithSchema(exportEnvelopeSchema, raw, 'import_invalid')
    if (!parsed.success) {
      return { ok: false, issues: parsed.issues }
    }
    return {
      ok: true,
      envelope: parsed.data,
      summary: {
        providerProfileCount: parsed.data.data.providerProfiles.length,
        activeProviderProfileId: parsed.data.data.appSettings.activeProviderProfileId,
      },
    }
  }
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
