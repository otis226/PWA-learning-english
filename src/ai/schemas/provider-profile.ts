import { z } from 'zod'
import { aiProviderCapabilitiesSchema } from './capabilities'

export const providerProtocolSchema = z.literal('chat_completions')

export const aiProviderProfileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  baseUrl: z.string().url(),
  model: z.string().min(1),
  protocol: providerProtocolSchema,
  capabilityOverrides: aiProviderCapabilitiesSchema.partial().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type AIProviderProfile = z.infer<typeof aiProviderProfileSchema>

export const aiProviderProfileInputSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required'),
  baseUrl: z
    .string()
    .trim()
    .min(1, 'Base URL is required')
    .url('Base URL must be a valid URL'),
  model: z.string().trim().min(1, 'Model is required'),
  protocol: providerProtocolSchema.default('chat_completions'),
  capabilityOverrides: aiProviderCapabilitiesSchema.partial().optional(),
})

export type AIProviderProfileInput = z.input<typeof aiProviderProfileInputSchema>
