import { z } from 'zod'

export const ANALYSIS_SCHEMA_VERSION = 'analysis.v1' as const
export const ANALYSIS_PROMPT_VERSION = 'analysis-prompt.v1' as const

export const analysisConceptSchema = z.object({
  label: z.string().min(1).max(200),
  kind: z.enum([
    'vocabulary',
    'grammar',
    'preposition',
    'collocation',
    'reading',
    'other',
  ]),
  definition: z.string().max(1000).optional().nullable(),
  evidenceText: z.string().max(2000).optional().nullable(),
  contextNote: z.string().max(1000).optional().nullable(),
  patternHint: z.string().max(200).optional().nullable(),
})

export const sourceAnalysisV1Schema = z.object({
  schemaVersion: z.literal(ANALYSIS_SCHEMA_VERSION),
  title: z.string().min(1).max(200),
  estimatedCefr: z.string().max(16).optional().nullable(),
  learningObjectives: z.array(z.string().min(1).max(300)).max(20),
  skills: z.array(z.string().min(1).max(80)).max(20),
  concepts: z.array(analysisConceptSchema).min(1).max(40),
  suggestedProgression: z.array(z.string().min(1).max(200)).max(12),
  notes: z.string().max(2000).optional().nullable(),
})

export type SourceAnalysisV1 = z.infer<typeof sourceAnalysisV1Schema>
export type AnalysisConceptV1 = z.infer<typeof analysisConceptSchema>

/** JSON Schema document for providers that support json_schema response_format. */
export const sourceAnalysisV1JsonSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schemaVersion',
    'title',
    'learningObjectives',
    'skills',
    'concepts',
    'suggestedProgression',
  ],
  properties: {
    schemaVersion: { type: 'string', const: ANALYSIS_SCHEMA_VERSION },
    title: { type: 'string' },
    estimatedCefr: { type: ['string', 'null'] },
    learningObjectives: { type: 'array', items: { type: 'string' } },
    skills: { type: 'array', items: { type: 'string' } },
    concepts: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'kind'],
        properties: {
          label: { type: 'string' },
          kind: {
            type: 'string',
            enum: [
              'vocabulary',
              'grammar',
              'preposition',
              'collocation',
              'reading',
              'other',
            ],
          },
          definition: { type: ['string', 'null'] },
          evidenceText: { type: ['string', 'null'] },
          contextNote: { type: ['string', 'null'] },
          patternHint: { type: ['string', 'null'] },
        },
      },
    },
    suggestedProgression: { type: 'array', items: { type: 'string' } },
    notes: { type: ['string', 'null'] },
  },
}
