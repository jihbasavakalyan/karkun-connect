/**
 * Campaign repository adapter contract (KC-004 Sprint 1.5).
 *
 * Purpose: Translate campaign repository reads into conversation-safe campaign context.
 * Repository dependency: Implementations wrap CampaignRepository (outside conversation/).
 * Future extensions: Today's programme synthesis may enrich Knowledge snapshots.
 * Capability support: Read-focused; write remains with existing campaign services.
 * Error mapping: Uses mapRepositoryFailure — never raw repository exceptions.
 */

import type { ConversationCampaignRef } from '../ConversationContext'
import type { RepositoryAdapter } from './RepositoryAdapter'
import type { AdapterResult, AdapterScope } from './AdapterTypes'

/** Campaign status as conversation-safe labels — not repository enums. */
export type AdapterCampaignStatus =
  | 'active'
  | 'inactive'
  | 'completed'
  | 'unknown'

export type AdapterCampaignContext = ConversationCampaignRef & {
  status: AdapterCampaignStatus
}

/** Today's programme summary — structural facts only; no coaching copy. */
export type AdapterTodaysProgramme = {
  campaignId?: string
  campaignDayLabel?: string
  focusItems: readonly string[]
  deferredItems: readonly string[]
}

/**
 * CampaignAdapter — read campaign context, status, and today's programme.
 *
 * Implementations must not live inside conversation/; they wrap CampaignRepository.
 */
export interface CampaignAdapter extends RepositoryAdapter {
  readonly adapterId: 'campaign'
  readCampaignContext(scope?: AdapterScope): AdapterResult<AdapterCampaignContext>
  readCampaignStatus(scope?: AdapterScope): AdapterResult<AdapterCampaignStatus>
  readTodaysProgramme(scope?: AdapterScope): AdapterResult<AdapterTodaysProgramme>
}
