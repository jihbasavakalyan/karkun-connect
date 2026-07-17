/**
 * Karkun repository adapter contract (KC-004 Sprint 1.5).
 *
 * Purpose: Translate karkun / connection / guidance reads into conversation-safe refs.
 * Repository dependency: Implementations wrap KarkunRepository, ConnectionRepository, ExecutionRepository.
 * Future extensions: Journey stage enrichment from GuidanceState without changing this contract.
 * Capability support: Read-focused lookup; assignment writes remain in existing workflows.
 * Error mapping: RecordNotFound when karkun or assignment is missing.
 */

import type { ConversationKarkunRef } from '../ConversationContext'
import type { RepositoryAdapter } from './RepositoryAdapter'
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

/**
 * KarkunAdapter — lookup karkun, assigned workers, and journey state.
 *
 * Named "workers" in sprint contract; domain term remains Karkun.
 */
export interface KarkunAdapter extends RepositoryAdapter {
  readonly adapterId: 'karkun'
  lookupKarkun(karkunId: string, scope?: AdapterScope): AdapterResult<ConversationKarkunRef>
  lookupAssignedWorkers(scope: AdapterScope): AdapterResult<readonly AdapterAssignedKarkun[]>
  lookupJourneyState(karkunId: string, scope?: AdapterScope): AdapterResult<AdapterJourneyState>
}
