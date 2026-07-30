/**
 * Expanded short-TTL metrics bundle for Rafeeq campaign intelligence.
 * KC-033 — canonical Health slices + adapter WI metrics only (no legacy IJ/BM).
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
import { getWeeklyIjtemaDashboardMetricsView } from '@/lib/operations/weeklyIjtemaReadAdapter'

const TTL_MS = 2500

type Bundle = {
  at: number
  campaign: ReturnType<typeof getCampaignConnectionMetrics>
  people: ReturnType<typeof getPeopleStatistics>
  pendingCount: number
  assignments: ReturnType<typeof getAssignmentDashboardMetrics>
  /** Canonical-prefer adapter metrics (legacy-shaped counts for Cos cards). */
  ijtema: ReturnType<typeof getWeeklyIjtemaDashboardMetricsView>
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
    ijtema: getWeeklyIjtemaDashboardMetricsView(),
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
