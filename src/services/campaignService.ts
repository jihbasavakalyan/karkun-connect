import {
  MOCK_CAMPAIGNS,
  type ActiveCampaignSummary,
  type CampaignListItem,
} from '@/constants/mockMissions'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'
import { getAllAssignments } from '@/stores/assignmentStore'
import { getAnnexure1ExecutionMetrics, getCampaignHealthFromAnnexure1 } from '@/services/annexure1Service'
import { ACTIVE_CAMPAIGN_ID } from '@/types/assignment.types'

export type CampaignTimelineStatus = 'upcoming' | 'active' | 'completed'

export type CampaignTimeline = {
  currentDay: number | null
  totalDays: number
  daysRemaining: number | null
  daysUntilStart: number | null
  status: CampaignTimelineStatus
  percentageElapsed: number
  dayLabel: string
}

function getCampaignLibraryFromRepository(): readonly CampaignListItem[] {
  return unwrapRepository(getRepositories().campaign.getAll(), MOCK_CAMPAIGNS)
}

/** Campaign library — repository-backed (Firestore cache or local seed fallback). */
export function getCampaignLibrary(): readonly CampaignListItem[] {
  return getCampaignLibraryFromRepository()
}

export function getActiveCampaign(): CampaignListItem | undefined {
  return (
    unwrapRepository(getRepositories().campaign.getActive(), undefined) ??
    getCampaignLibraryFromRepository().find((campaign) => campaign.id === ACTIVE_CAMPAIGN_ID)
  )
}

export function getActiveCampaignName(): string {
  return getActiveCampaign()?.name ?? ''
}

export function getActiveCampaignTheme(): string {
  return getActiveCampaign()?.theme ?? ''
}

export function getActiveCampaignObjective(): string {
  return getActiveCampaign()?.objective ?? ''
}

export function getActiveCampaignNextMilestone(): string {
  return getActiveCampaign()?.nextMilestone ?? ''
}

export function getActiveCampaigns(): CampaignListItem[] {
  return getCampaignLibraryFromRepository().filter((campaign) => campaign.status === 'active')
}

export function getArchivedCampaigns(): CampaignListItem[] {
  return getCampaignLibraryFromRepository().filter((campaign) => campaign.status === 'archived')
}

function parseCampaignDate(isoDate: string): Date {
  const parsed = new Date(`${isoDate}T00:00:00`)
  parsed.setHours(0, 0, 0, 0)
  return parsed
}

export function formatCampaignDate(isoDate: string): string {
  return parseCampaignDate(isoDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function getCampaignTimeline(referenceDate = new Date()): CampaignTimeline | null {
  const campaign = getActiveCampaign()
  if (!campaign) {
    return null
  }

  const start = parseCampaignDate(campaign.startDate)
  const end = parseCampaignDate(campaign.endDate)
  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)

  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)

  if (today.getTime() < start.getTime()) {
    const daysUntilStart = Math.round((start.getTime() - today.getTime()) / 86400000)
    return {
      currentDay: null,
      totalDays,
      daysRemaining: null,
      daysUntilStart,
      status: 'upcoming',
      percentageElapsed: 0,
      dayLabel: `Starts in ${daysUntilStart} day${daysUntilStart === 1 ? '' : 's'}`,
    }
  }

  if (today.getTime() > end.getTime()) {
    return {
      currentDay: totalDays,
      totalDays,
      daysRemaining: 0,
      daysUntilStart: null,
      status: 'completed',
      percentageElapsed: 100,
      dayLabel: 'Campaign Completed',
    }
  }

  const currentDay = Math.round((today.getTime() - start.getTime()) / 86400000) + 1
  const daysRemaining = Math.round((end.getTime() - today.getTime()) / 86400000)

  return {
    currentDay,
    totalDays,
    daysRemaining,
    daysUntilStart: null,
    status: 'active',
    percentageElapsed: Math.round((currentDay / totalDays) * 100),
    dayLabel: `Day ${currentDay} of ${totalDays}`,
  }
}

export function getCampaignProgress(): number {
  const assignedCount = getAllAssignments().filter((record) => record.status === 'Active').length
  if (assignedCount === 0) {
    return 0
  }

  const health = getCampaignHealthFromAnnexure1()
  if (health.overallScore > 0) {
    return health.overallScore
  }

  const metrics = getAnnexure1ExecutionMetrics()
  return Math.round((metrics.totalSubmitted / assignedCount) * 100)
}

export function getActiveCampaignSummary(): ActiveCampaignSummary | null {
  const campaign = getActiveCampaign()
  const timeline = getCampaignTimeline()
  if (!campaign || !timeline) {
    return null
  }

  return {
    name: campaign.name,
    progress: getCampaignProgress(),
    dayLabel: timeline.dayLabel,
    totalDays: timeline.totalDays,
  }
}

export function formatActiveCampaignDuration(): string {
  const campaign = getActiveCampaign()
  if (!campaign) {
    return '—'
  }

  return `${formatCampaignDate(campaign.startDate)} — ${formatCampaignDate(campaign.endDate)}`
}
