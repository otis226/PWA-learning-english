export type StoragePersistenceState =
  | 'unsupported'
  | 'unknown'
  | 'granted'
  | 'prompt'
  | 'denied'

export type StorageEstimateSummary = {
  usageBytes: number | null
  quotaBytes: number | null
}

export type StoragePersistenceStatus = {
  supported: boolean
  state: StoragePersistenceState
  persisted: boolean | null
  estimate: StorageEstimateSummary
}

export type StorageApiLike = {
  persisted?: () => Promise<boolean>
  persist?: () => Promise<boolean>
  estimate?: () => Promise<{ usage?: number; quota?: number }>
}

export class StoragePersistenceService {
  constructor(private readonly storage: StorageApiLike | undefined = getDefaultStorageApi()) {}

  async getStatus(): Promise<StoragePersistenceStatus> {
    if (!this.storage) {
      return {
        supported: false,
        state: 'unsupported',
        persisted: null,
        estimate: { usageBytes: null, quotaBytes: null },
      }
    }

    const estimate = await this.readEstimate()
    if (typeof this.storage.persisted !== 'function') {
      return {
        supported: typeof this.storage.persist === 'function',
        state: 'unknown',
        persisted: null,
        estimate,
      }
    }

    try {
      const persisted = await this.storage.persisted()
      return {
        supported: true,
        state: persisted ? 'granted' : 'prompt',
        persisted,
        estimate,
      }
    } catch {
      return {
        supported: true,
        state: 'unknown',
        persisted: null,
        estimate,
      }
    }
  }

  async requestPersistent(): Promise<StoragePersistenceStatus> {
    if (!this.storage || typeof this.storage.persist !== 'function') {
      return this.getStatus()
    }

    try {
      const granted = await this.storage.persist()
      const status = await this.getStatus()
      if (granted) {
        return { ...status, state: 'granted', persisted: true, supported: true }
      }
      return {
        ...status,
        supported: true,
        state: status.persisted ? 'granted' : 'denied',
        persisted: status.persisted ?? false,
      }
    } catch {
      const status = await this.getStatus()
      return { ...status, state: 'unknown' }
    }
  }

  private async readEstimate(): Promise<StorageEstimateSummary> {
    if (!this.storage || typeof this.storage.estimate !== 'function') {
      return { usageBytes: null, quotaBytes: null }
    }
    try {
      const estimate = await this.storage.estimate()
      return {
        usageBytes: typeof estimate.usage === 'number' ? estimate.usage : null,
        quotaBytes: typeof estimate.quota === 'number' ? estimate.quota : null,
      }
    } catch {
      return { usageBytes: null, quotaBytes: null }
    }
  }
}

function getDefaultStorageApi(): StorageApiLike | undefined {
  if (typeof navigator === 'undefined') {
    return undefined
  }
  return navigator.storage as StorageApiLike | undefined
}
