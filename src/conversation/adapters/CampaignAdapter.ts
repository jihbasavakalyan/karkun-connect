/**
 * Campaign repository adapter contract (KC-004 Sprint 1.5).
 *
 * Purpose: Translate campaign repository reads into conversation-safe campaign context.
 * Dependencies: Implementations wrap CampaignRepository (outside conversation/).
 * Capabilities: Read-focused; write remains with existing campaign services.
 * Supported operations: current campaign, status, today's programme, campaign summary.
 * Future extensions: Today's programme synthesis may enrich Knowledge snapshots.
 */

import type { ConversationCampaignRef } from '../ConversationContext'
import type { RepositoryAdapter } from './AdapterCapabilities'
import type { AdapterResult, AdapterScope } from './AdapterTypes'

export type AdapterCampaignStatus =
  | 'active'
  | 'inactive'
  | 'completed'
  | 'unknown'

export type AdapterCampaignContext = ConversationCampaignRef & {
  status: AdapterCampaignStatus
}

export type AdapterTodaysProgramme = {
  campaignId?: string
  campaignDayLabel?: string
  focusItems: readonly string[]
  deferredItems: readonly string[]
}

export type AdapterCampaignSummary = {
  campaignId?: string
  campaignName?: string
  status: AdapterCampaignStatus
  dayLabel?: string
  connectedCount?: number
  pendingCount?: number
}

/**
 * CampaignAdapter — current campaign, status, today's programme, and summary.
 */
export interface CampaignAdapter extends RepositoryAdapter {
  readonly adapterId: 'campaign'
  readCurrentCampaign(scope?: AdapterScope): AdapterResult<AdapterCampaignContext>
  readCampaignStatus(scope?: AdapterScope): AdapterResult<AdapterCampaignStatus>
  readTodaysProgramme(scope?: AdapterScope): AdapterResult<AdapterTodaysProgramme>
  readCampaignSummary(scope?: AdapterScope): AdapterResult<AdapterCampaignSummary>
}
