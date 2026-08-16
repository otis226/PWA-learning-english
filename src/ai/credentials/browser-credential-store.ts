import type {
  CredentialPersistence,
  CredentialStore,
  StoredCredential,
} from './types'

const STORAGE_PREFIX = 'pwa-le.credential.'

type MemoryEntry = StoredCredential

/**
 * Session-default credential store.
 * - session: in-memory for the page lifetime (lost on full reload unless mirrored to sessionStorage)
 * - remember: localStorage opt-in only
 *
 * Credentials are never written to IndexedDB provider profiles.
 */
export class BrowserCredentialStore implements CredentialStore {
  private readonly memory = new Map<string, MemoryEntry>()

  constructor(
    private readonly sessionStorageRef: Storage | null = getStorage('sessionStorage'),
    private readonly localStorageRef: Storage | null = getStorage('localStorage'),
  ) {
    this.hydrateFromSession()
  }

  async get(providerProfileId: string): Promise<StoredCredential | null> {
    const fromMemory = this.memory.get(providerProfileId)
    if (fromMemory) {
      return fromMemory
    }

    const remembered = this.readStorage(this.localStorageRef, providerProfileId)
    if (remembered) {
      this.memory.set(providerProfileId, remembered)
      return remembered
    }

    const session = this.readStorage(this.sessionStorageRef, providerProfileId)
    if (session) {
      this.memory.set(providerProfileId, session)
      return session
    }

    return null
  }

  async set(
    providerProfileId: string,
    apiKey: string,
    persistence: CredentialPersistence,
  ): Promise<void> {
    const trimmed = apiKey.trim()
    if (!trimmed) {
      await this.clear(providerProfileId)
      return
    }

    const entry: StoredCredential = { apiKey: trimmed, persistence }
    this.memory.set(providerProfileId, entry)

    if (persistence === 'remember') {
      this.writeStorage(this.localStorageRef, providerProfileId, entry)
      this.removeStorage(this.sessionStorageRef, providerProfileId)
      return
    }

    this.writeStorage(this.sessionStorageRef, providerProfileId, entry)
    this.removeStorage(this.localStorageRef, providerProfileId)
  }

  async clear(providerProfileId: string): Promise<void> {
    this.memory.delete(providerProfileId)
    this.removeStorage(this.sessionStorageRef, providerProfileId)
    this.removeStorage(this.localStorageRef, providerProfileId)
  }

  async has(providerProfileId: string): Promise<boolean> {
    return (await this.get(providerProfileId)) !== null
  }

  private hydrateFromSession(): void {
    if (!this.sessionStorageRef) {
      return
    }
    for (let i = 0; i < this.sessionStorageRef.length; i += 1) {
      const key = this.sessionStorageRef.key(i)
      if (!key || !key.startsWith(STORAGE_PREFIX)) {
        continue
      }
      const profileId = key.slice(STORAGE_PREFIX.length)
      const entry = this.readStorage(this.sessionStorageRef, profileId)
      if (entry) {
        this.memory.set(profileId, entry)
      }
    }
  }

  private storageKey(providerProfileId: string): string {
    return `${STORAGE_PREFIX}${providerProfileId}`
  }

  private readStorage(
    storage: Storage | null,
    providerProfileId: string,
  ): StoredCredential | null {
    if (!storage) {
      return null
    }
    try {
      const raw = storage.getItem(this.storageKey(providerProfileId))
      if (!raw) {
        return null
      }
      const parsed = JSON.parse(raw) as Partial<StoredCredential>
      if (
        typeof parsed.apiKey !== 'string' ||
        (parsed.persistence !== 'session' && parsed.persistence !== 'remember')
      ) {
        return null
      }
      return { apiKey: parsed.apiKey, persistence: parsed.persistence }
    } catch {
      return null
    }
  }

  private writeStorage(
    storage: Storage | null,
    providerProfileId: string,
    entry: StoredCredential,
  ): void {
    if (!storage) {
      return
    }
    try {
      storage.setItem(this.storageKey(providerProfileId), JSON.stringify(entry))
    } catch {
      // Quota or privacy mode — memory still holds the credential for this session.
    }
  }

  private removeStorage(storage: Storage | null, providerProfileId: string): void {
    if (!storage) {
      return
    }
    try {
      storage.removeItem(this.storageKey(providerProfileId))
    } catch {
      // ignore
    }
  }
}

function getStorage(name: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    if (typeof globalThis === 'undefined') {
      return null
    }
    const storage = globalThis[name]
    if (!storage) {
      return null
    }
    const probe = '__pwa_le_probe__'
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return storage
  } catch {
    return null
  }
}
