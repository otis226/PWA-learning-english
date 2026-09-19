export function normalizeEnglishText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function textSimilarityPercent(expected: string, actual: string): number {
  const left = normalizeEnglishText(expected)
  const right = normalizeEnglishText(actual)
  if (!left && !right) return 100
  if (!left || !right) return 0
  const distance = levenshtein(left, right)
  const denominator = Math.max(left.length, right.length)
  return Math.max(0, Math.round((1 - distance / denominator) * 100))
}

function levenshtein(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0]
    previous[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j]
      const substitution = diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, substitution)
      diagonal = above
    }
  }
  return previous[b.length]
}
