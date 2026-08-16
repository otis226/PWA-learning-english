import { describe, expect, it, vi } from 'vitest'
import type { CredentialStore } from '../../credentials/types'
import { OpenAICompatibleChatClient } from './chat-client'
import { AIRequestError } from './errors'

function memoryCredentials(apiKey = 'sk-test'): CredentialStore {
  return {
    async get() {
      return { apiKey, persistence: 'session' }
    },
    async set() {},
    async clear() {},
    async has() {
      return true
    },
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('OpenAICompatibleChatClient', () => {
  it('completes a successful chat request', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: 'pong' } }],
      }),
    )
    const client = new OpenAICompatibleChatClient({
      baseUrl: 'https://api.example.com/v1',
      model: 'test-model',
      providerProfileId: 'p1',
      credentialStore: memoryCredentials(),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      isOnline: () => true,
    })

    const result = await client.testConnection()
    expect(result.content).toBe('pong')
    expect(fetchImpl).toHaveBeenCalledOnce()
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.example.com/v1/chat/completions')
    expect(init.method).toBe('POST')
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer sk-test')
  })

  it('maps 401 to unauthorized', async () => {
    const client = new OpenAICompatibleChatClient({
      baseUrl: 'https://api.example.com/v1',
      model: 'm',
      providerProfileId: 'p1',
      credentialStore: memoryCredentials(),
      fetchImpl: vi.fn().mockResolvedValue(
        jsonResponse({ error: { message: 'bad key' } }, 401),
      ) as unknown as typeof fetch,
      isOnline: () => true,
    })
    await expect(client.testConnection()).rejects.toMatchObject({
      category: 'unauthorized',
    } satisfies Partial<AIRequestError>)
  })

  it('maps 429 to rate_limit', async () => {
    const client = new OpenAICompatibleChatClient({
      baseUrl: 'https://api.example.com/v1',
      model: 'm',
      providerProfileId: 'p1',
      credentialStore: memoryCredentials(),
      fetchImpl: vi.fn().mockResolvedValue(
        jsonResponse({ error: { message: 'slow down' } }, 429),
      ) as unknown as typeof fetch,
      isOnline: () => true,
    })
    await expect(client.testConnection()).rejects.toMatchObject({
      category: 'rate_limit',
    })
  })

  it('maps 404 model errors to provider_error', async () => {
    const client = new OpenAICompatibleChatClient({
      baseUrl: 'https://api.example.com/v1',
      model: 'missing',
      providerProfileId: 'p1',
      credentialStore: memoryCredentials(),
      fetchImpl: vi.fn().mockResolvedValue(
        jsonResponse({ error: { message: 'model_not_found' } }, 404),
      ) as unknown as typeof fetch,
      isOnline: () => true,
    })
    await expect(client.testConnection()).rejects.toMatchObject({
      category: 'provider_error',
      providerMessage: 'model_not_found',
    })
  })

  it('maps fetch failures to network_or_cors', async () => {
    const client = new OpenAICompatibleChatClient({
      baseUrl: 'https://api.example.com/v1',
      model: 'm',
      providerProfileId: 'p1',
      credentialStore: memoryCredentials(),
      fetchImpl: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch,
      isOnline: () => true,
    })
    await expect(client.testConnection()).rejects.toMatchObject({
      category: 'network_or_cors',
    })
  })

  it('maps offline navigator to offline', async () => {
    const client = new OpenAICompatibleChatClient({
      baseUrl: 'https://api.example.com/v1',
      model: 'm',
      providerProfileId: 'p1',
      credentialStore: memoryCredentials(),
      fetchImpl: vi.fn() as unknown as typeof fetch,
      isOnline: () => false,
    })
    await expect(client.testConnection()).rejects.toMatchObject({
      category: 'offline',
    })
  })

  it('maps invalid success payload to invalid_response', async () => {
    const client = new OpenAICompatibleChatClient({
      baseUrl: 'https://api.example.com/v1',
      model: 'm',
      providerProfileId: 'p1',
      credentialStore: memoryCredentials(),
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ choices: [] })) as unknown as typeof fetch,
      isOnline: () => true,
    })
    await expect(client.testConnection()).rejects.toMatchObject({
      category: 'invalid_response',
    })
  })

  it('requires a credential', async () => {
    const emptyStore: CredentialStore = {
      async get() {
        return null
      },
      async set() {},
      async clear() {},
      async has() {
        return false
      },
    }
    const client = new OpenAICompatibleChatClient({
      baseUrl: 'https://api.example.com/v1',
      model: 'm',
      providerProfileId: 'p1',
      credentialStore: emptyStore,
      fetchImpl: vi.fn() as unknown as typeof fetch,
      isOnline: () => true,
    })
    await expect(client.testConnection()).rejects.toMatchObject({
      category: 'missing_credential',
    })
  })
})
