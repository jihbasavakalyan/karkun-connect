/**
 * Shared adapter types (KC-004 Sprint 1.5).
 *
 * Purpose: Identity, availability, scope, and result envelopes for all adapters.
 * Ownership: Conversation Layer owns adapter contracts; repositories remain authoritative.
 * Future extensions: Concrete adapters live outside conversation/ and wrap existing repositories.
 */

import type { AdapterError } from './AdapterErrors'

/** Adapter identity for registry lookup. */
export type AdapterId =
  | 'campaign'
  | 'karkun'
  | 'meeting'
  | 'compliance'
  | 'report'
  | 'repository'

/** Availability posture consumed by Conversation Layer only. */
export type AdapterAvailability =
  | 'available'
  | 'readonly'
  | 'offline'
  | 'unavailable'
  | 'degraded'

export type AdapterScope = {
  ruknId?: string
  campaignId?: string
  karkunId?: string
  sessionId?: string
}

export type AdapterResult<T> =
  | { ok: true; data: T; availability: AdapterAvailability }
  | { ok: false; error: AdapterError; availability: AdapterAvailability }

export function adapterOk<T>(
  data: T,
  availability: AdapterAvailability = 'available',
): AdapterResult<T> {
  return { ok: true, data, availability }
}
