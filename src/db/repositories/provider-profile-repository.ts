import type { AppDatabase } from '../schema/app-database'
import type { ProviderProfileRecord } from '../schema/types'

export class ProviderProfileRepository {
  constructor(private readonly db: AppDatabase) {}

  async list(): Promise<ProviderProfileRecord[]> {
    return this.db.providerProfiles.orderBy('updatedAt').reverse().toArray()
  }

  async getById(id: string): Promise<ProviderProfileRecord | undefined> {
    return this.db.providerProfiles.get(id)
  }

  async upsert(profile: ProviderProfileRecord): Promise<void> {
    await this.db.providerProfiles.put(profile)
  }

  async delete(id: string): Promise<void> {
    await this.db.providerProfiles.delete(id)
  }
}
