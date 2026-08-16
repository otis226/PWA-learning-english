import {
  ANALYSIS_PROMPT_VERSION,
  ANALYSIS_SCHEMA_VERSION,
  sourceAnalysisV1JsonSchema,
  sourceAnalysisV1Schema,
  type SourceAnalysisV1,
} from '../../ai/schemas/analysis-v1'
import { buildAnalysisMessages } from '../../ai/prompts/analysis-prompt'
import { runStructuredOutput } from '../../ai/gateway/structured-output'
import type { AIGateway, ActiveAIConfig } from '../../ai/gateway/types'
import type { ProviderSettingsService } from '../../features/settings/provider-settings-service'
import type {
  ConceptOccurrenceRecord,
  ConceptRecord,
  GenerationProvenance,
  LearningGoal,
  LearningPackRecord,
  SourceRecord,
  SourceType,
} from '../../db/schema/types'
import {
  ConceptOccurrenceRepository,
  ConceptRepository,
  LearningPackRepository,
  SourceRepository,
} from '../../db/repositories/learning-repositories'
import type { AppSettingsRepository } from '../../db/repositories/app-settings-repository'
import { buildConceptIdentityKey } from '../concepts/concept-identity'
import { hashContent } from '../source/content-hash'
import { normalizeSourceInput } from '../source/normalize-source'
import { createId } from '../../shared/ids'
import { AppError } from '../../shared/errors'

export type AnalyzeSourceInput = {
  type: SourceType
  content: string
  title?: string
  learningGoal: LearningGoal
  customGoalText?: string
  signal?: AbortSignal
}

export type AnalyzeSourceResult = {
  source: SourceRecord
  pack: LearningPackRecord
  concepts: ConceptRecord[]
  occurrences: ConceptOccurrenceRecord[]
  analysis: SourceAnalysisV1
  strategy: string
}

export class AnalyzeSourceService {
  constructor(
    private readonly sources: SourceRepository,
    private readonly packs: LearningPackRepository,
    private readonly concepts: ConceptRepository,
    private readonly occurrences: ConceptOccurrenceRepository,
    private readonly settings: AppSettingsRepository,
    private readonly providerSettings: ProviderSettingsService,
    private readonly gateway: AIGateway,
  ) {}

  async analyze(input: AnalyzeSourceInput): Promise<AnalyzeSourceResult> {
    const config = await this.requireActiveConfig()
    const normalized = normalizeSourceInput({
      type: input.type,
      title: input.title,
      content: input.content,
    })
    const contentHash = await hashContent(normalized.normalizedContent)
    const now = new Date().toISOString()

    const source: SourceRecord = {
      id: createId('source'),
      type: normalized.type,
      title: normalized.title,
      rawContent: normalized.rawContent,
      normalizedContent: normalized.normalizedContent,
      contentHash,
      charCount: normalized.charCount,
      createdAt: now,
      updatedAt: now,
    }

    const structured = await runStructuredOutput(
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
          input.signal,
        ),
      {
        schema: sourceAnalysisV1Schema,
        schemaName: 'source_analysis_v1',
        jsonSchema: sourceAnalysisV1JsonSchema,
        messages: buildAnalysisMessages({
          sourceType: input.type,
          learningGoal: input.learningGoal,
          customGoalText: input.customGoalText,
          content: normalized.normalizedContent,
        }),
        capabilities: config.capabilities,
        maxRepairAttempts: 1,
      },
    )

    if (!structured.ok) {
      throw structured.error
    }

    const analysis = structured.data
    const provenance: GenerationProvenance = {
      providerProfileId: config.providerProfileId,
      model: config.model,
      promptVersion: ANALYSIS_PROMPT_VERSION,
      schemaVersion: ANALYSIS_SCHEMA_VERSION,
      sourceContentHash: contentHash,
      generatedAt: now,
      strategy: structured.strategy,
    }

    const packId = createId('pack')
    const { conceptRecords, occurrenceRecords, conceptIds } =
      await this.materializeConcepts({
        analysis,
        sourceId: source.id,
        packId,
        now,
      })

    const pack: LearningPackRecord = {
      id: packId,
      sourceId: source.id,
      title: analysis.title || normalized.title,
      learningGoal: input.learningGoal,
      customGoalText: input.customGoalText?.trim() || undefined,
      status: 'draft',
      estimatedCefr: analysis.estimatedCefr ?? null,
      learningObjectives: analysis.learningObjectives,
      skills: analysis.skills,
      conceptIds,
      exerciseIds: [],
      suggestedProgression: analysis.suggestedProgression,
      analysisNotes: analysis.notes ?? null,
      provenance,
      createdAt: now,
      updatedAt: now,
    }

