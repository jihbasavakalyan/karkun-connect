/**
 * Karkun repository adapter contract (KC-004 Sprint 1.5).
 *
 * Purpose: Translate karkun / connection / guidance reads into conversation-safe refs.
 * Dependencies: Implementations wrap KarkunRepository, ConnectionRepository, ExecutionRepository.
 * Capabilities: Read-focused lookup; assignment writes remain in existing workflows.
 * Supported operations: assigned karkuns, lookup, journey status, connection information.
 * Future extensions: Journey stage enrichment from GuidanceState without changing this contract.
 */

import type { ConversationKarkunRef } from '../ConversationContext'
import type { RepositoryAdapter } from './AdapterCapabilities'
import type { AdapterResult, AdapterScope } from './AdapterTypes'

export type AdapterJourneyStage =
  | 'not_started'
  | 'connected'
  | 'first_meeting'
  | 'follow_up'
  | 'deepening'
  | 'completed'
  | 'unknown'

export type AdapterAssignedKarkun = ConversationKarkunRef & {
  ruknId?: string
  connectionStatus?: string
}

export type AdapterJourneyState = {
  karkunId: string
  stage: AdapterJourneyStage
  lastUpdatedAt?: number
}

export type AdapterConnectionInfo = {
  karkunId: string
  ruknId?: string
  connectionStatus: string
  connectedAt?: number
  releasedAt?: number
}

/**
 * KarkunAdapter — assigned karkuns, lookup, journey status, connection information.
 */
export interface KarkunAdapter extends RepositoryAdapter {
  readonly adapterId: 'karkun'
  lookupKarkun(karkunId: string, scope?: AdapterScope): AdapterResult<ConversationKarkunRef>
  lookupAssignedKarkuns(scope: AdapterScope): AdapterResult<readonly AdapterAssignedKarkun[]>
  lookupJourneyStatus(
    karkunId: string,
    scope?: AdapterScope,
  ): AdapterResult<AdapterJourneyState>
  lookupConnectionInfo(
    karkunId: string,
    scope?: AdapterScope,
  ): AdapterResult<AdapterConnectionInfo>
}
