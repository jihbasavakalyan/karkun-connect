/**
 * Shared repository adapter abstraction (KC-004 Sprint 1.5).
 *
 * Purpose: Common contract for capability reporting, availability, and error mapping.
 * Repository dependency: Implementations (outside conversation/) wrap existing repositories.
 * Future extensions: Batch and realtime capability flags without changing this surface.
 * Capability support: canRead / canWrite / offline / realtime / batch.
 * Error mapping: mapRepositoryFailure translates repository failure codes into AdapterError.
 */

import type {
  AdapterAvailability,
  AdapterCapabilities,
  AdapterError,
  AdapterErrorCode,
  AdapterId,
  AdapterResult,
} from './AdapterTypes'
import { adapterErr } from './AdapterTypes'

/**
 * Base repository adapter contract.
 *
 * Purpose: Every domain adapter reports identity, capabilities, and availability.
 * Ownership: Adapter implementations; Conversation Layer consumes via AdapterRegistry.
 */
export interface RepositoryAdapter {
  readonly adapterId: AdapterId
  getCapabilities(): AdapterCapabilities
  getAvailability(): AdapterAvailability
  canRead(): boolean
  canWrite(): boolean
  supportsOffline(): boolean
  supportsRealtime(): boolean
  supportsBatch(): boolean
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
    case 'Unexpected':
    default:
      return 'UnknownRepositoryError'
  }
}

/** Helper base for capability getters — concrete adapters compose this pattern. */
export abstract class BaseRepositoryAdapter implements RepositoryAdapter {
  abstract readonly adapterId: AdapterId

  protected availability: AdapterAvailability = 'unavailable'
  protected capabilities: AdapterCapabilities = {
    canRead: false,
    canWrite: false,
    supportsOffline: false,
    supportsRealtime: false,
    supportsBatch: false,
  }

  getCapabilities(): AdapterCapabilities {
    return { ...this.capabilities }
  }

  getAvailability(): AdapterAvailability {
    return this.availability
  }

  canRead(): boolean {
    return this.capabilities.canRead
  }

  canWrite(): boolean {
    return this.capabilities.canWrite
  }

  supportsOffline(): boolean {
    return this.capabilities.supportsOffline
  }

  supportsRealtime(): boolean {
    return this.capabilities.supportsRealtime
  }

  supportsBatch(): boolean {
    return this.capabilities.supportsBatch
  }

  protected setAvailability(availability: AdapterAvailability): void {
    this.availability = availability
  }

  protected setCapabilities(capabilities: AdapterCapabilities): void {
    this.capabilities = { ...capabilities }
  }
}
