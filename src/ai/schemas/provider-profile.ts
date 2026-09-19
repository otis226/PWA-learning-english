import { z } from 'zod'
import { aiProviderCapabilitiesSchema } from './capabilities'

export const providerProtocolSchema = z.literal('chat_completions')
export const providerAuthModeSchema = z.enum(['bearer', 'x-api-key', 'custom-header'])

const safeHeaderName = z
  .string()
  .trim()
  .min(1, 'Header name is required')
  .regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/, 'Header name contains invalid characters')

/** Matches OpenAI-compatible adapter: absolute http(s) only. */
export function isHttpOrHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const httpOrHttpsUrl = z
  .string()
  .trim()
  .min(1, 'Base URL is required')
  .refine(isHttpOrHttpsUrl, 'Base URL must be an absolute http or https URL')

export const aiProviderProfileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  baseUrl: httpOrHttpsUrl,
  model: z.string().min(1),
  protocol: providerProtocolSchema,
  authMode: providerAuthModeSchema.optional(),
  authHeaderName: safeHeaderName.optional(),
  capabilityOverrides: aiProviderCapabilitiesSchema.partial().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type AIProviderProfile = z.infer<typeof aiProviderProfileSchema>

export const aiProviderProfileInputSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required'),
  baseUrl: httpOrHttpsUrl,
  model: z.string().trim().min(1, 'Model is required'),
  protocol: providerProtocolSchema.default('chat_completions'),
  authMode: providerAuthModeSchema.default('bearer'),
  authHeaderName: safeHeaderName.optional(),
  capabilityOverrides: aiProviderCapabilitiesSchema.partial().optional(),
}).superRefine((value, ctx) => {
  if (value.authMode === 'custom-header' && !value.authHeaderName) {
    ctx.addIssue({
      code: 'custom',
      path: ['authHeaderName'],
      message: 'Custom header name is required',
    })
  }
})

export type AIProviderProfileInput = z.input<typeof aiProviderProfileInputSchema>
