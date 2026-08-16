import { describe, expect, it } from 'vitest'
import { sourceAnalysisV1Schema } from '../../ai/schemas/analysis-v1'
import { generatedExerciseBatchV1Schema } from '../../ai/schemas/exercises-v1'
import { validateGeneratedExercises } from '../exercises/validate-exercises'
import analysisVocab from '../../test/fixtures/golden/analysis-vocab.json'
import exercisesMixed from '../../test/fixtures/golden/exercises-mixed.json'

const SOURCE =
  'Despite the heavy rain, the team continued the match. Although fans left early, the players stayed focused.'

describe('golden learning quality fixtures', () => {
  it('analysis fixture is schema-valid and concept-rich', () => {
    const parsed = sourceAnalysisV1Schema.parse(analysisVocab)
    expect(parsed.concepts.length).toBeGreaterThanOrEqual(2)
    expect(parsed.concepts.every((c) => c.label && c.kind)).toBe(true)
  })

  it('exercise fixture passes domain quality gates', () => {
    const batch = generatedExerciseBatchV1Schema.parse(exercisesMixed)
    const result = validateGeneratedExercises(batch.exercises, { sourceContent: SOURCE })
    expect(result.rejected).toEqual([])
    expect(result.accepted.length).toBe(batch.exercises.length)

    const types = new Set(result.accepted.map((e) => e.type))
    expect(types.has('flashcard')).toBe(true)
    expect(types.has('multiple_choice')).toBe(true)
    expect(types.has('cloze')).toBe(true)
    expect(types.has('true_false')).toBe(true)

    for (const exercise of result.accepted) {
      expect(exercise.explanation.trim().length).toBeGreaterThan(0)
      if (exercise.payload.type === 'multiple_choice') {
        expect(exercise.payload.correctIndex).toBeLessThan(exercise.payload.options.length)
      }
    }
  })
})
