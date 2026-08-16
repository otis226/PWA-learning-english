import { BrowserCredentialStore } from '../ai/credentials/browser-credential-store'
import { DefaultAIGateway } from '../ai/gateway/ai-gateway'
import { AppDatabase, getAppDatabase } from '../db/schema/app-database'
import { AppSettingsRepository } from '../db/repositories/app-settings-repository'
import { ProviderProfileRepository } from '../db/repositories/provider-profile-repository'
import { ProviderSettingsService } from '../features/settings/provider-settings-service'
import { StoragePersistenceService } from '../shared/storage/persistence'
import { ExportService } from '../sync/export/export-service'
import type { CredentialStore } from '../ai/credentials/types'
import type { AIGateway } from '../ai/gateway/types'

export type AppServices = {
  db: AppDatabase
  credentials: CredentialStore
  gateway: AIGateway
  providerSettings: ProviderSettingsService
  storagePersistence: StoragePersistenceService
  exportService: ExportService
}

export function createAppServices(options?: {
  db?: AppDatabase
  credentials?: CredentialStore
  fetchImpl?: typeof fetch
}): AppServices {
  const db = options?.db ?? getAppDatabase()
  const credentials = options?.credentials ?? new BrowserCredentialStore()
  const gateway = new DefaultAIGateway(
    credentials,
    options?.fetchImpl ?? fetch.bind(globalThis),
  )
  const profiles = new ProviderProfileRepository(db)
  const settings = new AppSettingsRepository(db)

  return {
    db,
    credentials,
    gateway,
    providerSettings: new ProviderSettingsService(
      profiles,
      settings,
      credentials,
      gateway,
    ),
    storagePersistence: new StoragePersistenceService(),
    exportService: new ExportService(profiles, settings),
  }
}

export function createDefaultAppServices(): AppServices {
  return createAppServices()
}
