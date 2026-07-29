/**
 * Expanded short-TTL metrics bundle for Rafeeq campaign intelligence.
 * Existing services only — no duplicate calculations.
 */

import { getCampaignConnectionMetrics } from '@/services/metricsService'
import {
  getDashboardAppRegistrationMetrics,
  getDashboardAppRegistrationMetricsForRukn,
  getDashboardMonthlyBaitulMaalHealthSlice,
  getDashboardVisitMetrics,
  getDashboardVisitMetricsForRukn,
  getDashboardWeeklyIjtemaHealthSlice,
} from '@/services/dashboardMetricsService'
import {
  getActiveCampaignSummary,
  getCampaignProgress,
  getCampaignTimeline,
} from '@/services/campaignService'
import { getPeopleStatistics } from '@/lib/peopleStore'
import { getPendingKarkunRequests } from '@/services/karkunRequestService'
import { getAssignmentDashboardMetrics } from '@/services/assignmentService'
import { getIjtemaAttendanceDashboardMetrics } from '@/services/ijtemaAttendanceService'

const TTL_MS = 2500

type Bundle = {
  at: number
  campaign: ReturnType<typeof getCampaignConnectionMetrics>
  people: ReturnType<typeof getPeopleStatistics>
  pendingCount: number
  assignments: ReturnType<typeof getAssignmentDashboardMetrics>
  ijtema: ReturnType<typeof getIjtemaAttendanceDashboardMetrics>
  visits: ReturnType<typeof getDashboardVisitMetrics>
  appRegistration: ReturnType<typeof getDashboardAppRegistrationMetrics>
  weeklyIjtemaHealth: ReturnType<typeof getDashboardWeeklyIjtemaHealthSlice>
  baitulMaalHealth: ReturnType<typeof getDashboardMonthlyBaitulMaalHealthSlice>
  campaignSummary: ReturnType<typeof getActiveCampaignSummary>
  campaignProgress: number
  campaignTimeline: ReturnType<typeof getCampaignTimeline>
}

let bundle: Bundle | null = null

function fresh(ruknId?: string | null): Bundle {
  const now = Date.now()
  if (bundle && now - bundle.at < TTL_MS && !ruknId) return bundle

  const visits = ruknId
    ? getDashboardVisitMetricsForRukn(ruknId)
    : getDashboardVisitMetrics()
  const appRegistration = ruknId
    ? getDashboardAppRegistrationMetricsForRukn(ruknId)
    : getDashboardAppRegistrationMetrics()

  const next: Bundle = {
    at: now,
    campaign: getCampaignConnectionMetrics(),
    people: getPeopleStatistics(),
    pendingCount: getPendingKarkunRequests().length,
    assignments: getAssignmentDashboardMetrics(),
    ijtema: getIjtemaAttendanceDashboardMetrics(),
    visits,
    appRegistration,
    weeklyIjtemaHealth: getDashboardWeeklyIjtemaHealthSlice(),
    baitulMaalHealth: getDashboardMonthlyBaitulMaalHealthSlice(),
    campaignSummary: getActiveCampaignSummary(),
    campaignProgress: getCampaignProgress(),
    campaignTimeline: getCampaignTimeline(),
  }

  if (!ruknId) bundle = next
  return next
}

export function getTurnMetricsBundle(ruknId?: string | null): Bundle {
  return fresh(ruknId)
}

export function resetTurnMetricsCache(): void {
  bundle = null
}
