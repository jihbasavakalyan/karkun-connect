/**
 * Shared helpers for concrete repository adapters (KC-005 Sprint 2.1).
 *
 * Purpose: Map RepositoryResult into AdapterResult without leaking exceptions.
 * Ownership: Runtime adapters only — never imported by conversation modules.
 */

import {
  adapterOk,
  mapRepositoryFailureResult,
  type AdapterAvailability,
  type AdapterId,
  type AdapterResult,
} from '@/conversation/adapters'
import type { RepositoryResult } from '@/repositories/errors'

export function resolveAdapterAvailability(): AdapterAvailability {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'offline'
  }
  return 'available'
}

export function mapRepositoryResult<TData, TMapped>(
  adapterId: AdapterId,
  result: RepositoryResult<TData>,
  map: (data: TData) => TMapped,
): AdapterResult<TMapped> {
  const availability = resolveAdapterAvailability()
  if (availability === 'offline') {
    return mapRepositoryFailureResult(
      adapterId,
      'Offline',
      'Repository is offline.',
      'offline',
    )
  }
  if (!result.ok) {
    return mapRepositoryFailureResult(
      adapterId,
      result.error.code,
      result.error.message,
      result.error.code === 'StorageFailure' ? 'unavailable' : availability,
    )
  }
  try {
    return adapterOk(map(result.data), availability)
  } catch {
    return mapRepositoryFailureResult(
      adapterId,
      'Unexpected',
      'Adapter mapping failed.',
      'degraded',
    )
  }
}
