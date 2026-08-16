import { describe, expect, it } from 'vitest'
import type { GeneratedExerciseV1 } from '../../ai/schemas/exercises-v1'
import { validateGeneratedExercises } from './validate-exercises'

const source =
  'Despite the heavy rain, the team continued the match. Although fans left early, the players stayed focused.'

function ex(partial: Partial<GeneratedExerciseV1> & Pick<GeneratedExerciseV1, 'type' | 'payload'>): GeneratedExerciseV1 {
  return {
    skill: 'grammar',
    targetConceptLabels: ['despite'],
    prompt: 'prompt',
    explanation: 'explanation',
    ...partial,
  }
}

describe('validateGeneratedExercises', () => {
  it('accepts well-formed closed forms', () => {
    const result = validateGeneratedExercises(
      [
        ex({
          type: 'multiple_choice',
          payload: {
            type: 'multiple_choice',
            question: 'Choose',
            options: ['despite', 'although', 'because'],
            correctIndex: 0,
          },
        }),
        ex({
          type: 'cloze',
          payload: {
            type: 'cloze',
            sentenceWithBlank: '____ the rain, we played.',
            acceptedAnswers: ['Despite'],
          },
        }),
      ],
      { sourceContent: source },
    )
    expect(result.accepted).toHaveLength(2)
  })

  it('rejects bad MCQ index, missing blank, ungrounded evidence, duplicates', () => {
    const result = validateGeneratedExercises(
      [
        ex({
          type: 'multiple_choice',
          payload: {
            type: 'multiple_choice',
            question: 'Q',
            options: ['a', 'b'],
            correctIndex: 5,
          },
        }),
        ex({
          type: 'cloze',
          payload: {
            type: 'cloze',
            sentenceWithBlank: 'no blank here',
            acceptedAnswers: ['x'],
          },
        }),
        ex({
          type: 'true_false',
          groundedInSource: true,
          evidenceText: 'This text is not in the source at all xyz',
          payload: { type: 'true_false', statement: 'Fans left early', correct: true },
        }),
        ex({
          type: 'flashcard',
          prompt: 'same',
          payload: { type: 'flashcard', front: 'f', back: 'b' },
        }),
        ex({
          type: 'flashcard',
          prompt: 'same',
          payload: { type: 'flashcard', front: 'f', back: 'b' },
        }),
      ],
      { sourceContent: source },
    )
    expect(result.accepted.length).toBeLessThan(3)
    expect(result.rejected.some((r) => r.code === 'bad_correct_index')).toBe(true)
    expect(result.rejected.some((r) => r.code === 'missing_blank')).toBe(true)
    expect(result.rejected.some((r) => r.code === 'ungrounded_evidence')).toBe(true)
    expect(result.rejected.some((r) => r.code === 'duplicate_exercise')).toBe(true)
  })

  it('rejects unresolved target concepts instead of accepting them', () => {
    const result = validateGeneratedExercises(
      [
        ex({
          type: 'flashcard',
          targetConceptLabels: ['not-a-pack-concept'],
          payload: { type: 'flashcard', front: 'f', back: 'b' },
        }),
      ],
      { sourceContent: source, knownConceptLabels: ['despite'] },
    )
    expect(result.accepted).toHaveLength(0)
    expect(result.rejected.some((r) => r.code === 'unresolved_target_concept')).toBe(true)
  })

  it('requires source evidence for reading exercises even when groundedInSource is omitted', () => {
    const missing = validateGeneratedExercises(
      [
        ex({
          type: 'true_false',
          skill: 'reading',
          payload: {
            type: 'true_false',
            statement: 'The team continued the match.',
            correct: true,
          },
        }),
      ],
      { sourceContent: source },
    )
    expect(missing.accepted).toHaveLength(0)
    expect(missing.rejected.some((r) => r.code === 'missing_evidence')).toBe(true)

    const ungrounded = validateGeneratedExercises(
      [
        ex({
          type: 'multiple_choice',
          skill: 'reading comprehension',
          groundedInSource: false,
          evidenceText: 'This fact is not in the source xyz',
          payload: {
            type: 'multiple_choice',
            question: 'What happened?',
            options: ['They continued', 'They stopped'],
            correctIndex: 0,
          },
        }),
      ],
      { sourceContent: source },
    )
    expect(ungrounded.accepted).toHaveLength(0)
    expect(ungrounded.rejected.some((r) => r.code === 'ungrounded_evidence')).toBe(true)

    const grounded = validateGeneratedExercises(
      [
        ex({
          type: 'true_false',
          skill: 'reading',
          evidenceText: 'Despite the heavy rain, the team continued',
          payload: {
            type: 'true_false',
            statement: 'The team continued the match.',
            correct: true,
          },
        }),
      ],
      { sourceContent: source },
    )
    expect(grounded.accepted).toHaveLength(1)
    expect(grounded.rejected).toEqual([])
  })
})
