/**
 * Meeting repository adapter contract (KC-004 Sprint 1.5).
 *
 * Purpose: Translate meeting / execution reads into conversation-safe meeting refs.
 * Repository dependency: Implementations wrap ExecutionRepository (and related stores).
 * Future extensions: Create meeting request is a contract only — write path stays in existing services.
 * Capability support: canRead required; canWrite optional for request contracts.
 * Error mapping: ValidationFailed for incomplete create requests; RecordNotFound for missing meetings.
 */

import type { ConversationMeetingRef } from '../ConversationContext'
import type { RepositoryAdapter } from './RepositoryAdapter'
import type { AdapterResult, AdapterScope } from './AdapterTypes'

export type AdapterMeetingHistoryEntry = ConversationMeetingRef & {
  outcome?: string
  recordedAt?: number
}

/**
 * Create-meeting request contract — structural intent only.
 * Does not validate business rules or persist; implementations may return deferred / readonly.
 */
export type AdapterCreateMeetingRequest = {
  karkunId: string
  scheduledAt?: string
  label?: string
  scope?: AdapterScope
}

export type AdapterCreateMeetingResponse = {
  accepted: boolean
  meetingId?: string
  deferred: boolean
  reason?: string
}

/**
 * MeetingAdapter — read meetings, history, and accept create requests (contract only).
 */
export interface MeetingAdapter extends RepositoryAdapter {
  readonly adapterId: 'meeting'
  readMeetings(scope: AdapterScope): AdapterResult<readonly ConversationMeetingRef[]>
  readMeetingHistory(
    karkunId: string,
    scope?: AdapterScope,
  ): AdapterResult<readonly AdapterMeetingHistoryEntry[]>
  /** Contract only — does not implement business validation or persistence here. */
  createMeetingRequest(
    request: AdapterCreateMeetingRequest,
  ): AdapterResult<AdapterCreateMeetingResponse>
}
