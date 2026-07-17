/**
 * Administrator Mission Control snapshot — real repositories/services only (KC-007).
 */

import { ruknMaster } from '@/data/ruknMaster'
import { getPeopleStatistics } from '@/lib/peopleStore'
import { getCampaignProgressOverview, getTeamPerformanceRows } from '@/lib/commandCenterPresentation'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { getAssignmentDashboardMetrics } from '@/services/assignmentService'
import {
  getActiveCampaign,
  formatCampaignDate,
  getCampaignTimeline,
} from '@/services/campaignService'
import { getBaitulMaalDashboardMetrics } from '@/services/baitulMaalService'
import { getIjtemaAttendanceDashboardMetrics } from '@/services/ijtemaAttendanceService'
import { getJihWebPortalDashboardMetrics } from '@/services/jihWebPortalService'
import { getConnectedProfileCompletionMetrics } from '@/lib/karkunProfileCompletion'
import { getAllAssignments } from '@/stores/assignmentStore'
import { getRecentActivity } from '@/stores/activityLogStore'
import { JOURNEY_STAGE_LABELS, JOURNEY_STAGE_ORDER, type JourneyStageId } from '@/types/guidance'
import type { AdminCommandCenterSnapshot } from '@/types/campaignAutomation.types'
import {
  ROUTES,
  adminAssignmentsPath,
  adminExecutionPath,
} from '@/constants/routes'

export type MissionControlKpi = {
  id: string
  label: string
  value: number | string
  hint?: string
  route?: string
}

export type MissionControlFunnelStage = {
  stageId: JourneyStageId
  label: string
  count: number
}

export type MissionControlQuickAction = {
  id: string
  label: string
  route: string
}

export type AdminMissionControlModel = {
  campaignName: string
  currentDateLabel: string
  campaignProgressPct: number
  daysRemaining: number | null
  dayLabel: string
  kpis: MissionControlKpi[]
  quickActions: MissionControlQuickAction[]
  connectionProgress: {
    connected: number
    remaining: number
    total: number
    pct: number
  }
  campaignHealth: {
    overall: number
    attendanceCompliance: number
    baitulMaalCompliance: number
    jihPending: number
    criticalFollowUps: number
  }
  journeyFunnel: MissionControlFunnelStage[]
  ruknLeaderboard: {
    ruknId: string
    ruknName: string
    assignedKarkuns: number
    visits: number
    completionPct: number
  }[]
  todaysPriorities: { id: string; title: string; detail: string; route: string }[]
  recentActivity: { id: string; message: string; timestamp: string }[]
}

function buildJourneyFunnel(): MissionControlFunnelStage[] {
  const activeAssignments = getAllAssignments().filter((record) => record.status === 'Active')
  const ruknIds = [...new Set(activeAssignments.map((record) => record.ruknId))]
  const stageCounts = new Map<JourneyStageId, number>()

  for (const ruknId of ruknIds) {
    for (const guidance of getGuidanceForRuknKarkuns(ruknId)) {
      stageCounts.set(
        guidance.currentStage,
        (stageCounts.get(guidance.currentStage) ?? 0) + 1,
      )
    }
  }

  return JOURNEY_STAGE_ORDER.map((stageId) => ({
    stageId,
    label: JOURNEY_STAGE_LABELS[stageId],
    count: stageCounts.get(stageId) ?? 0,
  }))
}

