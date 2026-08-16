import { z } from 'zod'

export const EXERCISE_SCHEMA_VERSION = 'exercises.v1' as const
export const EXERCISE_PROMPT_VERSION = 'exercise-prompt.v1' as const
export const PLAN_PROMPT_VERSION = 'plan-prompt.v1' as const

export const exercisePlanItemSchema = z.object({
  conceptLabel: z.string().min(1).max(200),
  exerciseType: z.enum([
    'flashcard',
    'multiple_choice',
    'cloze',
    'true_false',
    'short_answer',
  ]),
  skill: z.string().min(1).max(80),
  rationale: z.string().max(300).optional().nullable(),
})

export const exercisePlanV1Schema = z.object({
  schemaVersion: z.literal('exercise-plan.v1'),
  items: z.array(exercisePlanItemSchema).min(1).max(30),
})

export type ExercisePlanV1 = z.infer<typeof exercisePlanV1Schema>

const flashcardPayload = z.object({
  type: z.literal('flashcard'),
  front: z.string().min(1).max(500),
  back: z.string().min(1).max(1000),
})

const mcqPayload = z.object({
  type: z.literal('multiple_choice'),
  question: z.string().min(1).max(800),
  options: z.array(z.string().min(1).max(300)).min(2).max(6),
  correctIndex: z.number().int().min(0),
})

const clozePayload = z.object({
  type: z.literal('cloze'),
  sentenceWithBlank: z.string().min(1).max(800),
  acceptedAnswers: z.array(z.string().min(1).max(120)).min(1).max(8),
})

const tfPayload = z.object({
  type: z.literal('true_false'),
  statement: z.string().min(1).max(800),
  correct: z.boolean(),
})

const shortAnswerPayload = z.object({
  type: z.literal('short_answer'),
  prompt: z.string().min(1).max(800),
  acceptedAnswers: z.array(z.string().min(1).max(200)).min(1).max(12),
  allowAiGrade: z.boolean(),
})

export const generatedExerciseSchema = z.object({
  type: z.enum([
    'flashcard',
    'multiple_choice',
    'cloze',
    'true_false',
    'short_answer',
  ]),
  skill: z.string().min(1).max(80),
  targetConceptLabels: z.array(z.string().min(1).max(200)).min(1).max(4),
  prompt: z.string().min(1).max(800),
  payload: z.discriminatedUnion('type', [
    flashcardPayload,
    mcqPayload,
    clozePayload,
    tfPayload,
    shortAnswerPayload,
  ]),
  explanation: z.string().min(1).max(2000),
  evidenceText: z.string().max(2000).optional().nullable(),
  difficulty: z.string().max(40).optional().nullable(),
  groundedInSource: z.boolean().optional(),
})

export const generatedExerciseBatchV1Schema = z.object({
  schemaVersion: z.literal(EXERCISE_SCHEMA_VERSION),
  exercises: z.array(generatedExerciseSchema).min(1).max(40),
})

export type GeneratedExerciseV1 = z.infer<typeof generatedExerciseSchema>
export type GeneratedExerciseBatchV1 = z.infer<typeof generatedExerciseBatchV1Schema>

export const exercisePlanV1JsonSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'items'],
  properties: {
    schemaVersion: { type: 'string', const: 'exercise-plan.v1' },
    items: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['conceptLabel', 'exerciseType', 'skill'],
        properties: {
          conceptLabel: { type: 'string' },
          exerciseType: {
            type: 'string',
            enum: [
              'flashcard',
              'multiple_choice',
              'cloze',
              'true_false',
              'short_answer',
            ],
          },
          skill: { type: 'string' },
          rationale: { type: ['string', 'null'] },
        },
      },
    },
  },
}

export const generatedExerciseBatchV1JsonSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'exercises'],
  properties: {
    schemaVersion: { type: 'string', const: EXERCISE_SCHEMA_VERSION },
    exercises: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'type',
          'skill',
          'targetConceptLabels',
          'prompt',
          'payload',
          'explanation',
        ],
        properties: {
          type: {
            type: 'string',
            enum: [
              'flashcard',
              'multiple_choice',
              'cloze',
              'true_false',
              'short_answer',
            ],
          },
          skill: { type: 'string' },
          targetConceptLabels: { type: 'array', items: { type: 'string' } },
          prompt: { type: 'string' },
          payload: { type: 'object' },
          explanation: { type: 'string' },
          evidenceText: { type: ['string', 'null'] },
          difficulty: { type: ['string', 'null'] },
          groundedInSource: { type: 'boolean' },
        },
      },
    },
  },
}

export const shortAnswerGradeV1Schema = z.object({
  schemaVersion: z.literal('short-answer-grade.v1'),
  isCorrect: z.boolean().nullable(),
  score: z.number().min(0).max(1).nullable(),
  confidence: z.enum(['high', 'medium', 'low']),
  explanation: z.string().min(1).max(2000),
  misconceptionTags: z.array(z.string().max(80)).max(8),
})

export type ShortAnswerGradeV1 = z.infer<typeof shortAnswerGradeV1Schema>

export const shortAnswerGradeV1JsonSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schemaVersion',
    'isCorrect',
    'score',
    'confidence',
    'explanation',
    'misconceptionTags',
  ],
  properties: {
    schemaVersion: { type: 'string', const: 'short-answer-grade.v1' },
    isCorrect: { type: ['boolean', 'null'] },
    score: { type: ['number', 'null'] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    explanation: { type: 'string' },
    misconceptionTags: { type: 'array', items: { type: 'string' } },
  },
}

export const learnerExplanationV1Schema = z.object({
  schemaVersion: z.literal('learner-explanation.v1'),
  explanation: z.string().min(1).max(2500),
  misconceptionTags: z.array(z.string().max(80)).max(8),
})

export type LearnerExplanationV1 = z.infer<typeof learnerExplanationV1Schema>

export const learnerExplanationV1JsonSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'explanation', 'misconceptionTags'],
  properties: {
    schemaVersion: { type: 'string', const: 'learner-explanation.v1' },
    explanation: { type: 'string' },
    misconceptionTags: { type: 'array', items: { type: 'string' } },
  },
}
