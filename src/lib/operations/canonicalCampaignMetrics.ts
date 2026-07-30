/**
 * KC-033 — Canonical campaign metric providers (single operational truth).
 *
 * Authoritative registry for executive / automation / Rafeeq / Cos reads.
 * Do not compute Campaign Health, Weekly Ijtema %, or Baitul Maal % outside
 * these providers. Dual-write + Excused/historical fallback remain inside
 * adapters only — not alternate truth for production decisions.
 *
 * Registry: docs/architecture/kc-033-canonical-metric-registry.md
 */

import { getCampaignConnectionMetrics } from '@/services/metricsService'
import {
  getDashboardAppRegistrationMetrics,
  getDashboardHealthSlices,
  getDashboardMonthlyBaitulMaalHealthSlice,
  getDashboardVisitMetrics,
  getDashboardWeeklyIjtemaHealthSlice,
  type DashboardHealthSlice,
} from '@/services/dashboardMetricsService'
import { getWeeklyIjtemaDashboardKpi } from '@/services/weeklyIjtemaService'
import { getMonthlyBaitulMaalDashboardKpi } from '@/services/monthlyBaitulMaalService'
import {
  getWeeklyIjtemaAttendanceSummariesView,
  getWeeklyIjtemaCurrentAttendanceView,
  getWeeklyIjtemaDashboardMetricsView,
} from '@/lib/operations/weeklyIjtemaReadAdapter'
import {
  getMonthlyBaitulMaalCampaignStateView,
  getMonthlyBaitulMaalComplianceStatusView,
  getMonthlyBaitulMaalDashboardMetricsView,
  getMonthlyBaitulMaalSummariesView,
} from '@/lib/operations/monthlyBaitulMaalReadAdapter'

/** Equal-weight mean of the four Campaign Health slices (0 when empty). */
export function getCanonicalCampaignHealthOverallPct(): number {
  const slices = getDashboardHealthSlices()
  if (slices.length === 0) return 0
  return Math.round(slices.reduce((sum, slice) => sum + slice.pct, 0) / slices.length)
}

export function getCanonicalHealthSlices(): DashboardHealthSlice[] {
  return getDashboardHealthSlices()
}

/** Authoritative metric provider map (documentation + typed access). */
export const CanonicalMetricProviders = {
  connections: {
    id: 'connections',
    provider: 'metricsService.getCampaignConnectionMetrics',
    get: getCampaignConnectionMetrics,
  },
  visits: {
    id: 'visits',
    provider: 'dashboardMetricsService.getDashboardVisitMetrics',
    get: getDashboardVisitMetrics,
  },
  weeklyIjtema: {
    id: 'weekly-ijtema',
    /** Event-track KPI (module reports / pending Rukns). */
    provider: 'weeklyIjtemaService.getWeeklyIjtemaDashboardKpi',
    getKpi: getWeeklyIjtemaDashboardKpi,
    /** Health slice: Present ÷ Assigned. */
    getHealthSlice: getDashboardWeeklyIjtemaHealthSlice,
    /** Ops cards: adapter Prefer-event metrics (legacy-shaped counts). */
    getDashboardMetricsView: getWeeklyIjtemaDashboardMetricsView,
    getSummariesView: getWeeklyIjtemaAttendanceSummariesView,
    getCurrentAttendanceView: getWeeklyIjtemaCurrentAttendanceView,
  },
  baitulMaal: {
    id: 'monthly-baitul-maal',
    provider: 'monthlyBaitulMaalService.getMonthlyBaitulMaalDashboardKpi',
    getKpi: getMonthlyBaitulMaalDashboardKpi,
    getHealthSlice: getDashboardMonthlyBaitulMaalHealthSlice,
    getDashboardMetricsView: getMonthlyBaitulMaalDashboardMetricsView,
    getSummariesView: getMonthlyBaitulMaalSummariesView,
    getComplianceStatusView: getMonthlyBaitulMaalComplianceStatusView,
    getCampaignStateView: getMonthlyBaitulMaalCampaignStateView,
  },
  appRegistration: {
    id: 'app-registration',
    provider: 'dashboardMetricsService.getDashboardAppRegistrationMetrics',
    get: getDashboardAppRegistrationMetrics,
  },
  campaignHealth: {
    id: 'campaign-health',
    provider: 'dashboardMetricsService.getDashboardHealthSlices',
    getSlices: getDashboardHealthSlices,
    getOverallPct: getCanonicalCampaignHealthOverallPct,
  },
} as const

/** Scope cycle BM adapter summaries to a Connected Karkun id set (Rukn home). */
export function getCanonicalRuknBaitulMaalMetrics(karkunIds: string[]): {
  paid: number
  pending: number
  exempt: number
  compliancePercentage: number
} {
  const idSet = new Set(karkunIds)
  const summaries = getMonthlyBaitulMaalSummariesView().filter((row) => idSet.has(row.karkunId))
  let paid = 0
  let pending = 0
  let exempt = 0
  for (const row of summaries) {
    if (row.status === 'Paid') paid += 1
    else if (row.status === 'Exempt') exempt += 1
    else pending += 1
  }
  const total = summaries.length
  const compliant = paid + exempt
  return {
    paid,
    pending,
    exempt,
    compliancePercentage: total === 0 ? 0 : Math.round((compliant / total) * 100),
  }
}
