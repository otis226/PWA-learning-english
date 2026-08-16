import { AppError } from '../../shared/errors'
import type { SourceType } from '../../db/schema/types'

/** Soft product limit for pasted input (characters). */
export const MAX_SOURCE_CHARS = 40_000

export type NormalizeSourceInput = {
  type: SourceType
  title?: string
  content: string
}

export type NormalizedSourceContent = {
  type: SourceType
  title: string
  rawContent: string
  normalizedContent: string
  charCount: number
}

export function normalizeSourceInput(input: NormalizeSourceInput): NormalizedSourceContent {
  const rawContent = input.content.replace(/\r\n/g, '\n')
  if (!rawContent.trim()) {
    throw new AppError('source_empty', 'Paste or enter some learning content first.')
  }
  if (rawContent.length > MAX_SOURCE_CHARS) {
    throw new AppError(
      'source_too_large',
      `Content is too large (${rawContent.length.toLocaleString()} characters). Limit is ${MAX_SOURCE_CHARS.toLocaleString()}.`,
    )
  }

  let normalizedContent: string
  switch (input.type) {
    case 'pasted_text':
      normalizedContent = normalizeParagraphText(rawContent)
      break
    case 'vocabulary_list':
      normalizedContent = normalizeVocabularyList(rawContent)
      break
    case 'custom_topic':
      normalizedContent = normalizeParagraphText(rawContent)
      break
    default: {
      const _exhaustive: never = input.type
      return _exhaustive
    }
  }

  if (!normalizedContent.trim()) {
    throw new AppError('source_empty', 'Content was empty after normalization.')
  }

  const title =
    input.title?.trim() ||
    deriveTitle(input.type, normalizedContent)

  return {
    type: input.type,
    title,
    rawContent,
    normalizedContent,
    charCount: normalizedContent.length,
  }
}

function normalizeParagraphText(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function normalizeVocabularyList(text: string): string {
  const lines = text
    .split(/[\n,;]+/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  // Dedup case-insensitively while preserving first casing.
  const seen = new Set<string>()
  const unique: string[] = []
  for (const line of lines) {
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(line)
  }
  return unique.join('\n')
}

function deriveTitle(type: SourceType, content: string): string {
  const firstLine = content.split('\n').find((l) => l.trim())?.trim() ?? 'Untitled'
  const clipped = firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine
  switch (type) {
    case 'pasted_text':
      return clipped
    case 'vocabulary_list':
      return `Vocabulary: ${clipped}`
    case 'custom_topic':
      return `Topic: ${clipped}`
    default: {
      const _exhaustive: never = type
      return _exhaustive
    }
  }
}
