/**
 * KC-015 — Administrator Mission Control presentation helpers.
 * Aggregates existing snapshot / command-center / activity data only.
 */

import {
  getCampaignIntelligenceData,
  getCampaignProgressOverview,
  getTeamPerformanceRows,
  type TeamPerformanceRow,
} from '@/lib/commandCenterPresentation'
import { getBaitulMaalCampaignState } from '@/lib/campaignExecutionMatrix'
import { getCanonicalConnectedAssignments } from '@/lib/connections/getConnectedKarkunsForRukn'
import { getDailyProgressView } from '@/lib/dailyProgressPresentation'
import { isJihRegistered } from '@/lib/guidance/journeyEngine'
import { buildAdminRelationshipInsights } from '@/lib/relationshipIntelligencePresentation'
import { isCampaignEligible } from '@/lib/peopleClassification'
import { getAllKarkuns } from '@/lib/peopleStore'
import { getAnnexure1ExecutionMetrics } from '@/services/annexure1Service'
import {
  getDashboardConnectionProgressPct,
  getDashboardVisitMetrics,
} from '@/services/dashboardMetricsService'
import { getFollowUpDashboardMetrics } from '@/services/followUpService'
import { getCurrentIjtemaAttendance } from '@/services/ijtemaAttendanceService'
import { getCampaignConnectionMetrics } from '@/services/metricsService'
import { getRecentActivity } from '@/stores/activityLogStore'
import { ruknMaster } from '@/data/ruknMaster'
import { adminRuknDetailPath, adminExecutionPath, adminCompliancePath, ROUTES } from '@/constants/routes'
import { leaderboardStatus } from '@/components/mission-control/McProgressRing'
import type { AdminMissionControlModel } from './buildAdminMissionControl'
import type { AdminCommandCenterSnapshot } from '@/types/campaignAutomation.types'

export type AdminHealthKpi = {
  id: string
  label: string
  value: string | number
  hint?: string
  tone: 'green' | 'amber' | 'red' | 'neutral'
  route?: string
}

export type AdminInterventionItem = {
  id: string
  severity: 'critical' | 'attention' | 'watch'
  title: string
  detail: string
  route: string
}

export type AdminRuknPerformanceView = TeamPerformanceRow & {
  lastActivity: string | null
  status: ReturnType<typeof leaderboardStatus>
  route: string
}

export type AdminTrendItem = {
  id: string
  label: string
  value: string
  detail?: string
}

export type AdminActivityItem = {
  id: string
  message: string
  timestamp: string
}

export type CampaignAchievementMetric = {
  id: string
  label: string
  current: number
  total: number
  /** Percentage with one decimal place (e.g. 39.8). */
  pct: number
}

export type AdminCampaignAchievementProgress = {
  metrics: CampaignAchievementMetric[]
  /** Average of the five achievement percentages. */
  overallPct: number
}

function achievementPct(current: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((current / total) * 1000) / 10
}

function isVisitConducted(karkunId: string): boolean {
  const progress = getDailyProgressView(karkunId)
  return Boolean(
    progress.hasTodayProgress ||
      (progress.hasAnyProgress && progress.submission?.visitConducted === 'yes'),
  )
}

/**
 * Admin Hero — Campaign Achievement Progress.
 * Denominator is Karkun Registry only (category = Karkun / isCampaignEligible).
 * Muttafiqeen are excluded from every metric and from overall progress.
 * Reuses existing connection / visit / JIH / Weekly Ijtema / Baitul Maal sources only.
 */
export function buildAdminCampaignAchievementProgress(): AdminCampaignAchievementProgress {
  // Match Karkun Registry (not People Registry = Karkuns + Muttafiqeen).
  const eligible = getAllKarkuns().filter(isCampaignEligible)
  const total = eligible.length
  const connectedIds = new Set(
    getCanonicalConnectedAssignments().map((row) => row.karkunId),
  )

  let connected = 0
  let visitConducted = 0
  let appRegistered = 0
  let ijtemaAgreed = 0
  let baitulMaalCommitted = 0

  for (const karkun of eligible) {
    if (connectedIds.has(karkun.id)) connected += 1
    if (isVisitConducted(karkun.id)) visitConducted += 1
    if (isJihRegistered(karkun)) appRegistered += 1
    if (getCurrentIjtemaAttendance(karkun.id).status === 'Present') ijtemaAgreed += 1
    if (getBaitulMaalCampaignState(karkun.id) === 'committed') baitulMaalCommitted += 1
  }

  const metrics: CampaignAchievementMetric[] = [
    {
      id: 'connected',
      label: 'Connected',
      current: connected,
      total,
      pct: achievementPct(connected, total),
    },
    {
      id: 'visit',
      label: 'Visit Conducted',
      current: visitConducted,
      total,
      pct: achievementPct(visitConducted, total),
    },
    {
      id: 'app',
      label: 'App Registered',
      current: appRegistered,
      total,
      pct: achievementPct(appRegistered, total),
    },
    {
      id: 'ijtema',
      label: 'Agreed for Weekly Ijtema',
      current: ijtemaAgreed,
      total,
      pct: achievementPct(ijtemaAgreed, total),
    },
    {
      id: 'baitul',
      label: 'Baitul Maal Committed',
      current: baitulMaalCommitted,
      total,
      pct: achievementPct(baitulMaalCommitted, total),
    },
  ]

  const overallPct =
    metrics.length === 0
      ? 0
      : Math.round(
          (metrics.reduce((sum, metric) => sum + metric.pct, 0) / metrics.length) * 10,
        ) / 10

  return { metrics, overallPct }
}

