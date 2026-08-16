import { beforeEach, describe, expect, it } from 'vitest'
import { BrowserCredentialStore } from './browser-credential-store'

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

describe('BrowserCredentialStore', () => {
  let session: Storage
  let local: Storage
  let store: BrowserCredentialStore

  beforeEach(() => {
    session = memoryStorage()
    local = memoryStorage()
    store = new BrowserCredentialStore(session, local)
  })

  it('stores session credentials outside localStorage', async () => {
    await store.set('p1', 'sk-test', 'session')
    expect(await store.get('p1')).toEqual({
      apiKey: 'sk-test',
      persistence: 'session',
    })
    expect(local.length).toBe(0)
    expect(session.length).toBe(1)
  })

  it('stores remembered credentials in localStorage only', async () => {
    await store.set('p1', 'sk-remember', 'remember')
    expect(local.length).toBe(1)
    expect(session.length).toBe(0)
    const fresh = new BrowserCredentialStore(session, local)
    expect(await fresh.get('p1')).toEqual({
      apiKey: 'sk-remember',
      persistence: 'remember',
    })
  })

  it('clears both storages', async () => {
    await store.set('p1', 'sk', 'remember')
    await store.clear('p1')
    expect(await store.get('p1')).toBeNull()
    expect(local.length).toBe(0)
  })
})
