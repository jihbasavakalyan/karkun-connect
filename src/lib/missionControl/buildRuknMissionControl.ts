/**
 * Rukn Mission Control snapshot — real repositories/services only (KC-007).
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getConnectedKarkunIdsForRukn } from '@/lib/connections/getConnectedKarkunsForRukn'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { buildRuknExecutionSummary } from '@/lib/executionStatus'
import { getRuknBaitulMaalMetrics } from '@/services/baitulMaalService'
import { getCurrentIjtemaAttendance } from '@/services/ijtemaAttendanceService'
import { getDevelopmentAssessment } from '@/stores/developmentAssessmentStore'
import { getRecentActivity } from '@/stores/activityLogStore'
import { JOURNEY_STAGE_LABELS, JOURNEY_STAGE_ORDER, type JourneyStageId } from '@/types/guidance'
import type { RuknCommandCenterSnapshot } from '@/types/campaignAutomation.types'
import { ROUTES, ruknVisitPath } from '@/constants/routes'
import type { MissionControlFunnelStage, MissionControlKpi, MissionControlQuickAction } from './buildAdminMissionControl'

export type RuknMissionControlModel = {
  missionTitle: string
  missionDetail: string
  missionRoute: string
  planItems: { id: string; title: string; time?: string; route: string }[]
  kpis: MissionControlKpi[]
  quickActions: MissionControlQuickAction[]
  journeyFunnel: MissionControlFunnelStage[]
  todaysVisits: { id: string; title: string; subtitle?: string; route: string }[]
  attendanceStrip: {
    present: number
    absent: number
    excused: number
    notRecorded: number
  }
  recentActivity: { id: string; message: string; timestamp: string }[]
  monthlyTarget: {
    connected: number
    baitulMaalPaid: number
    baitulMaalPending: number
    developmentDue: number
  }
}

export function buildRuknMissionControl(
  ruknId: string,
  snapshot: RuknCommandCenterSnapshot,
): RuknMissionControlModel {
  const connectedIds = getConnectedKarkunIdsForRukn(ruknId)
  const guidance = getGuidanceForRuknKarkuns(ruknId)
  const baitulMaal = getRuknBaitulMaalMetrics(connectedIds)

  const stageCounts = new Map<JourneyStageId, number>()
  for (const item of guidance) {
    stageCounts.set(item.currentStage, (stageCounts.get(item.currentStage) ?? 0) + 1)
  }

  const journeyFunnel = JOURNEY_STAGE_ORDER.map((stageId) => ({
    stageId,
    label: JOURNEY_STAGE_LABELS[stageId],
    count: stageCounts.get(stageId) ?? 0,
  }))

  let present = 0
  let absent = 0
  let excused = 0
  let notRecorded = 0
  for (const karkunId of connectedIds) {
    const status = getCurrentIjtemaAttendance(karkunId).status
    if (status === 'Present') present += 1
    else if (status === 'Absent') absent += 1
    else if (status === 'Excused') excused += 1
    else notRecorded += 1
  }

  const developmentDue = connectedIds.filter((karkunId) => {
    const stage = guidance.find((item) => item.karkunId === karkunId)?.currentStage
    if (stage !== 'development') return false
    return !getDevelopmentAssessment(karkunId)?.indicators.ready_for_next_stage
  }).length

  const todayWork = resolveTodayWorkAction(snapshot)
  const execution = buildRuknExecutionSummary(ruknId)
  // Target is open visit work on the connected set — never inflated by connection count.
  const workloadOpen =
    execution.counts.pending + execution.counts.inProgress + execution.counts.followUpRequired
  const todayTarget = Math.min(3, workloadOpen)

  return {
    missionTitle: snapshot.nextAction.title,
    missionDetail: snapshot.nextAction.description,
    missionRoute: todayWork.route,
    planItems: snapshot.schedule.slice(0, 6).map((item) => ({
      id: item.id,
      title: item.title,
      time: item.time,
      route: item.route,
    })),
    kpis: [
      {
        id: 'pending',
        label: 'Pending',
        value: execution.counts.pending,
        hint: 'Visits waiting',
      },
      {
        id: 'today-target',
        label: "Today's Target",
        value: todayTarget,
        hint: 'Meaningful contacts',
      },
      {
        id: 'completed-today',
        label: 'Completed Today',
        value: execution.counts.completedToday,
        hint: 'Visits recorded today',
      },
      {
        id: 'follow-ups',
        label: 'Follow-ups Due',
        value: execution.counts.followUpRequired,
        hint: 'Need follow-up',
      },
      {
        id: 'my-connected',
        label: 'Connected Karkuns',
        value: connectedIds.length,
        hint: 'Active connections',
      },
    ],
    quickActions: [todayWork],
    journeyFunnel,
    todaysVisits: snapshot.schedule
      .filter((item) => item.karkunId || /visit|meeting/i.test(item.title))
      .slice(0, 6)
      .map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle ?? item.time,
        route: item.karkunId ? ruknVisitPath(item.karkunId) : item.route,
      })),
    attendanceStrip: { present, absent, excused, notRecorded },
    recentActivity: getRecentActivity(8)
      .filter((entry) => !entry.ruknId || entry.ruknId === ruknId)
      .map((entry) => ({
        id: entry.id,
        message: entry.message,
        timestamp: entry.timestamp,
      })),
    monthlyTarget: {
      connected: connectedIds.length,
      baitulMaalPaid: baitulMaal.paid,
      baitulMaalPending: baitulMaal.pending,
      developmentDue,
    },
  }
}

export function resolveVisitTargetName(karkunId?: string): string {
  if (!karkunId) return 'Karkun'
  return getKarkunById(karkunId)?.name ?? 'Karkun'
}

/** Prefer an active visit workflow route; fall back to Connected Karkuns. */
function resolveRecordVisitRoute(snapshot: RuknCommandCenterSnapshot): string {
  const nextRoute = snapshot.nextAction.route?.trim()
  if (
    nextRoute &&
    (/visit/i.test(snapshot.nextAction.actionLabel) ||
      /visit/i.test(snapshot.nextAction.title) ||
      nextRoute.includes('/visit/'))
  ) {
    return nextRoute
  }

  const scheduledVisit = snapshot.schedule.find((item) => item.karkunId)
  if (scheduledVisit?.karkunId) {
    return ruknVisitPath(scheduledVisit.karkunId)
  }

  if (scheduledVisit?.route) {
    return scheduledVisit.route
  }

  return snapshot.nextAction.route || ROUTES.RUKN_MY_KARKUN
}

/** Contextual CTA only — never module navigation (Connect / Connected / Record). */
function resolveTodayWorkAction(snapshot: RuknCommandCenterSnapshot): MissionControlQuickAction {
  const route = resolveRecordVisitRoute(snapshot)
  const label = snapshot.nextAction.actionLabel?.trim()
  const title = snapshot.nextAction.title?.trim() ?? ''
  const hasVisitRoute = route.includes('/visit/')

  if (snapshot.nextAction.isCaughtUp && !hasVisitRoute) {
    return {
      id: 'today-work',
      label: "Continue Today's Mission",
      route: ROUTES.RUKN_MY_KARKUN,
    }
  }

  if (hasVisitRoute || /visit/i.test(title) || (label && /visit/i.test(label))) {
    const isContinue = Boolean(label && /continue/i.test(label))
    return {
      id: isContinue ? 'continue-visit' : 'start-visit',
      label: isContinue ? "Continue Today's Mission" : 'Start First Visit',
      route,
    }
  }

  return {
    id: 'today-work',
    label: label || "Continue Today's Mission",
    route: snapshot.nextAction.route || ROUTES.RUKN_MY_KARKUN,
  }
}
