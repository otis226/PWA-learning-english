import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserCredentialStore } from '../../ai/credentials/browser-credential-store'
import { DefaultAIGateway } from '../../ai/gateway/ai-gateway'
import { AppDatabase } from '../../db/schema/app-database'
import { AppSettingsRepository } from '../../db/repositories/app-settings-repository'
import { ProviderProfileRepository } from '../../db/repositories/provider-profile-repository'
import { ProviderSettingsService } from './provider-settings-service'

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear() {
      map.clear()
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null
    },
    removeItem(key: string) {
      map.delete(key)
    },
    setItem(key: string, value: string) {
      map.set(key, value)
    },
  }
}

describe('ProviderSettingsService', () => {
  let db: AppDatabase
  let service: ProviderSettingsService
  let credentials: BrowserCredentialStore

  beforeEach(async () => {
    db = new AppDatabase(`provider-svc-${crypto.randomUUID()}`)
    await db.open()
    credentials = new BrowserCredentialStore(memoryStorage(), memoryStorage())
    service = new ProviderSettingsService(
      new ProviderProfileRepository(db),
      new AppSettingsRepository(db),
      credentials,
      new DefaultAIGateway(credentials, vi.fn() as unknown as typeof fetch),
    )
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('saves non-secret profile to IndexedDB and credential separately', async () => {
    const profile = await service.saveProvider({
      displayName: 'My Provider',
      baseUrl: 'https://api.example.com/v1',
      model: 'custom-model-name',
      apiKey: 'sk-test-key-not-for-export',
      rememberOnDevice: false,
    })

    const row = await db.providerProfiles.get(profile.id)
    expect(row).toMatchObject({
      displayName: 'My Provider',
      model: 'custom-model-name',
    })
    expect(row && 'apiKey' in row).toBe(false)

    const cred = await credentials.get(profile.id)
    expect(cred).toEqual({
      apiKey: 'sk-test-key-not-for-export',
      persistence: 'session',
    })

    const view = await service.getView()
    expect(view.hasCredential).toBe(true)
    expect(view.activeConfig?.model).toBe('custom-model-name')
  })

  it('supports remember-on-device persistence flag', async () => {
    const profile = await service.saveProvider({
      displayName: 'Remembered',
      baseUrl: 'https://api.example.com/v1',
      model: 'm',
      apiKey: 'sk-remembered-key',
      rememberOnDevice: true,
    })
    const cred = await credentials.get(profile.id)
    expect(cred?.persistence).toBe('remember')
  })
})
