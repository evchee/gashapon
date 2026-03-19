import { EXIT, type ExitCode } from './exit-codes.js'

export interface StructuredErrorShape {
  success: false
  error: {
    code: string
    message: string
    suggestions: string[]
    retryable: boolean
  }
}

export class StructuredError extends Error {
  readonly exitCode: ExitCode
  readonly code: string
  readonly suggestions: string[]
  readonly retryable: boolean

  constructor(opts: {
    code: string
    message: string
    exitCode?: ExitCode
    suggestions?: string[]
    retryable?: boolean
  }) {
    super(opts.message)
    this.code = opts.code
    this.exitCode = opts.exitCode ?? EXIT.FAILURE
    this.suggestions = opts.suggestions ?? []
    this.retryable = opts.retryable ?? false
  }

  toJSON(): StructuredErrorShape {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        suggestions: this.suggestions,
        retryable: this.retryable,
      },
    }
  }
}

export function notFound(resource: string, suggestions: string[] = []): StructuredError {
  return new StructuredError({
    code: 'NOT_FOUND',
    message: `${resource} not found`,
    exitCode: EXIT.NOT_FOUND,
    suggestions,
  })
}

export function conflict(resource: string, suggestions: string[] = []): StructuredError {
  return new StructuredError({
    code: 'CONFLICT',
    message: `${resource} already exists`,
    exitCode: EXIT.CONFLICT,
    suggestions,
  })
}

export function usageError(message: string, suggestions: string[] = []): StructuredError {
  return new StructuredError({
    code: 'USAGE_ERROR',
    message,
    exitCode: EXIT.USAGE,
    suggestions,
  })
}

export function upstreamError(message: string, retryable = true): StructuredError {
  return new StructuredError({
    code: 'UPSTREAM_ERROR',
    message,
    exitCode: EXIT.UPSTREAM,
    retryable,
  })
}

export function timeoutError(message: string): StructuredError {
  return new StructuredError({
    code: 'TIMEOUT',
    message,
    exitCode: EXIT.TIMEOUT,
    retryable: true,
  })
}
