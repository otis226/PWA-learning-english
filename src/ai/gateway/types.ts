import type { AIProviderCapabilities } from '../schemas/capabilities'
import type { ChatCompletionRequest, ChatCompletionResult } from '../providers/openai-compatible/chat-client'
import type { AIErrorCategory } from '../providers/openai-compatible/errors'

export type ActiveAIConfig = {
  providerProfileId: string
  displayName: string
  baseUrl: string
  model: string
  protocol: 'chat_completions'
  capabilities: AIProviderCapabilities
  hasCredential: boolean
  credentialPersistence: 'session' | 'remember' | null
}

export type ConnectionTestResult =
  | {
      ok: true
      contentPreview: string
    }
  | {
      ok: false
      category: AIErrorCategory
      message: string
      providerMessage: string | null
      status: number | null
    }

export interface AIGateway {
  testConnection(config: ActiveAIConfig, signal?: AbortSignal): Promise<ConnectionTestResult>
  complete(
    config: ActiveAIConfig,
    request: Omit<ChatCompletionRequest, 'model'> & { model?: string },
    signal?: AbortSignal,
  ): Promise<ChatCompletionResult>
}
