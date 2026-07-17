/**
 * Adapter error model (KC-004 Sprint 1.5).
 *
 * Purpose: Typed errors so Conversation modules never receive raw repository exceptions.
 * Dependencies: Adapter identity only — no repository imports.
 * Future extensions: Map additional repository codes without changing Conversation consumers.
 */

import type { AdapterAvailability, AdapterId, AdapterResult } from './AdapterTypes'

export type AdapterErrorCode =
  | 'RepositoryUnavailable'
  | 'PermissionDenied'
  | 'RecordNotFound'
  | 'ValidationFailed'
  | 'ConflictDetected'
  | 'Offline'
  | 'UnknownRepositoryError'

export type AdapterError = {
  code: AdapterErrorCode
  message: string
  adapterId: AdapterId
  /** Opaque cause reference — never a raw repository exception object. */
  causeCode?: string
}

export function adapterErr<T>(
  code: AdapterErrorCode,
  message: string,
  adapterId: AdapterId,
  availability: AdapterAvailability = 'unavailable',
  causeCode?: string,
): AdapterResult<T> {
  return {
    ok: false,
    error: { code, message, adapterId, causeCode },
    availability,
  }
}

/**
 * Map a repository-layer failure code into a typed adapter error.
 * Conversation modules never import repository error types — only string codes.
 */
export function mapRepositoryFailure(
  adapterId: AdapterId,
  repositoryErrorCode: string,
  message: string,
): AdapterError {
  return {
    code: mapErrorCode(repositoryErrorCode),
    message,
    adapterId,
    causeCode: repositoryErrorCode,
  }
}

export function mapRepositoryFailureResult<T>(
  adapterId: AdapterId,
  repositoryErrorCode: string,
  message: string,
  availability: AdapterAvailability = 'unavailable',
): AdapterResult<T> {
  const error = mapRepositoryFailure(adapterId, repositoryErrorCode, message)
  return adapterErr(error.code, error.message, adapterId, availability, error.causeCode)
}

function mapErrorCode(repositoryErrorCode: string): AdapterErrorCode {
  switch (repositoryErrorCode) {
    case 'NotFound':
      return 'RecordNotFound'
    case 'Duplicate':
      return 'ConflictDetected'
    case 'Validation':
      return 'ValidationFailed'
    case 'Permission':
      return 'PermissionDenied'
    case 'StorageFailure':
      return 'RepositoryUnavailable'
    case 'Offline':
      return 'Offline'
    case 'Unexpected':
    default:
      return 'UnknownRepositoryError'
  }
}
