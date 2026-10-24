/**
 * Errors the user may see. Code that throws them stays language-neutral: the UI turns the code
 * into a sentence in the current language (src/i18n).
 */
export type ErrorCode =
  | 'noOpenRoom'
  | 'roomNotFound'
  | 'roomCreateFailed'
  | 'joinFailed'
  | 'notAuthenticated'
  | 'sessionReadFailed'
  | 'signInFailed'
  | 'onlyCreatorReveals'
  | 'noSharedBoard'
  | 'bridgeExists'
  | 'invalidParent'
  | 'subgroupCannotNest'
  | 'parentCannotNest'
  | 'imageProcessingFailed'
  | 'webpUnsupported'
  | 'invalidJson'
  | 'notASession'
  | 'unsupportedSessionVersion'

export class AppError extends Error {
  readonly code: ErrorCode
  /** Technical detail appended to the message (e.g. the underlying error). */
  readonly detail: string | undefined

  constructor(code: ErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code)
    this.name = 'AppError'
    this.code = code
    this.detail = detail
  }
}

/** Exception texts raised by the database (supabase/migrations) that have a translated message. */
const DATABASE_ERRORS: Record<string, ErrorCode> = {
  'Room not found': 'roomNotFound',
  'Not authenticated': 'notAuthenticated',
  'A subgroup cannot contain subgroups': 'subgroupCannotNest',
  'A group with subgroups cannot become a subgroup': 'parentCannotNest',
}

/** The error code of an AppError or of a known database error; null for anything else. */
export function errorCodeOf(error: unknown): ErrorCode | null {
  if (error instanceof AppError) return error.code
  if (error instanceof Error) return DATABASE_ERRORS[error.message] ?? null
  return null
}
