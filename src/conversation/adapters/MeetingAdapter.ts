/**
 * Meeting repository adapter contract (KC-004 Sprint 1.5).
 *
 * Purpose: Translate meeting / execution reads into conversation-safe meeting refs.
 * Dependencies: Implementations wrap ExecutionRepository (and related stores).
 * Capabilities: canRead required; supportsHistory for meeting history; canWrite optional for requests.
 * Supported operations: meeting lookup, history, create request contracts, follow-up lookup.
 * Future extensions: Create meeting request remains a contract — write path stays in existing services.
 */

import type { ConversationMeetingRef } from '../ConversationContext'
import type { RepositoryAdapter } from './AdapterCapabilities'
import type { AdapterResult, AdapterScope } from './AdapterTypes'

export type AdapterMeetingHistoryEntry = ConversationMeetingRef & {
  outcome?: string
  recordedAt?: number
}

export type AdapterFollowUp = {
  karkunId: string
  followUpAt?: string
  label?: string
  meetingId?: string
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
 * MeetingAdapter — lookup, history, create request contracts, follow-up lookup.
 */
export interface MeetingAdapter extends RepositoryAdapter {
  readonly adapterId: 'meeting'
  lookupMeetings(scope: AdapterScope): AdapterResult<readonly ConversationMeetingRef[]>
  readMeetingHistory(
    karkunId: string,
    scope?: AdapterScope,
  ): AdapterResult<readonly AdapterMeetingHistoryEntry[]>
  /** Contract only — does not implement business validation or persistence here. */
  createMeetingRequest(
    request: AdapterCreateMeetingRequest,
  ): AdapterResult<AdapterCreateMeetingResponse>
  lookupFollowUps(scope: AdapterScope): AdapterResult<readonly AdapterFollowUp[]>
}
