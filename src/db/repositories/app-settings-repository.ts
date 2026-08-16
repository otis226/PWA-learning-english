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
      lastMeaningfulChangeAt: null,
      lastExportAt: null,
    }
    return defaults
  }

  async setActiveProviderProfileId(profileId: string | null): Promise<AppSettingsRecord> {
    const current = await this.get()
    const next: AppSettingsRecord = {
      ...current,
      id: SETTINGS_ID,
      activeProviderProfileId: profileId,
      updatedAt: new Date().toISOString(),
    }
    await this.db.appSettings.put(next)
    return next
  }

  async touchMeaningfulChange(at = new Date().toISOString()): Promise<void> {
    const current = await this.get()
    await this.db.appSettings.put({
      ...current,
      id: SETTINGS_ID,
      lastMeaningfulChangeAt: at,
      updatedAt: at,
    })
  }

  async markExported(at = new Date().toISOString()): Promise<void> {
    const current = await this.get()
    await this.db.appSettings.put({
      ...current,
      id: SETTINGS_ID,
      lastExportAt: at,
      updatedAt: at,
    })
  }

  async put(settings: AppSettingsRecord): Promise<void> {
    await this.db.appSettings.put(settings)
  }
}