function healthTone(value: number, invert = false): AdminHealthKpi['tone'] {
  const v = invert ? 100 - value : value
  if (v >= 70) return 'green'
  if (v >= 40) return 'amber'
  return 'red'
}

export function buildAdminCampaignHealthKpis(
  model: AdminMissionControlModel,
): AdminHealthKpi[] {
  const overview = getCampaignProgressOverview()
  const annexure = getAnnexure1ExecutionMetrics()
  const followUps = getFollowUpDashboardMetrics()
  // KC-0058.1 — always read live MetricsService (never trust a stale model snapshot).
  const connections = getCampaignConnectionMetrics()
  const execution = overview.execution
  const pendingVisits = annexure.pendingMeetings
  const completedVisits = annexure.submittedThisWeek
  const followUpsDue = followUps.pendingFollowUps

  return [
    {
      id: 'overall',
      label: 'Overall',
      value: `${model.campaignHealth.overall}%`,
      hint: 'Campaign completion',
      tone: healthTone(model.campaignHealth.overall),
      route: adminExecutionPath(),
    },
    {
      id: 'connections',
      label: 'Connections',
      // KC-0058.1 — live MetricsService. KC-0058.7 — UI must gate on metricsReady
      // (see AdminHealthKpiCard / ADMIN_HEALTH_KPI_READINESS.connections).
      value: `${connections.connected}/${connections.total}`,
      hint: 'Connected / yet to connect',
      tone: healthTone(connections.progressPct),
      route: adminCompliancePath('connections'),
    },
    {
      id: 'visits-done',
      label: 'Visits done',
      value: completedVisits,
      hint: 'This week',
      tone: completedVisits > 0 ? 'green' : 'amber',
      route: adminExecutionPath('completed-today'),
    },
    {
      id: 'visits-pending',
      label: 'Pending visits',
      value: pendingVisits,
      hint: 'Awaiting recording',
      tone: pendingVisits === 0 ? 'green' : pendingVisits > 10 ? 'red' : 'amber',
      route: adminExecutionPath('pending'),
    },
    {
      id: 'follow-ups',
      label: 'Follow-ups due',
      value: followUpsDue,
      hint: `${model.campaignHealth.criticalFollowUps} overdue`,
      tone:
        model.campaignHealth.criticalFollowUps > 0
          ? 'red'
          : followUpsDue > 0
            ? 'amber'
            : 'green',
      route: ROUTES.ADMIN_FOLLOW_UP,
    },
    {
      id: 'development',
      label: 'Development',
      value: `${execution}%`,
      hint: 'Execution progress',
      tone: healthTone(execution),
      route: ROUTES.ADMIN_FOLLOW_UP,
    },
  ]
}

export function buildAdminInterventionQueue(
  snapshot: AdminCommandCenterSnapshot,
  limit = 8,
): AdminInterventionItem[] {
  const items: AdminInterventionItem[] = []
  const seen = new Set<string>()

  const push = (item: AdminInterventionItem) => {
    if (seen.has(item.id)) return
    seen.add(item.id)
    items.push(item)
  }

  for (const alert of snapshot.alerts) {
    push({
      id: `alert-${alert.id}`,
      severity: /overdue|critical|inactive/i.test(alert.title + alert.message)
        ? 'critical'
        : 'attention',
      title: alert.title,
      detail: alert.message,
      route: alert.route || adminExecutionPath(),
    })
  }

  const overdue = snapshot.followUpQueue.find((group) => group.section === 'overdue')
  if (overdue && overdue.items.length > 0) {
    push({
      id: 'followups-overdue',
      severity: 'critical',
      title: 'Overdue follow-ups',
      detail: `${overdue.items.length} follow-up${overdue.items.length === 1 ? '' : 's'} past due`,
      route: overdue.items[0]?.route || ROUTES.ADMIN_FOLLOW_UP,
    })
  }

  const insights = buildAdminRelationshipInsights()
  for (const rukn of insights.overdueFollowUpRukns.slice(0, 4)) {
    push({
      id: `rukn-attention-${rukn.ruknId}`,
      severity: rukn.count >= 3 ? 'critical' : 'attention',
      title: `${rukn.ruknName} needs support`,
      detail: `${rukn.count} connection${rukn.count === 1 ? '' : 's'} need attention`,
      route: rukn.route,
    })
  }

  const teamRows = getTeamPerformanceRows()
  const activity = getRecentActivity(80)
  const now = Date.now()
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000

  let inactivePushed = 0
  for (const row of teamRows) {
    if (row.assignedKarkuns === 0 || inactivePushed >= 3) continue
    const last = activity.find((entry) => entry.ruknId === row.ruknId)
    const lastTs = last ? new Date(last.timestamp).getTime() : 0
    const inactive = !last || now - lastTs > threeDaysMs
    if (inactive) {
      inactivePushed += 1
      push({
        id: `rukn-inactive-${row.ruknId}`,
        severity: !last ? 'critical' : 'attention',
        title: `Inactive Rukn — ${row.ruknName}`,
        detail: last
          ? `Last activity ${new Date(last.timestamp).toLocaleDateString()}`
          : 'No recent campaign activity logged',
        route: adminRuknDetailPath(row.ruknId),
      })
    }
  }

  if (insights.needingAttention > 0) {
    push({
      id: 'engagement-gap',
      severity: insights.needingAttention >= 5 ? 'critical' : 'attention',
      title: 'Karkuns without recent engagement',
      detail: `${insights.needingAttention} connection${insights.needingAttention === 1 ? '' : 's'} need attention`,
      route: adminExecutionPath(),
    })
  }

  const weakRukns = teamRows
    .filter((row) => row.completionPct < 40 && row.assignedKarkuns > 0)
    .slice(0, 3)
  for (const row of weakRukns) {
    push({
      id: `rukn-stalled-${row.ruknId}`,
      severity: row.completionPct < 20 ? 'critical' : 'watch',
      title: `Stalled progress — ${row.ruknName}`,
      detail: `${row.completionPct}% complete · ${row.pendingWork} pending`,
      route: adminRuknDetailPath(row.ruknId),
    })
  }

  const severityRank = { critical: 0, attention: 1, watch: 2 }
  return items
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    .slice(0, limit)
}

