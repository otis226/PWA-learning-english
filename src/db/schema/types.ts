import type { AIProviderCapabilities } from '../../ai/schemas/capabilities'

export type ProviderProtocol = 'chat_completions'

/** Non-secret AI provider profile persisted in IndexedDB. */
export type ProviderProfileRecord = {
  id: string
  displayName: string
  baseUrl: string
  model: string
  protocol: ProviderProtocol
  capabilityOverrides?: Partial<AIProviderCapabilities>
  createdAt: string
  updatedAt: string
}

export type AppSettingsRecord = {
  id: 'app'
  activeProviderProfileId: string | null
  updatedAt: string
}

export type MetaRecord = {
  key: string
  value: string
}
