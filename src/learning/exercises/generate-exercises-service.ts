import {
  EXERCISE_PROMPT_VERSION,
  EXERCISE_SCHEMA_VERSION,
  exercisePlanV1JsonSchema,
  exercisePlanV1Schema,
  generatedExerciseBatchV1JsonSchema,
  generatedExerciseBatchV1Schema,
  PLAN_PROMPT_VERSION,
  type GeneratedExerciseV1,
} from '../../ai/schemas/exercises-v1'
import {
  buildExerciseGenerationMessages,
  buildExercisePlanMessages,
} from '../../ai/prompts/exercise-prompt'
import { runStructuredOutput } from '../../ai/gateway/structured-output'
import type { AIGateway, ActiveAIConfig } from '../../ai/gateway/types'
import type { ProviderSettingsService } from '../../features/settings/provider-settings-service'
import type {
  ConceptRecord,
  ExerciseRecord,
  GenerationProvenance,
  LearningPackRecord,
  SourceRecord,
} from '../../db/schema/types'
import {
  ConceptRepository,
  ExerciseRepository,
  LearningPackRepository,
  SourceRepository,
} from '../../db/repositories/learning-repositories'
import type { AppSettingsRepository } from '../../db/repositories/app-settings-repository'
import { createId } from '../../shared/ids'
import { AppError } from '../../shared/errors'
import { normalizeConceptLabel } from '../concepts/concept-identity'
import {
  assertHasAcceptedExercises,
  validateGeneratedExercises,
} from './validate-exercises'

export type GenerateExercisesResult = {
  pack: LearningPackRecord
  exercises: ExerciseRecord[]
  rejectedCount: number
  planStrategy: string
  generateStrategy: string
}

export class GenerateExercisesService {
  constructor(
    private readonly sources: SourceRepository,
    private readonly packs: LearningPackRepository,
    private readonly concepts: ConceptRepository,
    private readonly exercises: ExerciseRepository,
    private readonly settings: AppSettingsRepository,
    private readonly providerSettings: ProviderSettingsService,
    private readonly gateway: AIGateway,
  ) {}

  async generateForPack(
    packId: string,
    signal?: AbortSignal,
  ): Promise<GenerateExercisesResult> {
    const config = await this.requireActiveConfig()
    const pack = await this.packs.getById(packId)
    if (!pack) {
      throw new AppError('pack_not_found', 'Learning pack not found.')
    }
    const source = await this.sources.getById(pack.sourceId)
    if (!source) {
      throw new AppError('source_not_found', 'Source for pack not found.')
    }
    const concepts = await this.concepts.getMany(pack.conceptIds)
    if (concepts.length === 0) {
      throw new AppError('pack_needs_concepts', 'Add concepts before generating exercises.')
    }

    const planResult = await runStructuredOutput(
      (request) =>
        this.gateway.complete(
          config,
          {
            messages: request.messages,
            response_format: request.response_format,
            ...(request.temperature !== undefined
              ? { temperature: request.temperature }
              : {}),
          },
          signal,
        ),
      {
        schema: exercisePlanV1Schema,
        schemaName: 'exercise_plan_v1',
        jsonSchema: exercisePlanV1JsonSchema,
        messages: buildExercisePlanMessages({
          learningGoal: pack.learningGoal,
          packTitle: pack.title,
          concepts: concepts.map((c) => ({
            label: c.canonicalLabel,
            kind: c.kind,
            definition: c.definition,
          })),
          sourceExcerpt: source.normalizedContent,
        }),
        capabilities: config.capabilities,
        maxRepairAttempts: 1,
      },
    )
    if (!planResult.ok) {
      throw planResult.error
    }

    const genResult = await runStructuredOutput(
      (request) =>
        this.gateway.complete(
          config,
          {
            messages: request.messages,
            response_format: request.response_format,
            ...(request.temperature !== undefined
              ? { temperature: request.temperature }
              : {}),
          },
          signal,
        ),
      {
        schema: generatedExerciseBatchV1Schema,
        schemaName: 'exercises_v1',
        jsonSchema: generatedExerciseBatchV1JsonSchema,
        messages: buildExerciseGenerationMessages({
          learningGoal: pack.learningGoal,
          packTitle: pack.title,
          planItems: planResult.data.items.map((item) => ({
            conceptLabel: item.conceptLabel,
            exerciseType: item.exerciseType,
            skill: item.skill,
          })),
          concepts: concepts.map((c) => ({
            label: c.canonicalLabel,
            kind: c.kind,
            definition: c.definition,
          })),
          sourceContent: source.normalizedContent,
        }),
        capabilities: config.capabilities,
        maxRepairAttempts: 1,
      },
    )
    if (!genResult.ok) {
      throw genResult.error
    }

    const validated = validateGeneratedExercises(genResult.data.exercises, {
      sourceContent: source.normalizedContent,
      knownConceptLabels: concepts.map((c) => c.canonicalLabel),
    })
    assertHasAcceptedExercises(validated)

    const now = new Date().toISOString()
    const provenance: GenerationProvenance = {
      providerProfileId: config.providerProfileId,
      model: config.model,
      promptVersion: `${PLAN_PROMPT_VERSION}+${EXERCISE_PROMPT_VERSION}`,
      schemaVersion: EXERCISE_SCHEMA_VERSION,
      sourceContentHash: source.contentHash,
      generatedAt: now,
      strategy: `${planResult.strategy}->${genResult.strategy}`,
    }

    const labelToConcept = buildLabelIndex(concepts)
    const exerciseRecords: ExerciseRecord[] = validated.accepted.map((item) =>
      toExerciseRecord({
        item,
        pack,
        source,
        labelToConcept,
        provenance,
        now,
      }),
    )

    const updatedPack: LearningPackRecord = {
      ...pack,
      exerciseIds: exerciseRecords.map((e) => e.id),
      status: 'ready',
      updatedAt: now,
    }

    await this.exercises.putMany(exerciseRecords)
    await this.packs.update(updatedPack)
    await this.settings.touchMeaningfulChange()

    return {
      pack: updatedPack,
      exercises: exerciseRecords,
      rejectedCount: validated.rejected.length,
      planStrategy: planResult.strategy,
      generateStrategy: genResult.strategy,
    }
  }

