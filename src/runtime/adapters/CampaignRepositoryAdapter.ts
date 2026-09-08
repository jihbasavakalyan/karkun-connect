/**
 * Concrete CampaignRepository adapter (KC-005 Sprint 2.1).
 *
 * Purpose: Bridge CampaignRepository to CampaignAdapter contract.
 * Maps campaign list items into conversation-safe adapter models only.
 */

import {
  BaseRepositoryAdapter,
  DEFAULT_READ_CAPABILITIES,
  adapterErr,
  adapterOk,
  mapRepositoryFailureResult,
  type AdapterCampaignContext,
  type AdapterCampaignStatus,
  type AdapterCampaignSummary,
  type AdapterResult,
  type AdapterTodaysProgramme,
  type CampaignAdapter,
} from '@/conversation/adapters'
import { getCampaignPeriodStatus } from '@/services/campaignService'
import type { CampaignListItem } from '@/constants/mockMissions'
import type { CampaignRepository } from '@/repositories/interfaces'
import { resolveAdapterAvailability } from './adapterResult'

function mapPeriodToAdapterStatus(
  campaign: CampaignListItem,
): AdapterCampaignStatus {
  const period = getCampaignPeriodStatus(campaign)
  if (period === 'active') return 'active'
  if (period === 'completed') return 'completed'
  if (period === 'upcoming') return 'inactive'
  return 'unknown'
}

function toCampaignContext(campaign: CampaignListItem): AdapterCampaignContext {
  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    campaignDayLabel: campaign.nextMilestone,
    status: mapPeriodToAdapterStatus(campaign),
  }
}

export class CampaignRepositoryAdapter
  extends BaseRepositoryAdapter
  implements CampaignAdapter
{
  readonly adapterId = 'campaign' as const

  private readonly campaignRepository: CampaignRepository

  constructor(campaignRepository: CampaignRepository) {
    super()
    this.campaignRepository = campaignRepository
    this.setCapabilities({
      ...DEFAULT_READ_CAPABILITIES,
      supportsOffline: true,
      supportsBatch: true,
    })
    this.setAvailability(resolveAdapterAvailability())
  }

  readCurrentCampaign(): AdapterResult<AdapterCampaignContext> {
    const availability = resolveAdapterAvailability()
    if (availability === 'offline') {
      return mapRepositoryFailureResult(this.adapterId, 'Offline', 'Repository is offline.', 'offline')
    }
    const result = this.campaignRepository.getActive()
    if (!result.ok) {
      return mapRepositoryFailureResult(this.adapterId, result.error.code, result.error.message)
    }
    if (!result.data || getCampaignPeriodStatus(result.data) !== 'active') {
      return adapterErr('RecordNotFound', 'No active campaign found.', this.adapterId, availability)
    }
    return adapterOk(toCampaignContext(result.data), availability)
  }

  readCampaignStatus(): AdapterResult<AdapterCampaignStatus> {
    const availability = resolveAdapterAvailability()
    if (availability === 'offline') {
      return mapRepositoryFailureResult(this.adapterId, 'Offline', 'Repository is offline.', 'offline')
    }
    const result = this.campaignRepository.getActive()
    if (!result.ok) {
      return mapRepositoryFailureResult(this.adapterId, result.error.code, result.error.message)
    }
    if (!result.data) {
      return adapterOk('unknown' as AdapterCampaignStatus, availability)
    }
    return adapterOk(mapPeriodToAdapterStatus(result.data), availability)
  }

  readTodaysProgramme(): AdapterResult<AdapterTodaysProgramme> {
    const availability = resolveAdapterAvailability()
    if (availability === 'offline') {
      return mapRepositoryFailureResult(this.adapterId, 'Offline', 'Repository is offline.', 'offline')
    }
    const result = this.campaignRepository.getActive()
    if (!result.ok) {
      return mapRepositoryFailureResult(this.adapterId, result.error.code, result.error.message)
    }
    if (!result.data || getCampaignPeriodStatus(result.data) !== 'active') {
      return adapterOk(
        { focusItems: [], deferredItems: [] } satisfies AdapterTodaysProgramme,
        availability,
      )
    }
    const campaign = result.data
    return adapterOk(
      {
        campaignId: campaign.id,
        campaignDayLabel: campaign.nextMilestone,
        focusItems: [
          ...campaign.objectives,
          ...(campaign.nextMilestone ? [campaign.nextMilestone] : []),
        ],
        deferredItems: [],
      } satisfies AdapterTodaysProgramme,
      availability,
    )
  }

  readCampaignSummary(): AdapterResult<AdapterCampaignSummary> {
    const availability = resolveAdapterAvailability()
    if (availability === 'offline') {
      return mapRepositoryFailureResult(this.adapterId, 'Offline', 'Repository is offline.', 'offline')
    }
    const result = this.campaignRepository.getActive()
    if (!result.ok) {
      return mapRepositoryFailureResult(this.adapterId, result.error.code, result.error.message)
    }
    if (!result.data) {
      return adapterOk({ status: 'unknown' } satisfies AdapterCampaignSummary, availability)
    }
    const campaign = result.data
    return adapterOk(
      {
        campaignId: campaign.id,
        campaignName: campaign.name,
        status: mapPeriodToAdapterStatus(campaign),
        dayLabel: campaign.nextMilestone,
      } satisfies AdapterCampaignSummary,
      availability,
    )
  }
}
