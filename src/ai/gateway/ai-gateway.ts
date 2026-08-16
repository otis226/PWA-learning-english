import type { CredentialStore } from '../credentials/types'
import {
  OpenAICompatibleChatClient,
  type ChatCompletionRequest,
  type ChatCompletionResult,
} from '../providers/openai-compatible/chat-client'
import { AIRequestError } from '../providers/openai-compatible/errors'
import type { ActiveAIConfig, AIGateway, ConnectionTestResult } from './types'

export class DefaultAIGateway implements AIGateway {
  constructor(
    private readonly credentialStore: CredentialStore,
    private readonly fetchImpl: typeof fetch = fetch.bind(globalThis),
  ) {}

  async testConnection(
    config: ActiveAIConfig,
    signal?: AbortSignal,
  ): Promise<ConnectionTestResult> {
    try {
      const result = await this.createClient(config).testConnection(signal)
      return {
        ok: true,
        contentPreview: result.content.slice(0, 120),
      }
    } catch (error) {
      if (error instanceof AIRequestError) {
        return {
          ok: false,
          category: error.category,
          message: error.message,
          providerMessage: error.providerMessage,
          status: error.status,
        }
      }
      return {
        ok: false,
        category: 'network_or_cors',
        message: 'Network or CORS blocked the request.',
        providerMessage: null,
        status: null,
      }
    }
  }

  async complete(
    config: ActiveAIConfig,
    request: Omit<ChatCompletionRequest, 'model'> & { model?: string },
    signal?: AbortSignal,
  ): Promise<ChatCompletionResult> {
    return this.createClient(config).complete(
      {
        ...request,
        model: request.model ?? config.model,
      },
      signal,
    )
  }

  private createClient(config: ActiveAIConfig): OpenAICompatibleChatClient {
    return new OpenAICompatibleChatClient({
      baseUrl: config.baseUrl,
      model: config.model,
      providerProfileId: config.providerProfileId,
      credentialStore: this.credentialStore,
      fetchImpl: this.fetchImpl,
    })
  }
}
