/**
 * Repository adapter type definitions (KC-004 Sprint 1.5).
 *
 * Purpose: Capability, availability, and error contracts shared by all repository adapters.
 * Ownership: Conversation Layer owns adapter contracts; repositories remain authoritative.
 * Future extensions: Concrete adapters live outside conversation/ and wrap existing repositories.
 * Capability support: Describes what an adapter can do — does not execute operations.
 * Error mapping: Conversation never receives raw repository exceptions.
 */

/** Adapter identity for registry lookup. */
export type AdapterId =
  | 'campaign'
  | 'karkun'
  | 'meeting'
  | 'compliance'
  | 'report'
  | 'repository'

/**
 * Capability flags — describe support only; do not execute operations.
 *
 * Purpose: Let Knowledge Manager and Conversation Layer know what an adapter can offer.
 * Future extensions: Offline and realtime flags inform recovery and sync guidance.
 */
export type AdapterCapabilities = {
  canRead: boolean
  canWrite: boolean
  supportsOffline: boolean
  supportsRealtime: boolean
  supportsBatch: boolean
}

/** Availability posture consumed by Conversation Layer only. */
export type AdapterAvailability =
  | 'available'
  | 'unavailable'
  | 'offline'
  | 'readonly'
  | 'degraded'

/** Typed adapter errors — never leak raw repository exceptions. */
export type AdapterErrorCode =
  | 'RepositoryUnavailable'
  | 'PermissionDenied'
  | 'RecordNotFound'
  | 'ConflictDetected'
  | 'ValidationFailed'
  | 'UnknownRepositoryError'

export type AdapterError = {
  code: AdapterErrorCode
  message: string
  adapterId: AdapterId
  /** Opaque cause reference — never a raw repository exception object. */
  causeCode?: string
}

export type AdapterResult<T> =
  | { ok: true; data: T; availability: AdapterAvailability }
  | { ok: false; error: AdapterError; availability: AdapterAvailability }

export type AdapterScope = {
  ruknId?: string
  campaignId?: string
  karkunId?: string
  sessionId?: string
}

export function adapterOk<T>(
  data: T,
  availability: AdapterAvailability = 'available',
): AdapterResult<T> {
  return { ok: true, data, availability }
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

export const DEFAULT_READ_CAPABILITIES: AdapterCapabilities = {
  canRead: true,
  canWrite: false,
  supportsOffline: false,
  supportsRealtime: false,
  supportsBatch: false,
}

export const DEFAULT_READ_WRITE_CAPABILITIES: AdapterCapabilities = {
  canRead: true,
  canWrite: true,
  supportsOffline: false,
  supportsRealtime: false,
  supportsBatch: false,
}
