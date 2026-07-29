/**
 * Short-lived cache so one turn does not re-fetch the same metrics bundle.
 */

import { getCampaignConnectionMetrics } from '@/services/metricsService'
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
}

let bundle: Bundle | null = null

function fresh(): Bundle {
  const now = Date.now()
  if (bundle && now - bundle.at < TTL_MS) return bundle
  bundle = {
    at: now,
    campaign: getCampaignConnectionMetrics(),
    people: getPeopleStatistics(),
    pendingCount: getPendingKarkunRequests().length,
    assignments: getAssignmentDashboardMetrics(),
    ijtema: getIjtemaAttendanceDashboardMetrics(),
  }
  return bundle
}

export function getTurnMetricsBundle(): Bundle {
  return fresh()
}

/** Test helper — reset cache between cases. */
export function resetTurnMetricsCache(): void {
  bundle = null
}
