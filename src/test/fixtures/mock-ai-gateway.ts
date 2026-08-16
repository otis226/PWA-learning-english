import type { AIGateway, ActiveAIConfig, ConnectionTestResult } from '../../ai/gateway/types'
import type {
  ChatCompletionRequest,
  ChatCompletionResult,
} from '../../ai/providers/openai-compatible/chat-client'
import analysisVocab from './golden/analysis-vocab.json'
import exercisesMixed from './golden/exercises-mixed.json'
import planMixed from './golden/plan-mixed.json'

/**
 * Deterministic gateway for CI: returns golden JSON based on prompt cues.
 */
export class MockAIGateway implements AIGateway {
  readonly calls: ChatCompletionRequest[] = []

  async testConnection(config: ActiveAIConfig): Promise<ConnectionTestResult> {
    void config
    return { ok: true, contentPreview: 'ok' }
  }

  async complete(
    config: ActiveAIConfig,
    request: Omit<ChatCompletionRequest, 'model'> & { model?: string },
  ): Promise<ChatCompletionResult> {
    void config
    this.calls.push({ ...request, model: request.model ?? 'mock-model' })
    const blob = request.messages.map((m) => m.content).join('\n').toLowerCase()

    let content: unknown = analysisVocab
    if (blob.includes('exercise-plan.v1') || blob.includes('plan english practice')) {
      content = planMixed
    } else if (
      blob.includes('exercises.v1') ||
      blob.includes('generate english learning exercises')
    ) {
      content = exercisesMixed
    } else if (blob.includes('short-answer-grade')) {
      content = {
        schemaVersion: 'short-answer-grade.v1',
        isCorrect: false,
        score: 0,
        confidence: 'high',
        explanation: 'Accepted answers require despite + noun phrase.',
        misconceptionTags: ['despite_plus_clause'],
      }
    } else if (blob.includes('learner-explanation')) {
      content = {
        schemaVersion: 'learner-explanation.v1',
        explanation: 'You used a full clause after despite; use a noun phrase instead.',
        misconceptionTags: ['despite_plus_clause'],
      }
    }

    return {
      content: JSON.stringify(content),
      raw: { mock: true },
    }
  }
}

export function mockActiveConfig(overrides?: Partial<ActiveAIConfig>): ActiveAIConfig {
  return {
    providerProfileId: 'prov_mock',
    displayName: 'Mock',
    baseUrl: 'https://mock.example/v1',
    model: 'mock-model',
    protocol: 'chat_completions',
    capabilities: {
      chatCompletions: true,
      responses: false,
      jsonSchema: false,
      jsonObject: true,
      streaming: false,
      vision: false,
      fileInput: false,
    },
    hasCredential: true,
    credentialPersistence: 'session',
    ...overrides,
  }
}
