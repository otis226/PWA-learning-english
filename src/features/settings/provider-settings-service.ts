import type { CredentialStore } from '../../ai/credentials/types'
import type { CredentialPersistence } from '../../ai/credentials/types'
import type { AIGateway, ActiveAIConfig, ConnectionTestResult } from '../../ai/gateway/types'
import {
  aiProviderProfileInputSchema,
  type AIProviderProfileInput,
} from '../../ai/schemas/provider-profile'
import { mergeCapabilities } from '../../ai/schemas/capabilities'
import { parseOrThrow } from '../../ai/schemas/parse'
import type { AppSettingsRepository } from '../../db/repositories/app-settings-repository'
import type { ProviderProfileRepository } from '../../db/repositories/provider-profile-repository'
import type { ProviderProfileRecord } from '../../db/schema/types'
import { createId } from '../../shared/ids'

export type SaveProviderInput = AIProviderProfileInput & {
  id?: string
  apiKey: string
  rememberOnDevice: boolean
  setActive?: boolean
}

export type ProviderSettingsView = {
  profile: ProviderProfileRecord | null
  profiles: ProviderProfileRecord[]
  activeProviderProfileId: string | null
  hasCredential: boolean
  credentialPersistence: CredentialPersistence | null
  activeConfig: ActiveAIConfig | null
}

export class ProviderSettingsService {
  constructor(
    private readonly profiles: ProviderProfileRepository,
    private readonly settings: AppSettingsRepository,
    private readonly credentials: CredentialStore,
    private readonly gateway: AIGateway,
  ) {}

  async getView(): Promise<ProviderSettingsView> {
    const [profiles, appSettings] = await Promise.all([
      this.profiles.list(),
      this.settings.get(),
    ])
    const activeId = appSettings.activeProviderProfileId
    const profile =
      (activeId ? await this.profiles.getById(activeId) : undefined) ??
      profiles[0] ??
      null

    if (!profile) {
      return {
        profile: null,
        profiles,
        activeProviderProfileId: activeId,
        hasCredential: false,
        credentialPersistence: null,
        activeConfig: null,
      }
    }

    const credential = await this.credentials.get(profile.id)
    const activeConfig = await this.toActiveConfig(profile, Boolean(credential), credential?.persistence ?? null)

    return {
      profile,
      profiles,
      activeProviderProfileId: appSettings.activeProviderProfileId,
      hasCredential: Boolean(credential),
      credentialPersistence: credential?.persistence ?? null,
      activeConfig,
    }
  }

  async saveProvider(input: SaveProviderInput): Promise<ProviderProfileRecord> {
    const parsed = parseOrThrow(aiProviderProfileInputSchema, {
      displayName: input.displayName,
      baseUrl: input.baseUrl,
      model: input.model,
      protocol: input.protocol ?? 'chat_completions',
      capabilityOverrides: input.capabilityOverrides,
    })

    const now = new Date().toISOString()
    const existing = input.id ? await this.profiles.getById(input.id) : undefined
    const profile: ProviderProfileRecord = {
      id: existing?.id ?? input.id ?? createId('provider'),
      displayName: parsed.displayName,
      baseUrl: parsed.baseUrl.replace(/\/+$/, ''),
      model: parsed.model,
      protocol: parsed.protocol,
      capabilityOverrides: parsed.capabilityOverrides,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }

    // Ensure secrets never land on the profile record path.
    assertNoSecretFields(profile)

    await this.profiles.upsert(profile)

    const persistence: CredentialPersistence = input.rememberOnDevice
      ? 'remember'
      : 'session'
    const trimmedKey = input.apiKey.trim()
    if (trimmedKey) {
      await this.credentials.set(profile.id, trimmedKey, persistence)
    } else if (existing) {
      // Blank key field: keep the existing secret; only move persistence when mode changes
      // (session ↔ remember). Both directions must preserve the key.
      const current = await this.credentials.get(profile.id)
      if (current && current.persistence !== persistence) {
        await this.credentials.set(profile.id, current.apiKey, persistence)
      }
    }

    if (input.setActive !== false) {
      await this.settings.setActiveProviderProfileId(profile.id)
    }

    return profile
  }

  async testActiveConnection(signal?: AbortSignal): Promise<ConnectionTestResult> {
    const view = await this.getView()
    if (!view.activeConfig) {
      return {
        ok: false,
        category: 'missing_credential',
        message: 'Save a provider profile before testing the connection.',
        providerMessage: null,
        status: null,
      }
    }
    return this.gateway.testConnection(view.activeConfig, signal)
  }

  async getActiveConfig(): Promise<ActiveAIConfig | null> {
    const view = await this.getView()
    return view.activeConfig
  }

  private async toActiveConfig(
    profile: ProviderProfileRecord,
    hasCredential: boolean,
    credentialPersistence: CredentialPersistence | null,
  ): Promise<ActiveAIConfig> {
    return {
      providerProfileId: profile.id,
      displayName: profile.displayName,
      baseUrl: profile.baseUrl,
      model: profile.model,
      protocol: profile.protocol,
      capabilities: mergeCapabilities(profile.capabilityOverrides),
      hasCredential,
      credentialPersistence,
    }
  }
}

function assertNoSecretFields(profile: ProviderProfileRecord): void {
  const record = profile as unknown as Record<string, unknown>
  const forbidden = ['apiKey', 'api_key', 'authorization', 'secret', 'token']
  for (const key of forbidden) {
    if (key in record && record[key] != null && record[key] !== '') {
      throw new Error(`Refusing to persist secret field on provider profile: ${key}`)
    }
  }
}
