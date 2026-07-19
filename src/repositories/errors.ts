/** KC-0058.2 — operator copy for permission denials (never expose backend codes). */
export const FRIENDLY_DATA_ACCESS_ERROR =
  'Unable to load additional information.\n\nPlease try again.\n\nIf the problem continues, contact the administrator.'

export type RepositoryErrorCode =
  | 'NotFound'
  | 'Duplicate'
  | 'Validation'
  | 'Permission'
  | 'StorageFailure'
  | 'Unexpected'

export type RepositoryError = {
  code: RepositoryErrorCode
  message: string
  cause?: unknown
}

export type RepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: RepositoryError }

export function repositoryOk<T>(data: T): RepositoryResult<T> {
  return { ok: true, data }
}

export function repositoryErr<T>(
  code: RepositoryErrorCode,
  message: string,
  cause?: unknown,
): RepositoryResult<T> {
  return { ok: false, error: { code, message, cause } }
}

export function unwrapRepository<T>(result: RepositoryResult<T>, fallback: T): T {
  return result.ok ? result.data : fallback
}

export function tryRepository<T>(work: () => T): RepositoryResult<T> {
  try {
    return repositoryOk(work())
  } catch (cause) {
    return repositoryErr('StorageFailure', 'Local storage operation failed.', cause)
  }
}
