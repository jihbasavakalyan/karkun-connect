import {
  MOCK_CAMPAIGNS,
  type ActiveCampaignSummary,
  type CampaignListItem,
} from '@/constants/mockMissions'
import { ACTIVE_CAMPAIGN_ID } from '@/types/assignment.types'

/** Campaign library — single source of truth for official campaign data. */
export function getCampaignLibrary(): readonly CampaignListItem[] {
  return MOCK_CAMPAIGNS
}

export function getActiveCampaign(): CampaignListItem | undefined {
  return MOCK_CAMPAIGNS.find((campaign) => campaign.id === ACTIVE_CAMPAIGN_ID)
}

export function getActiveCampaignName(): string {
  return getActiveCampaign()?.name ?? ''
}

export function getActiveCampaigns(): CampaignListItem[] {
  return MOCK_CAMPAIGNS.filter((campaign) => campaign.status === 'active')
}

export function getArchivedCampaigns(): CampaignListItem[] {
  return MOCK_CAMPAIGNS.filter((campaign) => campaign.status === 'archived')
}

export function getActiveCampaignSummary(): ActiveCampaignSummary | null {
  const campaign = getActiveCampaign()
  if (!campaign) {
    return null
  }

  return {
    name: campaign.name,
    progress: campaign.progress ?? 0,
    currentDay: campaign.currentDay ?? 1,
    totalDays: campaign.totalDays ?? 1,
  }
}

export function formatActiveCampaignDuration(): string {
  const campaign = getActiveCampaign()
  if (!campaign) {
    return '—'
  }

  return `${campaign.startDate} — ${campaign.endDate}`
}
