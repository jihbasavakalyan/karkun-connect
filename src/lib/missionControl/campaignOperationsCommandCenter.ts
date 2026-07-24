/**
 * KC-0109 Scope 1 — Campaign Operations Command Center presentation helpers.
 * Information architecture only: reuses existing module metrics / activity data.
 * Does not change Firestore schemas, campaign modules, or authentication.
 */

import {
  adminCompliancePath,
  adminExecutionPath,
  adminMonthlyBaitulMaalPath,
  adminRuknDetailPath,
  adminWeeklyIjtemaPath,
} from '@/constants/routes'
import { ruknMaster } from '@/data/ruknMaster'
import { isJihRegistered } from '@/lib/guidance/journeyEngine'
import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import { isCampaignEligible } from '@/lib/peopleClassification'
import { getTeamPerformanceRows } from '@/lib/commandCenterPresentation'
import { leaderboardStatus } from '@/components/mission-control/McProgressRing'
import {
  buildAdminCampaignTrends,
  type AdminRuknGenderPerformanceView,
  type AdminTrendItem,
} from '@/lib/missionControl/adminMissionControlPresentation'
import {
  type AdminActionCenterItem,
  type ActionCenterSeverity,
} from '@/lib/missionControl/adminDashboardOpsExperiment'
import {
  buildLiveActivityFeed,
  type LiveActivityFeedItem,
} from '@/lib/missionControl/liveActivityFeedPresentation'
import {
  getDashboardAppRegistrationMetrics,
  getDashboardHealthSlices,
  getDashboardVisitMetrics,
  getDashboardVisitMetricsForRukn,
} from '@/services/dashboardMetricsService'
import { getMonthlyBaitulMaalDashboardKpi, getMonthlyBaitulMaalReport } from '@/services/monthlyBaitulMaalService'
import { getWeeklyIjtemaDashboardKpi, getWeeklyIjtemaReport } from '@/services/weeklyIjtemaService'
import { getRecentActivity } from '@/stores/activityLogStore'

export type CampaignHealthMetricId =
  | 'visits'
  | 'weekly-ijtema'
  | 'monthly-baitul-maal'
  | 'app-registration'

export type CampaignHealthMetric = {
  id: CampaignHealthMetricId
  label: string
  /** Frozen contract: display percentages only. */
  pct: number
  route: string
  /** Numerator / denominator retained for correctness checks (not shown in UI). */
  current: number
  total: number
}

export type TopPriorityRuknView = AdminRuknGenderPerformanceView & {
  /** Equal-weight average across Visits / Weekly Ijtema / Monthly Baitul Maal / App Registration. */
  priorityScore: number
  modulePct: {
    visits: number
    weeklyIjtema: number
    monthlyBaitulMaal: number
    appRegistration: number
  }
}

function pct(current: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((current / total) * 100)
}

/**
 * Campaign Health metric contract (KC-0109 / KC-0101.B):
 * - Visits = Completed ÷ Planned (canonical Connected + annexure)
 * - Weekly Ijtema = Present ÷ Assigned
 * - Monthly Baitul Maal = Contributed ÷ Assigned
 * - App Registration = Registered ÷ Eligible
 * All slices come from DashboardMetricsService so Priority / Mission cannot diverge.
 */
export function buildCampaignOperationsHealthMetrics(): CampaignHealthMetric[] {
  const slices = getDashboardHealthSlices()
  const routes: Record<CampaignHealthMetricId, string> = {
    visits: adminExecutionPath('completed-today'),
    'weekly-ijtema': adminWeeklyIjtemaPath(),
    'monthly-baitul-maal': adminMonthlyBaitulMaalPath(),
    'app-registration': adminCompliancePath('jih-portal'),
  }
  const labels: Record<CampaignHealthMetricId, string> = {
    visits: 'Visits',
    'weekly-ijtema': 'Weekly Ijtema',
    'monthly-baitul-maal': 'Monthly Baitul Maal',
    'app-registration': 'App Registration',
  }

  return slices.map((slice) => ({
    id: slice.id,
    label: labels[slice.id],
    current: slice.current,
    total: slice.total,
    pct: slice.pct,
    route: routes[slice.id],
  }))
}

/**
 * Today's Mission — only actionable operational items from existing module counts.
 */
export function buildTodaysMissionOperationalItems(): AdminActionCenterItem[] {
  const items: AdminActionCenterItem[] = []
  const ijtema = getWeeklyIjtemaDashboardKpi()
  const baitul = getMonthlyBaitulMaalDashboardKpi()
  const visits = getDashboardVisitMetrics()
  const app = getDashboardAppRegistrationMetrics()

  const push = (
    id: string,
    severity: ActionCenterSeverity,
    title: string,
    description: string,
    actionLabel: string,
    route: string,
    count: number,
  ) => {
    if (count <= 0) return
    items.push({
      id,
      severity,
      severityLabel: severity === 'critical' ? 'Critical' : severity === 'high' ? 'High' : 'Medium',
      title,
      description,
      actionLabel,
      route,
      count,
    })
  }

  push(
    'mission-pending-weekly-ijtema',
    ijtema.ruknsPending >= 5 ? 'high' : 'medium',
    'Pending Weekly Ijtema submissions',
    `${ijtema.ruknsPending} Rukn${ijtema.ruknsPending === 1 ? '' : 's'} still need to submit attendance`,
    'Review',
    adminWeeklyIjtemaPath(),
    ijtema.ruknsPending,
  )

  push(
    'mission-pending-monthly-baitul-maal',
    baitul.ruknsPending >= 5 ? 'high' : 'medium',
    'Pending Monthly Baitul Maal submissions',
    `${baitul.ruknsPending} Rukn${baitul.ruknsPending === 1 ? '' : 's'} still need to submit completion`,
    'Review',
    adminMonthlyBaitulMaalPath(),
    baitul.ruknsPending,
  )

  push(
    'mission-overdue-visits',
    visits.pending >= 10 ? 'critical' : 'high',
    'Overdue visits',
    `${visits.pending} connected Karkun${visits.pending === 1 ? '' : 's'} still need a visit report`,
    'Open',
    adminExecutionPath('pending'),
    visits.pending,
  )

  push(
    'mission-pending-app-registration',
    app.pending >= 10 ? 'high' : 'medium',
    'Pending app registrations',
    `${app.pending} eligible Karkun${app.pending === 1 ? '' : 's'} not yet registered`,
    'Complete',
    adminCompliancePath('jih-portal'),
    app.pending,
  )

  const rank: Record<ActionCenterSeverity, number> = { critical: 0, high: 1, medium: 2 }
  return items.sort((a, b) => rank[a.severity] - rank[b.severity])
}