export function buildAdminRuknPerformance(limit = 10): AdminRuknPerformanceView[] {
  const activity = getRecentActivity(40)
  const rows = getTeamPerformanceRows()

  return rows.slice(0, limit).map((row) => {
    const last = activity.find((entry) => entry.ruknId === row.ruknId)
    return {
      ...row,
      lastActivity: last
        ? `${last.message} · ${new Date(last.timestamp).toLocaleString()}`
        : null,
      status: leaderboardStatus(row.completionPct),
      route: adminRuknDetailPath(row.ruknId),
    }
  })
}

/** KC-0071 — all active Rukns for executive dashboard (presentation composition only). */
export type AdminRuknGenderPerformanceView = AdminRuknPerformanceView & {
  gender: 'Male' | 'Female'
}

export function buildAllActiveRuknPerformance(): AdminRuknGenderPerformanceView[] {
  const activity = getRecentActivity(80)
  const perfById = new Map(getTeamPerformanceRows().map((row) => [row.ruknId, row]))

  return ruknMaster
    .filter((rukn) => rukn.status === 'active' && !rukn.isArchived)
    .map((rukn): AdminRuknGenderPerformanceView => {
      const row = perfById.get(rukn.id)
      const last = activity.find((entry) => entry.ruknId === rukn.id)
      const completionPct = row?.completionPct ?? 0
      const gender: 'Male' | 'Female' = rukn.gender === 'Female' ? 'Female' : 'Male'
      return {
        ruknId: rukn.id,
        ruknName: rukn.name,
        gender,
        assignedKarkuns: row?.assignedKarkuns ?? 0,
        pendingWork: row?.pendingWork ?? 0,
        completionPct,
        followUpPct: row?.followUpPct ?? 0,
        visits: row?.visits ?? 0,
        lastActivity: last
          ? `${last.message} · ${new Date(last.timestamp).toLocaleString()}`
          : null,
        status: leaderboardStatus(completionPct),
        route: adminRuknDetailPath(rukn.id),
      }
    })
    .sort((a, b) => a.ruknName.localeCompare(b.ruknName))
}

export function buildAdminCampaignTrends(): AdminTrendItem[] {
  const intelligence = getCampaignIntelligenceData()
  const visits = getDashboardVisitMetrics()
  const followUps = getFollowUpDashboardMetrics()
  const connectionProgress = getDashboardConnectionProgressPct()

  return [
    {
      id: 'daily-visits',
      label: 'Daily visits',
      value: String(visits.submittedToday),
      detail: intelligence.dailyTrend,
    },
    {
      id: 'weekly-completion',
      label: 'Weekly completion',
      value: String(visits.submittedThisWeek),
      detail: intelligence.weeklyTrend,
    },
    {
      id: 'follow-up-completion',
      label: 'Follow-up progress',
      value: (() => {
        const total = followUps.completedFollowUps + followUps.pendingFollowUps
        return `${followUps.completedFollowUps}/${total || 0}`
      })(),
      detail: `${followUps.pendingFollowUps} still pending`,
    },
    {
      id: 'engagement',
      label: 'Connection progress',
      value: `${connectionProgress}%`,
      detail: intelligence.completionForecast,
    },
  ]
}

export function buildAdminRecentActivityView(limit = 5): AdminActivityItem[] {
  return getRecentActivity(limit).map((entry) => ({
    id: entry.id,
    message: entry.message,
    timestamp: entry.timestamp,
  }))
}