export function buildAdminMissionControl(
  snapshot: AdminCommandCenterSnapshot,
): AdminMissionControlModel {
  const campaign = getActiveCampaign()
  const timeline = getCampaignTimeline()
  const people = getPeopleStatistics()
  const assignments = getAssignmentDashboardMetrics()
  const overview = getCampaignProgressOverview()
  const ijtema = getIjtemaAttendanceDashboardMetrics()
  const baitulMaal = getBaitulMaalDashboardMetrics()
  const jih = getJihWebPortalDashboardMetrics()
  const team = getTeamPerformanceRows().slice(0, 8)
  const funnel = buildJourneyFunnel()

  const attendanceCompliance =
    ijtema.present + ijtema.absent + ijtema.excused + ijtema.notRecorded === 0
      ? 100
      : Math.round(
          (ijtema.present /
            Math.max(ijtema.present + ijtema.absent + ijtema.notRecorded, 1)) *
            100,
        )

  const criticalFollowUps =
    snapshot.followUpQueue.find((group) => group.section === 'overdue')?.items.length ?? 0

  const total = people.assignedKarkuns + people.unassignedKarkuns
  const connected = people.assignedKarkuns
  const remaining = people.unassignedKarkuns

  const todaysPriorities = [
    ...snapshot.alerts.slice(0, 4).map((alert) => ({
      id: alert.id,
      title: alert.title,
      detail: alert.message,
      route: alert.route,
    })),
    ...(snapshot.followUpQueue.find((g) => g.section === 'overdue')?.items.slice(0, 3).map((item) => ({
      id: item.followUpId,
      title: item.karkunName,
      detail: item.purpose,
      route: item.route,
    })) ?? []),
  ].slice(0, 6)

  const profileCompletion = getConnectedProfileCompletionMetrics()

  return {
    campaignName: campaign?.name ?? 'Active Campaign',
    currentDateLabel: new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    campaignProgressPct: overview.overall,
    daysRemaining: timeline?.daysRemaining ?? null,
    dayLabel: timeline?.dayLabel ?? '—',
    kpis: [
      {
        id: 'connected',
        label: 'Connected Karkuns',
        value: connected,
        hint: `${assignments.assignmentsToday} new today`,
        route: adminAssignmentsPath(),
      },
      {
        id: 'remaining',
        label: 'Remaining Karkuns',
        value: remaining,
        hint: 'Available to connect',
        route: adminAssignmentsPath(),
      },
      {
        id: 'profile-completion',
        label: 'Complete Profiles',
        value: `${profileCompletion.complete} / ${profileCompletion.totalConnected || 0}`,
        hint: `${profileCompletion.incomplete} incomplete`,
        route: ROUTES.ADMIN_KARKUN,
      },
      {
        id: 'rukns',
        label: 'Total Rukns',
        value: ruknMaster.filter((rukn) => rukn.status === 'active').length,
        hint: `${assignments.assignedRukns} with connections`,
        route: ROUTES.ADMIN_RUKN,
      },
      {
        id: 'active-today',
        label: 'Active Today',
        value: snapshot.schedule.length,
        hint: `${snapshot.callQueue.length} calls queued`,
        route: adminExecutionPath(),
      },
    ],
    quickActions: [
      { id: 'connect', label: 'Connections', route: ROUTES.ADMIN_ASSIGNMENTS },
      { id: 'execution', label: 'Execution', route: ROUTES.ADMIN_EXECUTION },
      { id: 'compliance', label: 'Compliance', route: ROUTES.ADMIN_COMPLIANCE },
      { id: 'follow-up', label: 'Follow-up', route: ROUTES.ADMIN_FOLLOW_UP },
      { id: 'communication', label: 'Communication', route: ROUTES.ADMIN_COMMUNICATION },
    ],
    connectionProgress: {
      connected,
      remaining,
      total: Math.max(total, 1),
      pct: total > 0 ? Math.round((connected / total) * 100) : 0,
    },
    campaignHealth: {
      overall: overview.overall,
      attendanceCompliance,
      baitulMaalCompliance: baitulMaal.compliancePercentage,
      jihPending: jih.notRegistered + jih.pendingReports,
      criticalFollowUps,
    },
    journeyFunnel: funnel,
    ruknLeaderboard: team.map((row) => ({
      ruknId: row.ruknId,
      ruknName: row.ruknName,
      assignedKarkuns: row.assignedKarkuns,
      visits: row.visits,
      completionPct: row.completionPct,
    })),
    todaysPriorities,
    recentActivity: getRecentActivity(8).map((entry) => ({
      id: entry.id,
      message: entry.message,
      timestamp: entry.timestamp,
    })),
  }
}

export function formatCampaignWindowLabel(): string {
  const campaign = getActiveCampaign()
  if (!campaign) return ''
  return `${formatCampaignDate(campaign.startDate)} – ${formatCampaignDate(campaign.endDate)}`
}
