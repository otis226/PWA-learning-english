import type { ZodTypeAny, z } from 'zod'
import { AppError } from '../../shared/errors'

export type ParseSuccess<T> = {
  success: true
  data: T
}

export type ParseFailure = {
  success: false
  error: AppError
  issues: string[]
}

export type SafeParseResult<T> = ParseSuccess<T> | ParseFailure

export function safeParseWithSchema<TSchema extends ZodTypeAny>(
  schema: TSchema,
  value: unknown,
  code = 'validation_failed',
): SafeParseResult<z.infer<TSchema>> {
  const result = schema.safeParse(value)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const issues = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)'
    return `${path}: ${issue.message}`
  })
  return {
    success: false,
    error: new AppError(code, issues.join('; ') || 'Validation failed'),
    issues,
  }
}

export function parseOrThrow<TSchema extends ZodTypeAny>(
  schema: TSchema,
  value: unknown,
  code = 'validation_failed',
): z.infer<TSchema> {
  const parsed = safeParseWithSchema(schema, value, code)
  if (!parsed.success) {
    throw parsed.error
  }
  return parsed.data
}
