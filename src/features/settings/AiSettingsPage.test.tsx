import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppServicesProvider } from '../../app/services-context'
import { createAppServices } from '../../app/create-services'
import { AppDatabase } from '../../db/schema/app-database'
import { BrowserCredentialStore } from '../../ai/credentials/browser-credential-store'
import { AiSettingsPage } from './AiSettingsPage'

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

describe('AiSettingsPage', () => {
  let db: AppDatabase

  beforeEach(async () => {
    db = new AppDatabase(`ui-ai-${crypto.randomUUID()}`)
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('saves provider via service and tests connection with mocked fetch', async () => {
    const user = userEvent.setup()
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const services = createAppServices({
      db,
      credentials: new BrowserCredentialStore(memoryStorage(), memoryStorage()),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    render(
      <MemoryRouter>
        <AppServicesProvider services={services}>
          <AiSettingsPage />
        </AppServicesProvider>
      </MemoryRouter>,
    )

    const displayName = await screen.findByLabelText(/display name/i)
    await user.clear(displayName)
    await user.type(displayName, 'Fixture Provider')
    const baseUrl = screen.getByLabelText(/base url/i)
    await user.clear(baseUrl)
    await user.type(baseUrl, 'https://api.example.com/v1')
    const model = screen.getByLabelText(/model \(free text\)/i)
    await user.clear(model)
    await user.type(model, 'fixture-model')
    await user.type(screen.getByLabelText(/^API key/i), 'sk-fixture-key')

    await user.click(screen.getByRole('button', { name: /save provider/i }))

    await waitFor(() => {
      expect(screen.getByText(/provider profile saved/i)).toBeInTheDocument()
    })

    const stored = await db.providerProfiles.toArray()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.model).toBe('fixture-model')
    expect(stored[0] && 'apiKey' in stored[0]).toBe(false)

    await user.click(screen.getByRole('button', { name: /test connection/i }))

    await waitFor(() => {
      expect(screen.getByText(/connection succeeded/i)).toBeInTheDocument()
    })
    expect(fetchImpl).toHaveBeenCalled()
  })
})
