/**
 * Build a Chat Completions endpoint from a user-entered base URL.
 * Handles trailing slashes and avoids `/v1/v1/chat/completions`.
 */
export function normalizeChatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim()
  if (!trimmed) {
    throw new Error('Base URL is required')
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error('Base URL must be a valid absolute URL')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Base URL must use http or https')
  }

  let path = url.pathname.replace(/\/+$/, '')
  if (path.endsWith('/chat/completions')) {
    url.pathname = path
    url.search = ''
    url.hash = ''
    return url.toString()
  }

  if (!path || path === '/') {
    path = '/v1'
  } else if (!/\/v\d+$/i.test(path) && !path.endsWith('/v1')) {
    // Keep custom prefixes (e.g. /openai) and append /v1 when missing a version segment.
    // If the path already ends with something else meaningful, still append chat/completions under it.
    // Common case: https://api.openai.com/v1
    // Also accept https://host/openai/v1
  }

  if (!path.endsWith('/chat/completions')) {
    path = `${path}/chat/completions`
  }

  // Collapse accidental /v1/v1
  path = path.replace(/\/v1\/v1(?=\/)/gi, '/v1')

  url.pathname = path
  url.search = ''
  url.hash = ''
  return url.toString()
}
