export type AIErrorCategory =
  | 'offline'
  | 'network_or_cors'
  | 'unauthorized'
  | 'rate_limit'
  | 'provider_error'
  | 'invalid_response'
  | 'timeout'
  | 'missing_credential'
  | 'aborted'

export class AIRequestError extends Error {
  readonly category: AIErrorCategory
  readonly status: number | null
  readonly providerMessage: string | null

  constructor(
    category: AIErrorCategory,
    message: string,
    options?: {
      status?: number | null
      providerMessage?: string | null
      cause?: unknown
    },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined)
    this.name = 'AIRequestError'
    this.category = category
    this.status = options?.status ?? null
    this.providerMessage = options?.providerMessage ?? null
  }
}

export function userMessageForCategory(category: AIErrorCategory): string {
  switch (category) {
    case 'offline':
      return 'You appear to be offline. Reconnect and try again.'
    case 'network_or_cors':
      return 'Network or CORS blocked the request. The provider must allow this app origin, or use a CORS-friendly endpoint.'
    case 'unauthorized':
      return 'The provider rejected the API key (unauthorized).'
    case 'rate_limit':
      return 'The provider rate-limited the request. Wait and try again.'
    case 'provider_error':
      return 'The provider returned an error (model or server). Check the model name and provider status.'
    case 'invalid_response':
      return 'The provider returned an unexpected response shape.'
    case 'timeout':
      return 'The request timed out before the provider responded.'
    case 'missing_credential':
      return 'No API key is available for this provider profile.'
    case 'aborted':
      return 'The request was cancelled.'
    default: {
      const _exhaustive: never = category
      return _exhaustive
    }
  }
}

export function categorizeHttpStatus(status: number): AIErrorCategory {
  if (status === 401 || status === 403) {
    return 'unauthorized'
  }
  if (status === 429) {
    return 'rate_limit'
  }
  if (status === 404 || status >= 400) {
    return 'provider_error'
  }
  return 'provider_error'
}

export function extractProviderErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return typeof body === 'string' && body.trim() ? body.trim().slice(0, 500) : null
  }
  const record = body as Record<string, unknown>
  if (typeof record.message === 'string') {
    return record.message
  }
  const error = record.error
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object') {
    const nested = error as Record<string, unknown>
    if (typeof nested.message === 'string') {
      return nested.message
    }
  }
  return null
}
