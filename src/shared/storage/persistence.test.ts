import { describe, expect, it, vi } from 'vitest'
import { StoragePersistenceService } from './persistence'

describe('StoragePersistenceService', () => {
  it('reports unsupported when Storage API is missing', async () => {
    const service = new StoragePersistenceService(undefined)
    const status = await service.getStatus()
    expect(status).toEqual({
      supported: false,
      state: 'unsupported',
      persisted: null,
      estimate: { usageBytes: null, quotaBytes: null },
    })
  })

  it('reports granted when persisted() is true', async () => {
    const service = new StoragePersistenceService({
      persisted: vi.fn().mockResolvedValue(true),
      estimate: vi.fn().mockResolvedValue({ usage: 100, quota: 1000 }),
    })
    const status = await service.getStatus()
    expect(status.state).toBe('granted')
    expect(status.persisted).toBe(true)
    expect(status.estimate).toEqual({ usageBytes: 100, quotaBytes: 1000 })
  })

  it('requests persistent storage and reflects result', async () => {
    const persist = vi.fn().mockResolvedValue(true)
    const service = new StoragePersistenceService({
      persisted: vi.fn().mockResolvedValue(false),
      persist,
      estimate: vi.fn().mockResolvedValue({}),
    })
    const status = await service.requestPersistent()
    expect(persist).toHaveBeenCalledOnce()
    expect(status.state).toBe('granted')
    expect(status.persisted).toBe(true)
  })

  it('maps rejected persist request to denied when not already persisted', async () => {
    const service = new StoragePersistenceService({
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockResolvedValue(false),
    })
    const status = await service.requestPersistent()
    expect(status.state).toBe('denied')
    expect(status.persisted).toBe(false)
  })
})
