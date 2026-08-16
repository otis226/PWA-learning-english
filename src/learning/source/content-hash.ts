/**
 * Deterministic content hash for provenance (not a cryptographic secret).
 * Uses Web Crypto when available; falls back to FNV-1a hex for tests/SSR.
 */
export async function hashContent(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data)
    return bufferToHex(digest)
  }
  return `fnv1a_${fnv1aHex(text)}`
}

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function fnv1aHex(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