/** Inactive modules contribute 0% (matches Campaign Health — never synthetic 100%). */
function modulePctOrZero(current: number, total: number, moduleActive: boolean): number {
  if (!moduleActive) return 0
  return pct(current, total)
}

/**
 * Top Priority Rukns — equal weight across Visits / Weekly Ijtema / Monthly Baitul Maal / App Registration.
 * Lower score = higher operational priority.
 */
export function buildTopPriorityRukns(limit = 12): TopPriorityRuknView[] {
  const perfById = new Map(getTeamPerformanceRows().map((row) => [row.ruknId, row]))
  const activity = getRecentActivity(80)

  const ijtemaKpi = getWeeklyIjtemaDashboardKpi()
  const baitulKpi = getMonthlyBaitulMaalDashboardKpi()
  const ijtemaRows = ijtemaKpi.eventId
    ? (getWeeklyIjtemaReport(ijtemaKpi.eventId)?.ruknRows ?? [])
    : []
  const baitulRows = baitulKpi.cycleId
    ? (getMonthlyBaitulMaalReport(baitulKpi.cycleId)?.ruknRows ?? [])
    : []
  const ijtemaById = new Map(ijtemaRows.map((row) => [row.ruknId, row]))
  const baitulById = new Map(baitulRows.map((row) => [row.ruknId, row]))

  const rows: TopPriorityRuknView[] = []

  for (const rukn of ruknMaster) {
    if (rukn.status !== 'active' || rukn.isArchived) continue
    const assigned = getAssignedKarkunanForRukn(rukn.id)
    if (assigned.length === 0) continue

    const perf = perfById.get(rukn.id)
    const visitsPct = getDashboardVisitMetricsForRukn(rukn.id).pct

    const ijtemaRow = ijtemaById.get(rukn.id)
    const weeklyIjtemaPct = modulePctOrZero(
      ijtemaRow?.present ?? 0,
      ijtemaRow?.assigned ?? assigned.length,
      Boolean(ijtemaKpi.eventId),
    )

    const baitulRow = baitulById.get(rukn.id)
    const monthlyBaitulMaalPct = modulePctOrZero(
      baitulRow?.contributed ?? 0,
      baitulRow?.assigned ?? assigned.length,
      Boolean(baitulKpi.cycleId),
    )

    const eligibleAssigned = assigned.filter(isCampaignEligible)
    const registered = eligibleAssigned.filter(isJihRegistered).length
    const appRegistrationPct = pct(registered, eligibleAssigned.length || assigned.length)

    const priorityScore = Math.round(
      (visitsPct + weeklyIjtemaPct + monthlyBaitulMaalPct + appRegistrationPct) / 4,
    )

    const last = activity.find((entry) => entry.ruknId === rukn.id)
    const gender: 'Male' | 'Female' = rukn.gender === 'Female' ? 'Female' : 'Male'

    rows.push({
      ruknId: rukn.id,
      ruknName: rukn.name,
      gender,
      assignedKarkuns: perf?.assignedKarkuns ?? assigned.length,
      pendingWork: perf?.pendingWork ?? 0,
      completionPct: priorityScore,
      followUpPct: perf?.followUpPct ?? 0,
      visits: perf?.visits ?? 0,
      lastActivity: last
        ? `${last.message} · ${new Date(last.timestamp).toLocaleString()}`
        : null,
      status: leaderboardStatus(priorityScore),
      route: adminRuknDetailPath(rukn.id),
      priorityScore,
      modulePct: {
        visits: visitsPct,
        weeklyIjtema: weeklyIjtemaPct,
        monthlyBaitulMaal: monthlyBaitulMaalPct,
        appRegistration: appRegistrationPct,
      },
    })
  }

  return rows
    .sort(
      (a, b) =>
        a.priorityScore - b.priorityScore ||
        b.pendingWork - a.pendingWork ||
        a.ruknName.localeCompare(b.ruknName),
    )
    .slice(0, limit)
}

/** Compact Progress Trends from the existing helper. */
export function buildCampaignOperationsTrends(): AdminTrendItem[] {
  return buildAdminCampaignTrends()
}

export type ActivityTimelineItem = LiveActivityFeedItem & {
  absoluteTime: string
}

/** Merge Live Activity + System History into one chronological timeline (same activity log source). */
export function buildActivityTimeline(limit = 12): ActivityTimelineItem[] {
  return buildLiveActivityFeed(limit).map((item) => ({
    ...item,
    absoluteTime: new Date(item.timestamp).toLocaleString(),
  }))
}