    // Persist only after full validation/materialization.
    await this.sources.put(source)
    await this.concepts.putMany(conceptRecords)
    await this.occurrences.putMany(occurrenceRecords)
    await this.packs.put(pack)
    await this.settings.touchMeaningfulChange()

    return {
      source,
      pack,
      concepts: conceptRecords,
      occurrences: occurrenceRecords,
      analysis,
      strategy: structured.strategy,
    }
  }

  async removeConceptFromPack(packId: string, conceptId: string): Promise<LearningPackRecord> {
    const pack = await this.packs.getById(packId)
    if (!pack) {
      throw new AppError('pack_not_found', 'Learning pack not found.')
    }
    if (pack.exerciseIds.length > 0) {
      throw new AppError(
        'pack_has_exercises',
        'Concepts can only be removed before exercises are generated.',
      )
    }
    const nextIds = pack.conceptIds.filter((id) => id !== conceptId)
    if (nextIds.length === 0) {
      throw new AppError('pack_needs_concepts', 'A pack must keep at least one concept.')
    }
    const updated: LearningPackRecord = {
      ...pack,
      conceptIds: nextIds,
      updatedAt: new Date().toISOString(),
    }
    await this.packs.update(updated)
    await this.settings.touchMeaningfulChange()
    return updated
  }

  async getPackDetail(packId: string): Promise<{
    pack: LearningPackRecord
    source: SourceRecord
    concepts: ConceptRecord[]
    occurrences: ConceptOccurrenceRecord[]
  } | null> {
    const pack = await this.packs.getById(packId)
    if (!pack) return null
    const source = await this.sources.getById(pack.sourceId)
    if (!source) return null
    const concepts = await this.concepts.getMany(pack.conceptIds)
    const occurrences = await this.occurrences.listByPack(packId)
    return { pack, source, concepts, occurrences }
  }

  private async materializeConcepts(input: {
    analysis: SourceAnalysisV1
    sourceId: string
    packId: string
    now: string
  }): Promise<{
    conceptRecords: ConceptRecord[]
    occurrenceRecords: ConceptOccurrenceRecord[]
    conceptIds: string[]
  }> {
    const conceptRecords: ConceptRecord[] = []
    const occurrenceRecords: ConceptOccurrenceRecord[] = []
    const conceptIds: string[] = []
    const seenInPack = new Set<string>()

    for (const item of input.analysis.concepts) {
      const identityKey = buildConceptIdentityKey({
        kind: item.kind,
        label: item.label,
        patternHint: item.patternHint,
      })
      if (seenInPack.has(identityKey)) {
        continue
      }
      seenInPack.add(identityKey)

      let concept = await this.concepts.getByIdentityKey(identityKey)
      if (!concept) {
        // Also check in-memory batch for same-run duplicates.
        concept = conceptRecords.find((c) => c.identityKey === identityKey)
      }
      if (!concept) {
        concept = {
          id: createId('concept'),
          identityKey,
          canonicalLabel: item.label.trim(),
          kind: item.kind,
          definition: item.definition ?? null,
          notes: item.contextNote ?? null,
          createdAt: input.now,
          updatedAt: input.now,
        }
        conceptRecords.push(concept)
      } else if (!conceptRecords.some((c) => c.id === concept!.id)) {
        // Refresh definition if empty.
        const refreshed: ConceptRecord = {
          ...concept,
          definition: concept.definition || item.definition || null,
          updatedAt: input.now,
        }
        conceptRecords.push(refreshed)
        concept = refreshed
      }

      conceptIds.push(concept.id)
      occurrenceRecords.push({
        id: createId('occ'),
        conceptId: concept.id,
        sourceId: input.sourceId,
        packId: input.packId,
        evidenceText: item.evidenceText ?? null,
        contextNote: item.contextNote ?? null,
        createdAt: input.now,
      })
    }

    if (conceptIds.length === 0) {
      throw new AppError('no_concepts', 'Analysis produced no usable concepts.')
    }

    return { conceptRecords, occurrenceRecords, conceptIds }
  }

  private async requireActiveConfig(): Promise<ActiveAIConfig> {
    const config = await this.providerSettings.getActiveConfig()
    if (!config) {
      throw new AppError(
        'no_active_provider',
        'Configure an AI provider in Settings before analyzing content.',
      )
    }
    if (!config.hasCredential) {
      throw new AppError(
        'no_active_provider',
        'Add an API key in AI Provider settings before analyzing content.',
      )
    }
    return config
  }
}
