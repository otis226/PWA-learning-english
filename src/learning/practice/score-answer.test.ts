import { describe, expect, it } from 'vitest'
import type { ExerciseRecord } from '../../db/schema/types'
import { normalizeAnswerText, scoreAnswer } from './score-answer'

function baseExercise(partial: Partial<ExerciseRecord> & Pick<ExerciseRecord, 'payload' | 'type'>): ExerciseRecord {
  return {
    id: 'ex1',
    packId: 'p1',
    sourceId: 's1',
    skill: 'test',
    targetConceptIds: ['c1'],
    prompt: 'q',
    explanation: 'because',
    provenance: {
      providerProfileId: 'prov',
      model: 'm',
      promptVersion: 'v',
      schemaVersion: 'v',
      sourceContentHash: 'h',
      generatedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    ...partial,
  }
}

describe('scoreAnswer', () => {
  it('scores MCQ and true/false deterministically', () => {
    const mcq = baseExercise({
      type: 'multiple_choice',
      payload: {
        type: 'multiple_choice',
        question: 'Q?',
        options: ['a', 'b', 'c'],
        correctIndex: 1,
      },
    })
    expect(scoreAnswer({ exercise: mcq, answer: 1 }).isCorrect).toBe(true)
    expect(scoreAnswer({ exercise: mcq, answer: 0 }).isCorrect).toBe(false)

    const tf = baseExercise({
      type: 'true_false',
      payload: { type: 'true_false', statement: 'S', correct: false },
    })
    expect(scoreAnswer({ exercise: tf, answer: false }).isCorrect).toBe(true)
  })

  it('normalizes cloze answers', () => {
    const cloze = baseExercise({
      type: 'cloze',
      payload: {
        type: 'cloze',
        sentenceWithBlank: 'I stayed home ____ the rain.',
        acceptedAnswers: ['despite', 'in spite of'],
      },
    })
    expect(scoreAnswer({ exercise: cloze, answer: '  Despite ' }).isCorrect).toBe(true)
    expect(scoreAnswer({ exercise: cloze, answer: 'because' }).isCorrect).toBe(false)
  })

  it('flashcard requires explicit self-rating', () => {
    const card = baseExercise({
      type: 'flashcard',
      payload: { type: 'flashcard', front: 'f', back: 'b' },
    })
    expect(scoreAnswer({ exercise: card, answer: null }).gradingMode).toBe('self')
    expect(scoreAnswer({ exercise: card, answer: null, selfRating: 'good' }).isCorrect).toBe(
      true,
    )
    expect(scoreAnswer({ exercise: card, answer: null, selfRating: 'again' }).isCorrect).toBe(
      false,
    )
  })

  it('short answer matches deterministically before AI', () => {
    const sa = baseExercise({
      type: 'short_answer',
      payload: {
        type: 'short_answer',
        prompt: 'Use despite',
        acceptedAnswers: ['Despite the rain, we went out.'],
        allowAiGrade: true,
      },
    })
    const hit = scoreAnswer({
      exercise: sa,
      answer: 'despite the rain, we went out.',
    })
    expect(hit.isCorrect).toBe(true)
    expect(hit.needsAiGrade).toBe(false)

    const miss = scoreAnswer({ exercise: sa, answer: 'something else entirely' })
    expect(miss.needsAiGrade).toBe(true)
  })

  it('documents normalization', () => {
    expect(normalizeAnswerText('  A  B ')).toBe('a b')
  })
})
