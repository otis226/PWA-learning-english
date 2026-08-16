import type { GeneratedExerciseV1 } from '../../ai/schemas/exercises-v1'
import { AppError } from '../../shared/errors'

export type ExerciseValidationIssue = {
  index: number
  code: string
  message: string
}

export type ExerciseValidationResult = {
  accepted: GeneratedExerciseV1[]
  rejected: ExerciseValidationIssue[]
}

/**
 * Domain validation after Zod schema parse.
 * Rejects inconsistent options/answers, ungrounded reading Qs, and near-dupes.
 */
export function validateGeneratedExercises(
  exercises: GeneratedExerciseV1[],
  options?: { sourceContent?: string },
): ExerciseValidationResult {
  const accepted: GeneratedExerciseV1[] = []
  const rejected: ExerciseValidationIssue[] = []
  const seenFingerprints = new Set<string>()
  const source = options?.sourceContent ?? ''

  exercises.forEach((exercise, index) => {
    const issues = validateOne(exercise, source)
    if (issues.length > 0) {
      for (const issue of issues) {
        rejected.push({ index, code: issue.code, message: issue.message })
      }
      return
    }

    const fingerprint = exerciseFingerprint(exercise)
    if (seenFingerprints.has(fingerprint)) {
      rejected.push({
        index,
        code: 'duplicate_exercise',
        message: 'Near-duplicate exercise skipped',
      })
      return
    }
    seenFingerprints.add(fingerprint)
    accepted.push(exercise)
  })

  return { accepted, rejected }
}

function validateOne(
  exercise: GeneratedExerciseV1,
  sourceContent: string,
): Array<{ code: string; message: string }> {
  const issues: Array<{ code: string; message: string }> = []

  if (!exercise.explanation.trim()) {
    issues.push({ code: 'empty_explanation', message: 'Explanation is empty' })
  }

  if (exercise.payload.type !== exercise.type) {
    issues.push({
      code: 'payload_type_mismatch',
      message: `payload.type ${exercise.payload.type} !== exercise.type ${exercise.type}`,
    })
  }

  if (exercise.groundedInSource || exercise.type === 'true_false' || looksReading(exercise)) {
    if (exercise.groundedInSource) {
      const evidence = exercise.evidenceText?.trim() ?? ''
      if (!evidence) {
        issues.push({
          code: 'missing_evidence',
          message: 'Source-grounded exercise lacks evidenceText',
        })
      } else if (sourceContent && !sourceContainsEvidence(sourceContent, evidence)) {
        issues.push({
          code: 'ungrounded_evidence',
          message: 'evidenceText is not found in the source',
        })
      }
    }
  }

  switch (exercise.payload.type) {
    case 'flashcard':
      if (!exercise.payload.front.trim() || !exercise.payload.back.trim()) {
        issues.push({ code: 'empty_flashcard', message: 'Flashcard sides must be non-empty' })
      }
      break
    case 'multiple_choice': {
      const { options, correctIndex } = exercise.payload
      if (correctIndex < 0 || correctIndex >= options.length) {
        issues.push({ code: 'bad_correct_index', message: 'correctIndex out of range' })
      }
      const normalized = options.map((o) => o.trim().toLowerCase())
      if (new Set(normalized).size !== options.length) {
        issues.push({ code: 'duplicate_options', message: 'MCQ options must be unique' })
      }
      // Multiple options equal to the correct answer wording → ambiguous.
      const correct = options[correctIndex]?.trim().toLowerCase()
      if (correct && normalized.filter((o) => o === correct).length > 1) {
        issues.push({
          code: 'multiple_correct',
          message: 'MCQ appears to have multiple correct options',
        })
      }
      break
    }
    case 'cloze': {
      const blank = exercise.payload.sentenceWithBlank
      if (!/_{2,}|\{\{blank\}\}|\[\s*\]/i.test(blank)) {
        issues.push({
          code: 'missing_blank',
          message: 'Cloze sentence must include a blank marker (____)',
        })
      }
      if (exercise.payload.acceptedAnswers.every((a) => !a.trim())) {
        issues.push({ code: 'empty_answers', message: 'Cloze needs accepted answers' })
      }
      break
    }
    case 'true_false':
      if (!exercise.payload.statement.trim()) {
        issues.push({ code: 'empty_statement', message: 'True/false statement empty' })
      }
      break
    case 'short_answer':
      if (!exercise.payload.prompt.trim()) {
        issues.push({ code: 'empty_prompt', message: 'Short answer prompt empty' })
      }
      if (exercise.payload.acceptedAnswers.every((a) => !a.trim())) {
        issues.push({ code: 'empty_answers', message: 'Short answer needs accepted answers' })
      }
      break
    default: {
      const _exhaustive: never = exercise.payload
      void _exhaustive
    }
  }

  return issues
}

function looksReading(exercise: GeneratedExerciseV1): boolean {
  return (
    exercise.skill.toLowerCase().includes('reading') ||
    exercise.targetConceptLabels.some((l) => /reading|comprehension/i.test(l))
  )
}

function sourceContainsEvidence(source: string, evidence: string): boolean {
  const normSource = collapseWs(source).toLowerCase()
  const normEvidence = collapseWs(evidence).toLowerCase()
  if (normEvidence.length < 8) {
    return normSource.includes(normEvidence)
  }
  // Allow minor whitespace differences; require a substantial substring match.
  if (normSource.includes(normEvidence)) return true
  const window = Math.min(40, normEvidence.length)
  const snippet = normEvidence.slice(0, window)
  return normSource.includes(snippet)
}

function collapseWs(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function exerciseFingerprint(exercise: GeneratedExerciseV1): string {
  const core = [
    exercise.type,
    exercise.prompt.trim().toLowerCase(),
    JSON.stringify(exercise.payload).toLowerCase(),
  ].join('|')
  return core
}

export function assertHasAcceptedExercises(result: ExerciseValidationResult): void {
  if (result.accepted.length === 0) {
    throw new AppError(
      'no_valid_exercises',
      `No valid exercises after validation (${result.rejected.length} rejected).`,
    )
  }
}
