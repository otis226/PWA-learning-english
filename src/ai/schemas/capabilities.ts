import { z } from 'zod'

/**
 * Capabilities the app may consume. Provider brand must not drive behavior.
 * Only fields actually used by the product should be added here.
 */
export const aiProviderCapabilitiesSchema = z.object({
  chatCompletions: z.boolean(),
  responses: z.boolean(),
  jsonSchema: z.boolean(),
  jsonObject: z.boolean(),
  streaming: z.boolean(),
  vision: z.boolean(),
  fileInput: z.boolean(),
})

export type AIProviderCapabilities = z.infer<typeof aiProviderCapabilitiesSchema>

export const DEFAULT_PROVIDER_CAPABILITIES: AIProviderCapabilities = {
  chatCompletions: true,
  responses: false,
  jsonSchema: false,
  jsonObject: false,
  streaming: false,
  vision: false,
  fileInput: false,
}

export function mergeCapabilities(
  overrides?: Partial<AIProviderCapabilities>,
): AIProviderCapabilities {
  return {
    ...DEFAULT_PROVIDER_CAPABILITIES,
    ...overrides,
  }
}
