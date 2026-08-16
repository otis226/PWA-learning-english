import { z } from 'zod'
import { aiProviderProfileSchema } from '../../ai/schemas/provider-profile'

export const EXPORT_FORMAT = 'pwa-learning-english-export' as const
/** RC1 full learning-state export. */
export const EXPORT_SCHEMA_VERSION = 2 as const

export const appSettingsExportSchema = z.object({
  activeProviderProfileId: z.string().nullable(),
  updatedAt: z.string().datetime(),
  lastMeaningfulChangeAt: z.string().datetime().nullable().optional(),
  lastExportAt: z.string().datetime().nullable().optional(),
})

const generationProvenanceSchema = z.object({
  providerProfileId: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  schemaVersion: z.string(),
  sourceContentHash: z.string(),
  generatedAt: z.string(),
  strategy: z.string().optional(),
})

const sourceExportSchema = z.object({
  id: z.string(),
  type: z.enum(['pasted_text', 'vocabulary_list', 'custom_topic']),
  title: z.string(),
  rawContent: z.string(),
  normalizedContent: z.string(),
  contentHash: z.string(),
  charCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const packExportSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  title: z.string(),
  learningGoal: z.enum([
    'vocabulary',
    'grammar',
    'prepositions',
    'collocations',
    'reading',
    'mixed',
    'custom',
  ]),
  customGoalText: z.string().optional(),
  status: z.enum(['draft', 'ready', 'archived']),
  estimatedCefr: z.string().nullable().optional(),
  learningObjectives: z.array(z.string()),
  skills: z.array(z.string()),
  conceptIds: z.array(z.string()),
  exerciseIds: z.array(z.string()),
  suggestedProgression: z.array(z.string()),
  analysisNotes: z.string().nullable().optional(),
  provenance: generationProvenanceSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

const conceptExportSchema = z.object({
  id: z.string(),
  identityKey: z.string(),
  canonicalLabel: z.string(),
  kind: z.enum([
    'vocabulary',
    'grammar',
    'preposition',
    'collocation',
    'reading',
    'other',
  ]),
  definition: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const occurrenceExportSchema = z.object({
  id: z.string(),
  conceptId: z.string(),
  sourceId: z.string(),
  packId: z.string(),
  evidenceText: z.string().nullable().optional(),
  contextNote: z.string().nullable().optional(),
  createdAt: z.string(),
})

const exerciseExportSchema = z.object({
  id: z.string(),
  packId: z.string(),
  sourceId: z.string(),
  type: z.enum([
    'flashcard',
    'multiple_choice',
    'cloze',
    'true_false',
    'short_answer',
  ]),
  skill: z.string(),
  targetConceptIds: z.array(z.string()),
  prompt: z.string(),
  payload: z.unknown(),
  explanation: z.string(),
  evidenceText: z.string().nullable().optional(),
  difficulty: z.string().nullable().optional(),
  provenance: generationProvenanceSchema,
  createdAt: z.string(),
})

const sessionExportSchema = z.object({
  id: z.string(),
  packId: z.string().nullable(),
  kind: z.enum(['practice', 'review']),
  status: z.enum(['in_progress', 'completed', 'abandoned']),
  exerciseIds: z.array(z.string()),
  currentIndex: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
  incorrectCount: z.number().int().nonnegative(),
  startedAt: z.string(),
  completedAt: z.string().nullable().optional(),
  updatedAt: z.string(),
})

const attemptExportSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  exerciseId: z.string(),
  packId: z.string().nullable(),
  conceptIds: z.array(z.string()),
  answer: z.unknown(),
  isCorrect: z.boolean().nullable(),
  score: z.number().nullable(),
  selfRating: z.enum(['again', 'hard', 'good', 'easy']).nullable().optional(),
  gradingMode: z.enum(['deterministic', 'self', 'ai', 'uncertain']),
  explanationShown: z.string().nullable().optional(),
  misconceptionTags: z.array(z.string()),
  responseTimeMs: z.number().nullable().optional(),
  createdAt: z.string(),
})

const mistakeExportSchema = z.object({
  id: z.string(),
  conceptId: z.string(),
  attemptId: z.string(),
  tag: z.string(),
  detail: z.string().nullable().optional(),
  createdAt: z.string(),
})

const masteryExportSchema = z.object({
  conceptId: z.string(),
  strength: z.number(),
  correctCount: z.number().int().nonnegative(),
  incorrectCount: z.number().int().nonnegative(),
  lastPracticedAt: z.string().nullable(),
  isWeak: z.boolean(),
  updatedAt: z.string(),
})

const fsrsStateSchema = z.object({
  due: z.string(),
  stability: z.number(),
  difficulty: z.number(),
  elapsed_days: z.number(),
  scheduled_days: z.number(),
  learning_steps: z.number(),
  reps: z.number(),
  lapses: z.number(),
  state: z.number(),
  last_review: z.string().nullable().optional(),
})

const reviewCardExportSchema = z.object({
  id: z.string(),
  conceptId: z.string(),
  preferredExerciseId: z.string().nullable().optional(),
  fsrs: fsrsStateSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

const reviewLogExportSchema = z.object({
  id: z.string(),
  reviewCardId: z.string(),
  conceptId: z.string(),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  stateBefore: z.number(),
  stateAfter: z.number(),
  dueBefore: z.string(),
  dueAfter: z.string(),
  scheduledDays: z.number(),
  attemptId: z.string().nullable().optional(),
  createdAt: z.string(),
})

export const exportDataSchema = z.object({
  providerProfiles: z.array(aiProviderProfileSchema),
  appSettings: appSettingsExportSchema,
  sources: z.array(sourceExportSchema).default([]),
  learningPacks: z.array(packExportSchema).default([]),
  concepts: z.array(conceptExportSchema).default([]),
  conceptOccurrences: z.array(occurrenceExportSchema).default([]),
  exercises: z.array(exerciseExportSchema).default([]),
  studySessions: z.array(sessionExportSchema).default([]),
  attempts: z.array(attemptExportSchema).default([]),
  mistakeSignals: z.array(mistakeExportSchema).default([]),
  conceptMastery: z.array(masteryExportSchema).default([]),
  reviewCards: z.array(reviewCardExportSchema).default([]),
  reviewLogs: z.array(reviewLogExportSchema).default([]),
})

export const exportEnvelopeSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  schemaVersion: z.literal(EXPORT_SCHEMA_VERSION),
  exportedAt: z.string().datetime(),
  data: exportDataSchema,
})

export type ExportEnvelope = z.infer<typeof exportEnvelopeSchema>

export type ImportValidationResult =
  | {
      ok: true
      envelope: ExportEnvelope
      summary: {
        providerProfileCount: number
        sourceCount: number
        packCount: number
        exerciseCount: number
        attemptCount: number
        reviewCardCount: number
        activeProviderProfileId: string | null
      }
    }
  | {
      ok: false
      issues: string[]
    }
