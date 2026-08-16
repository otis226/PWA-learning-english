export class AppError extends Error {
  readonly code: string

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AppError'
    this.code = code
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
