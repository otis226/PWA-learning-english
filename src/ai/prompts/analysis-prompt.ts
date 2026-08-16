import type { LearningGoal, SourceType } from '../../db/schema/types'
import { ANALYSIS_PROMPT_VERSION, ANALYSIS_SCHEMA_VERSION } from '../schemas/analysis-v1'
import type { ChatMessage } from '../providers/openai-compatible/chat-client'

export { ANALYSIS_PROMPT_VERSION }

export function buildAnalysisMessages(input: {
  sourceType: SourceType
  learningGoal: LearningGoal
  customGoalText?: string
  content: string
}): ChatMessage[] {
  const goalLine =
    input.learningGoal === 'custom'
      ? `Custom goal: ${input.customGoalText?.trim() || 'general English improvement'}`
      : `Learning goal: ${input.learningGoal}`

  return [
    {
      role: 'system',
      content: [
        'You are an English learning analyst for a local-first study app.',
        'Extract durable learning concepts from the learner material.',
        'Respond with JSON only matching the required schema.',
        `schemaVersion must be "${ANALYSIS_SCHEMA_VERSION}".`,
        'For source-derived items, include short evidenceText copied from the material when possible.',
        'Do not invent facts that are not supported by the material for reading items.',
        'Prefer fewer high-quality concepts over many weak ones.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `Source type: ${input.sourceType}`,
        goalLine,
        'Material:',
        '---',
        input.content,
        '---',
        'Return JSON with: schemaVersion, title, estimatedCefr, learningObjectives, skills, concepts[], suggestedProgression, notes.',
        'Each concept needs label, kind (vocabulary|grammar|preposition|collocation|reading|other), optional definition, evidenceText, contextNote, patternHint.',
      ].join('\n'),
    },
  ]
}
