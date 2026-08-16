import type { AppDatabase } from '../schema/app-database'
import type { AppSettingsRecord } from '../schema/types'

const SETTINGS_ID = 'app' as const

export class AppSettingsRepository {
  constructor(private readonly db: AppDatabase) {}

  async get(): Promise<AppSettingsRecord> {
    const existing = await this.db.appSettings.get(SETTINGS_ID)
    if (existing) {
      return existing
    }
    const defaults: AppSettingsRecord = {
      id: SETTINGS_ID,
      activeProviderProfileId: null,
      updatedAt: new Date(0).toISOString(),
    }
    return defaults
  }

  async setActiveProviderProfileId(profileId: string | null): Promise<AppSettingsRecord> {
    const next: AppSettingsRecord = {
      id: SETTINGS_ID,
      activeProviderProfileId: profileId,
      updatedAt: new Date().toISOString(),
    }
    await this.db.appSettings.put(next)
    return next
  }

  async put(settings: AppSettingsRecord): Promise<void> {
    await this.db.appSettings.put(settings)
  }
}
