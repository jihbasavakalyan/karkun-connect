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
import { buildAdminRelationshipInsights } from '@/lib/relationshipIntelligencePresentation'
import { getAnnexure1ExecutionMetrics } from '@/services/annexure1Service'
import { getFollowUpDashboardMetrics } from '@/services/followUpService'
import { getCampaignConnectionMetrics } from '@/services/metricsService'
import { getRecentActivity } from '@/stores/activityLogStore'
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
      hint: 'Canonical connected / campaign pool',
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

export function buildAdminCampaignTrends(): AdminTrendItem[] {
  const intelligence = getCampaignIntelligenceData()
  const annexure = getAnnexure1ExecutionMetrics()
  const followUps = getFollowUpDashboardMetrics()
  const overview = getCampaignProgressOverview()

  return [
    {
      id: 'daily-visits',
      label: 'Daily visits',
      value: String(annexure.submittedToday),
      detail: intelligence.dailyTrend,
    },
    {
      id: 'weekly-completion',
      label: 'Weekly completion',
      value: String(annexure.submittedThisWeek),
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
      label: 'Active engagement',
      value: `${overview.coverage}%`,
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
