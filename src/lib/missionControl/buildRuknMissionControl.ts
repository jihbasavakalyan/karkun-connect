/**
 * Rukn Mission Control snapshot — real repositories/services only (KC-007).
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { getRuknBaitulMaalMetrics } from '@/services/baitulMaalService'
import { getCurrentIjtemaAttendance } from '@/services/ijtemaAttendanceService'
import { getDevelopmentAssessment } from '@/stores/developmentAssessmentStore'
import { getRecentActivity } from '@/stores/activityLogStore'
import { getActiveAssignmentsForRukn } from '@/stores/assignmentStore'
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
  const assignments = getActiveAssignmentsForRukn(ruknId)
  const connectedIds = assignments.map((record) => record.karkunId)
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

  const visitsDue = snapshot.schedule.filter((item) =>
    /visit|meeting/i.test(item.title),
  ).length

  const developmentDue = connectedIds.filter((karkunId) => {
    const stage = guidance.find((item) => item.karkunId === karkunId)?.currentStage
    if (stage !== 'development') return false
    return !getDevelopmentAssessment(karkunId)?.indicators.ready_for_next_stage
  }).length

  const availablePoolHint = Math.max(0, 0) // Remaining for this Rukn = not assigned to them; show connect CTA
  void availablePoolHint

  return {
    missionTitle: snapshot.nextAction.title,
    missionDetail: snapshot.nextAction.description,
    missionRoute: snapshot.nextAction.route || ROUTES.RUKN_MY_KARKUN,
    planItems: snapshot.schedule.slice(0, 6).map((item) => ({
      id: item.id,
      title: item.title,
      time: item.time,
      route: item.route,
    })),
    kpis: [
      {
        id: 'my-connected',
        label: 'My Connected',
        value: connectedIds.length,
        route: ROUTES.RUKN_MY_KARKUN,
      },
      {
        id: 'remaining',
        label: 'Remaining',
        value: 'Connect more',
        hint: 'Open Connect',
        route: ROUTES.RUKN_AVAILABLE_KARKUN,
      },
      {
        id: 'visits-due',
        label: 'Visits Due',
        value: visitsDue,
        route: ROUTES.RUKN_MY_KARKUN,
      },
      {
        id: 'attendance',
        label: 'Attendance',
        value: `${present}/${connectedIds.length || 0}`,
        hint: `${notRecorded} not recorded`,
        route: ROUTES.RUKN,
      },
      {
        id: 'baitul-maal',
        label: 'Bait-ul-Maal',
        value: baitulMaal.pending,
        hint: 'Pending this month',
        route: ROUTES.RUKN_MY_KARKUN,
      },
      {
        id: 'development',
        label: 'Development Progress',
        value: developmentDue,
        hint: 'Assessments due',
        route: ROUTES.RUKN_MY_KARKUN,
      },
    ],
    quickActions: [
      { id: 'connect', label: 'Connect', route: ROUTES.RUKN_AVAILABLE_KARKUN },
      { id: 'connected', label: 'Connected', route: ROUTES.RUKN_MY_KARKUN },
      { id: 'record', label: 'Record', route: ROUTES.RUKN_CAMPAIGN_RECORD },
      {
        id: 'record-visit',
        label: 'Record Visit',
        route: resolveRecordVisitRoute(snapshot),
      },
    ],
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

  return ROUTES.RUKN_MY_KARKUN
}