  private async requireActiveConfig(): Promise<ActiveAIConfig> {
    const config = await this.providerSettings.getActiveConfig()
    if (!config) {
      throw new AppError(
        'no_active_provider',
        'Configure an AI provider before generating exercises.',
      )
    }
    if (!config.hasCredential) {
      throw new AppError(
        'no_active_provider',
        'Add an API key before generating exercises.',
      )
    }
    return config
  }
}

function buildLabelIndex(concepts: ConceptRecord[]): Map<string, ConceptRecord> {
  const map = new Map<string, ConceptRecord>()
  for (const concept of concepts) {
    map.set(normalizeConceptLabel(concept.canonicalLabel), concept)
  }
  return map
}

function resolveTargetConceptIds(
  labels: string[],
  labelToConcept: Map<string, ConceptRecord>,
): string[] {
  const ids: string[] = []
  for (const label of labels) {
    const concept = labelToConcept.get(normalizeConceptLabel(label))
    if (!concept) {
      throw new AppError(
        'unresolved_target_concept',
        `Generated exercise target concept is not in this pack: ${label}`,
      )
    }
    ids.push(concept.id)
  }
  if (ids.length === 0) {
    throw new AppError(
      'unresolved_target_concept',
      'Generated exercise did not resolve any target concept.',
    )
  }
  return ids
}

function toExerciseRecord(input: {
  item: GeneratedExerciseV1
  pack: LearningPackRecord
  source: SourceRecord
  labelToConcept: Map<string, ConceptRecord>
  provenance: GenerationProvenance
  now: string
}): ExerciseRecord {
  const targetConceptIds = resolveTargetConceptIds(
    input.item.targetConceptLabels,
    input.labelToConcept,
  )

  return {
    id: createId('ex'),
    packId: input.pack.id,
    sourceId: input.source.id,
    type: input.item.type,
    skill: input.item.skill,
    targetConceptIds,
    prompt: input.item.prompt,
    payload: input.item.payload,
    explanation: input.item.explanation,
    evidenceText: input.item.evidenceText ?? null,
    difficulty: input.item.difficulty ?? null,
    provenance: input.provenance,
    createdAt: input.now,
  }
}
