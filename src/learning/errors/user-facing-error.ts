import { AIRequestError } from '../../ai/providers/openai-compatible/errors'
import { AppError, isAppError } from '../../shared/errors'

export type UserFacingError = {
  title: string
  message: string
  category: string
  retryable: boolean
}

export function toUserFacingError(error: unknown): UserFacingError {
  if (error instanceof AIRequestError) {
    return mapAiError(error)
  }
  if (isAppError(error)) {
    return mapAppError(error)
  }
  if (error instanceof Error) {
    return {
      title: 'Something went wrong',
      message: error.message,
      category: 'unknown',
      retryable: true,
    }
  }
  return {
    title: 'Something went wrong',
    message: 'An unexpected error occurred.',
    category: 'unknown',
    retryable: true,
  }
}

function mapAiError(error: AIRequestError): UserFacingError {
  switch (error.category) {
    case 'offline':
      return {
        title: 'You appear offline',
        message: 'AI generation needs a network connection. Local review still works offline.',
        category: error.category,
        retryable: true,
      }
    case 'network_or_cors':
      return {
        title: 'Provider unreachable',
        message:
          'Network or CORS blocked the request. Confirm the base URL allows browser requests from this origin.',
        category: error.category,
        retryable: true,
      }
    case 'unauthorized':
      return {
        title: 'API key rejected',
        message: 'The provider rejected the API key. Check the key in AI settings.',
        category: error.category,
        retryable: false,
      }
    case 'rate_limit':
      return {
        title: 'Rate limited',
        message: 'The provider rate-limited this request. Wait a moment and try again.',
        category: error.category,
        retryable: true,
      }
    case 'timeout':
      return {
        title: 'Request timed out',
        message: 'The provider took too long to respond. Try again or use a faster model.',
        category: error.category,
        retryable: true,
      }
    case 'aborted':
      return {
        title: 'Cancelled',
        message: 'The request was cancelled.',
        category: error.category,
        retryable: true,
      }
    case 'missing_credential':
      return {
        title: 'API key required',
        message: 'Save an API key in AI Provider settings before generating.',
        category: error.category,
        retryable: false,
      }
    case 'invalid_response':
      return {
        title: 'Invalid provider response',
        message: 'The provider returned a response we could not parse.',
        category: error.category,
        retryable: true,
      }
    case 'provider_error':
      return {
        title: 'Provider error',
        message:
          error.providerMessage ||
          error.message ||
          'The provider returned an error (model name may be wrong).',
        category: error.category,
        retryable: true,
      }
    default: {
      const _exhaustive: never = error.category
      return {
        title: 'AI request failed',
        message: String(_exhaustive),
        category: 'unknown',
        retryable: true,
      }
    }
  }
}

function mapAppError(error: AppError): UserFacingError {
  switch (error.code) {
    case 'invalid_json':
    case 'schema_mismatch':
    case 'structured_output_failed':
      return {
        title: 'Invalid AI output',
        message:
          'The model returned data that failed validation. Nothing was saved. Try again or adjust the model.',
        category: error.code,
        retryable: true,
      }
    case 'source_empty':
    case 'source_too_large':
      return {
        title: 'Check your input',
        message: error.message,
        category: error.code,
        retryable: false,
      }
    case 'no_active_provider':
      return {
        title: 'Configure AI first',
        message: error.message,
        category: error.code,
        retryable: false,
      }
    case 'no_valid_exercises':
      return {
        title: 'Exercises rejected',
        message: error.message,
        category: error.code,
        retryable: true,
      }
    default:
      return {
        title: 'Could not complete action',
        message: error.message,
        category: error.code,
        retryable: true,
      }
  }
}
