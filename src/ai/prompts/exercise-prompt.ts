import type { LearningGoal } from '../../db/schema/types'
import {
  EXERCISE_PROMPT_VERSION,
  EXERCISE_SCHEMA_VERSION,
  PLAN_PROMPT_VERSION,
} from '../schemas/exercises-v1'
import type { ChatMessage } from '../providers/openai-compatible/chat-client'

export { EXERCISE_PROMPT_VERSION, PLAN_PROMPT_VERSION }

export function buildExercisePlanMessages(input: {
  learningGoal: LearningGoal
  packTitle: string
  concepts: Array<{ label: string; kind: string; definition?: string | null }>
  sourceExcerpt: string
}): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You plan English practice exercises for a learning pack.',
        'Choose exercise types that fit each concept (flashcard, multiple_choice, cloze, true_false, short_answer).',
        'Respond with JSON only. schemaVersion must be "exercise-plan.v1".',
        `Prompt version: ${PLAN_PROMPT_VERSION}.`,
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `Pack: ${input.packTitle}`,
        `Goal: ${input.learningGoal}`,
        'Concepts JSON:',
        JSON.stringify(input.concepts),
        'Source excerpt:',
        input.sourceExcerpt.slice(0, 4000),
        'Return { schemaVersion, items: [{ conceptLabel, exerciseType, skill, rationale }] }.',
        'Include 1-2 items per concept when useful; stay under 24 items total.',
      ].join('\n'),
    },
  ]
}

export function buildExerciseGenerationMessages(input: {
  learningGoal: LearningGoal
  packTitle: string
  planItems: Array<{
    conceptLabel: string
    exerciseType: string
    skill: string
  }>
  concepts: Array<{
    label: string
    kind: string
    definition?: string | null
    evidenceText?: string | null
  }>
  sourceContent: string
}): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You generate English learning exercises.',
        'Respond with JSON only matching the schema.',
        `schemaVersion must be "${EXERCISE_SCHEMA_VERSION}".`,
        'payload.type must match the exercise type.',
        'For multiple_choice: exactly one correct option; correctIndex must be valid; options must be unique.',
        'For cloze: sentenceWithBlank must contain "____" or a blank marker; acceptedAnswers non-empty.',
        'For reading/source-grounded items set groundedInSource true and provide evidenceText from the source.',
        'Do not ask factual reading questions that cannot be answered from the source.',
        'Every exercise needs a clear explanation.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `Pack: ${input.packTitle}`,
        `Goal: ${input.learningGoal}`,
        'Plan:',
        JSON.stringify(input.planItems),
        'Concepts:',
        JSON.stringify(input.concepts),
        'Source:',
        '---',
        input.sourceContent.slice(0, 6000),
        '---',
        'Return { schemaVersion, exercises: [...] } with one exercise per plan item when possible.',
      ].join('\n'),
    },
  ]
}
