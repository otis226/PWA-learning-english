import type { ConceptKind } from '../../db/schema/types'

/**
 * Conservative concept identity (D-015 / M3).
 *
 * Rules:
 * - Normalize label: trim, collapse whitespace, lowercase for key.
 * - Identity key = `${kind}|${normalizedLabel}|${patternHint}`.
 * - Only merge when kind + normalized label match exactly (and optional pattern).
 * - Never merge different kinds (e.g. vocabulary "since" ≠ grammar "since vs for").
 * - Distinct grammar patterns stay separate when pattern hints differ.
 */
export function buildConceptIdentityKey(input: {
  kind: ConceptKind
  label: string
  patternHint?: string | null
}): string {
  const label = normalizeConceptLabel(input.label)
  const pattern = normalizeConceptLabel(input.patternHint ?? '')
  return `${input.kind}|${label}|${pattern}`
}

export function normalizeConceptLabel(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export function labelsLikelySameConcept(a: string, b: string): boolean {
  return normalizeConceptLabel(a) === normalizeConceptLabel(b)
}
