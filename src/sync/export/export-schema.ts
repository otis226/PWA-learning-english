import { z } from 'zod'
import { aiProviderProfileSchema } from '../../ai/schemas/provider-profile'

export const EXPORT_FORMAT = 'pwa-learning-english-export' as const
export const EXPORT_SCHEMA_VERSION = 1 as const

export const appSettingsExportSchema = z.object({
  activeProviderProfileId: z.string().nullable(),
  updatedAt: z.string().datetime(),
})

export const exportEnvelopeSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  schemaVersion: z.literal(EXPORT_SCHEMA_VERSION),
  exportedAt: z.string().datetime(),
  data: z.object({
    providerProfiles: z.array(aiProviderProfileSchema),
    appSettings: appSettingsExportSchema,
  }),
})

export type ExportEnvelope = z.infer<typeof exportEnvelopeSchema>

export type ImportValidationResult =
  | {
      ok: true
      envelope: ExportEnvelope
      summary: {
        providerProfileCount: number
        activeProviderProfileId: string | null
      }
    }
  | {
      ok: false
      issues: string[]
    }
