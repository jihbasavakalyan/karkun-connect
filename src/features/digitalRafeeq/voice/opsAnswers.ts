/**
 * Operational Q&A for Digital Rafeeq voice/text (KC-007).
 * Answers from live repositories/services — no hardcoded metrics.
 */

import { getPeopleStatistics } from '@/lib/peopleStore'
import { getTeamPerformanceRows } from '@/lib/commandCenterPresentation'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { getAssignmentDashboardMetrics } from '@/services/assignmentService'
import { getBaitulMaalDashboardMetrics, getRuknBaitulMaalMetrics } from '@/services/baitulMaalService'
import { getCurrentIjtemaAttendance, getIjtemaAttendanceDashboardMetrics } from '@/services/ijtemaAttendanceService'
import { getJihWebPortalDashboardMetrics } from '@/services/jihWebPortalService'
import { getActiveAssignmentsForRukn } from '@/stores/assignmentStore'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getDevelopmentAssessment } from '@/stores/developmentAssessmentStore'
import type { RuknCommandCenterSnapshot, AdminCommandCenterSnapshot } from '@/types/campaignAutomation.types'
import {
  ROUTES,
  adminAssignmentsPath,
  adminCompliancePath,
  adminExecutionPath,
  ruknVisitPath,
} from '@/constants/routes'

export type OpsAnswerAction = {
  id: string
  label: string
  route: string
}

export type OpsAnswer = {
  text: string
  actions: OpsAnswerAction[]
}

function normalize(query: string): string {
  return query.toLowerCase().trim()
}

function matches(query: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(query))
}

export function answerOperationalQuery(
  rawQuery: string,
  context: {
    role: 'administrator' | 'rukn'
    ruknId?: string
    adminSnapshot?: AdminCommandCenterSnapshot
    ruknSnapshot?: RuknCommandCenterSnapshot
  },
): OpsAnswer {
  const query = normalize(rawQuery)
  if (!query) {
    return {
      text: 'Please ask about visits, connections, attendance, follow-ups, or today’s priorities.',
      actions: [],
    }
  }

  if (context.role === 'administrator') {
    return answerAdminQuery(query, context.adminSnapshot)
  }
  return answerRuknQuery(query, context.ruknId ?? '', context.ruknSnapshot)
}

function answerAdminQuery(
  query: string,
  snapshot?: AdminCommandCenterSnapshot,
): OpsAnswer {
  const people = getPeopleStatistics()
  const assignments = getAssignmentDashboardMetrics()
  const ijtema = getIjtemaAttendanceDashboardMetrics()
  const baitulMaal = getBaitulMaalDashboardMetrics()
  const jih = getJihWebPortalDashboardMetrics()
  const team = getTeamPerformanceRows()

  if (matches(query, [/unconnected|remain|available|not connected|pending connection/])) {
    return {
      text: `${people.unassignedKarkuns} Karkuns remain unconnected. ${people.assignedKarkuns} are already connected.`,
      actions: [
        { id: 'connections', label: 'Open Connections', route: adminAssignmentsPath() },
        { id: 'execution', label: 'Open Execution', route: adminExecutionPath() },
      ],
    }
  }

  if (matches(query, [/rukn.*(attention|need|poor|weak|behind)|which rukn|leaderboard|performance/])) {
    const weakest = [...team].sort((a, b) => a.completionPct - b.completionPct)[0]
    const strongest = [...team].sort((a, b) => b.completionPct - a.completionPct)[0]
    if (!weakest) {
      return {
        text: 'No Rukn performance data is available yet.',
        actions: [{ id: 'connections', label: 'Open Connections', route: ROUTES.ADMIN_ASSIGNMENTS }],
      }
    }
    return {
      text: `${weakest.ruknName} needs attention (${weakest.completionPct}% completion, ${weakest.pendingWork} pending). Top performer: ${strongest.ruknName} (${strongest.completionPct}%).`,
      actions: [
        { id: 'rukn', label: 'Open Rukns', route: ROUTES.ADMIN_RUKN },
        { id: 'execution', label: 'Open Execution', route: adminExecutionPath() },
      ],
    }
  }

  if (matches(query, [/attendance|ijtema|missed/])) {
    return {
      text: `Weekly Ijtema: ${ijtema.present} present, ${ijtema.absent} absent, ${ijtema.excused} excused, ${ijtema.notRecorded} not recorded.`,
      actions: [
        { id: 'attendance', label: 'Open Attendance', route: adminCompliancePath('ijtema') },
        { id: 'reminder', label: 'Send Reminder', route: ROUTES.ADMIN_COMMUNICATION },
      ],
    }
  }

  if (matches(query, [/bait.?ul.?maal|contribution|target/])) {
    return {
      text: `Bait-ul-Maal compliance is ${baitulMaal.compliancePercentage}%. Pending: ${baitulMaal.pending}. Paid: ${baitulMaal.paid}.`,
      actions: [
        { id: 'baitul', label: 'Open Bait-ul-Maal', route: adminCompliancePath('baitul-maal') },
        { id: 'reminder', label: 'Send Reminder', route: ROUTES.ADMIN_COMMUNICATION },
      ],
    }
  }

  if (matches(query, [/follow.?up|overdue/])) {
    const overdue =
      snapshot?.followUpQueue.find((group) => group.section === 'overdue')?.items.length ?? 0
    return {
      text: `There are ${overdue} overdue follow-ups. Active connections: ${assignments.activeAssignments}.`,
      actions: [
        { id: 'follow-up', label: 'Open Follow-ups', route: ROUTES.ADMIN_FOLLOW_UP },
        { id: 'execution', label: 'Open Execution', route: adminExecutionPath() },
      ],
    }
  }

  if (matches(query, [/today|focus|priorit|should i|what.*(do|work)/])) {
    const title = snapshot?.nextAction.title ?? 'Review campaign priorities'
    const detail = snapshot?.nextAction.description ?? ''
    return {
      text: `Focus today: ${title}. ${detail}`.trim(),
      actions: [
        {
          id: 'mission',
          label: snapshot?.nextAction.actionLabel ?? 'Open Mission',
          route: snapshot?.nextAction.route ?? ROUTES.ADMIN,
        },
        { id: 'execution', label: 'Open Execution', route: adminExecutionPath() },
      ],
    }
  }

  if (matches(query, [/jih|registration/])) {
    return {
      text: `JIH portal: ${jih.registered} registered, ${jih.notRegistered} not registered, ${jih.pendingReports} pending reports.`,
      actions: [
        { id: 'jih', label: 'Open Compliance', route: adminCompliancePath('jih-portal') },
      ],
    }
  }

  return {
    text: `Campaign snapshot — Connected: ${people.assignedKarkuns}, Remaining: ${people.unassignedKarkuns}, Active Rukns with work: ${team.length}. Ask about visits, attendance, follow-ups, or Rukn performance.`,
    actions: [
      { id: 'connections', label: 'Open Connections', route: ROUTES.ADMIN_ASSIGNMENTS },
      { id: 'compliance', label: 'Open Compliance', route: ROUTES.ADMIN_COMPLIANCE },
    ],
  }
}

function answerRuknQuery(
  query: string,
  ruknId: string,
  snapshot?: RuknCommandCenterSnapshot,
): OpsAnswer {
  const assignments = getActiveAssignmentsForRukn(ruknId)
  const connectedIds = assignments.map((record) => record.karkunId)
  const guidance = getGuidanceForRuknKarkuns(ruknId)
  const baitulMaal = getRuknBaitulMaalMetrics(connectedIds)

  if (matches(query, [/today|focus|mission|should i|what.*(do|work)/])) {
    return {
      text: `${snapshot?.nextAction.title ?? 'Review your connected Karkuns'}. ${snapshot?.nextAction.description ?? ''}`.trim(),
      actions: [
        {
          id: 'mission',
          label: snapshot?.nextAction.actionLabel ?? "Today's Mission",
          route: snapshot?.nextAction.route ?? ROUTES.RUKN_MY_KARKUN,
        },
        { id: 'connected', label: 'Open Connections', route: ROUTES.RUKN_MY_KARKUN },
      ],
    }
  }

  if (matches(query, [/visit|meeting|overdue visit/])) {
    const visitItems = (snapshot?.schedule ?? []).filter(
      (item) => item.karkunId || /visit|meeting/i.test(item.title),
    )
    const names = visitItems
      .slice(0, 5)
      .map((item) => (item.karkunId ? getKarkunById(item.karkunId)?.name : item.title))
      .filter(Boolean)
    const firstId = visitItems.find((item) => item.karkunId)?.karkunId
    return {
      text:
        visitItems.length === 0
          ? 'No visits are queued in today’s schedule. Review connected Karkuns for pending meetings.'
          : `You have ${visitItems.length} visit-related items today${names.length ? `: ${names.join(', ')}` : ''}.`,
      actions: [
        ...(firstId
          ? [{ id: 'record', label: 'Record Visit', route: ruknVisitPath(firstId) }]
          : []),
        { id: 'connected', label: 'Open Connections', route: ROUTES.RUKN_MY_KARKUN },
        { id: 'schedule', label: 'Schedule Visit', route: ROUTES.RUKN_MY_KARKUN },
      ],
    }
  }

  if (matches(query, [/ijtema|attendance|missed/])) {
    const missed = connectedIds.filter((id) => {
      const status = getCurrentIjtemaAttendance(id).status
      return status === 'Absent' || status === 'Not recorded'
    })
    const names = missed
      .slice(0, 5)
      .map((id) => getKarkunById(id)?.name)
      .filter(Boolean)
    return {
      text:
        missed.length === 0
          ? 'All connected Karkuns have Present or Excused attendance this week.'
          : `${missed.length} need attendance attention${names.length ? `: ${names.join(', ')}` : ''}.`,
      actions: [
        { id: 'attendance', label: 'Open Attendance', route: ROUTES.RUKN },
        { id: 'reminder', label: 'Send Reminder', route: ROUTES.RUKN_MY_KARKUN },
      ],
    }
  }

  if (matches(query, [/registration|jih/])) {
    const pending = connectedIds.filter((id) => {
      const karkun = getKarkunById(id)
      return karkun && karkun.jihAppRegistrationStatus !== 'Registered'
    })
    const names = pending
      .slice(0, 5)
      .map((id) => getKarkunById(id)?.name)
      .filter(Boolean)
    return {
      text:
        pending.length === 0
          ? 'All connected Karkuns appear registered on JIH.'
          : `${pending.length} pending registration${names.length ? `: ${names.join(', ')}` : ''}.`,
      actions: [{ id: 'connected', label: 'Open Connections', route: ROUTES.RUKN_MY_KARKUN }],
    }
  }

  if (matches(query, [/bait.?ul.?maal|contribution/])) {
    return {
      text: `Bait-ul-Maal for your connections — Pending: ${baitulMaal.pending}, Paid: ${baitulMaal.paid}, Exempt: ${baitulMaal.exempt}.`,
      actions: [
        { id: 'baitul', label: 'Open Bait-ul-Maal', route: ROUTES.RUKN_MY_KARKUN },
        { id: 'reminder', label: 'Send Reminder', route: ROUTES.RUKN_MY_KARKUN },
      ],
    }
  }

  if (matches(query, [/development|tarbiyah|assessment|performance|overall/])) {
    const due = connectedIds.filter((id) => {
      const stage = guidance.find((item) => item.karkunId === id)?.currentStage
      if (stage !== 'development') return false
      return !getDevelopmentAssessment(id)?.indicators.ready_for_next_stage
    }).length
    return {
      text: `You have ${connectedIds.length} connected Karkuns. ${due} development assessments are due. Journey stages are tracked on each connection.`,
      actions: [{ id: 'connected', label: 'Open Connections', route: ROUTES.RUKN_MY_KARKUN }],
    }
  }

  if (matches(query, [/follow.?up/])) {
    const count = snapshot?.followUpQueue.reduce((sum, group) => sum + group.items.length, 0) ?? 0
    return {
      text: `You have ${count} follow-up items across your queues.`,
      actions: [{ id: 'connected', label: 'Open Connections', route: ROUTES.RUKN_MY_KARKUN }],
    }
  }

  return {
    text: `You have ${connectedIds.length} connected Karkuns. Ask about today’s mission, visits, Ijtema, registration, or Bait-ul-Maal.`,
    actions: [
      { id: 'connected', label: 'Open Connections', route: ROUTES.RUKN_MY_KARKUN },
      { id: 'connect', label: 'Connect Karkun', route: ROUTES.RUKN_AVAILABLE_KARKUN },
    ],
  }
}

export const SUGGESTED_QUESTIONS_ADMIN = [
  'How many Karkuns remain unconnected?',
  'Which Rukn needs attention?',
  'Show poor attendance.',
  'What should I focus on today?',
] as const

export const SUGGESTED_QUESTIONS_RUKN = [
  'What should I do today?',
  'Who needs a visit?',
  'Who missed Ijtema?',
  'Which Karkun has pending registration?',
  'What is my development progress?',
] as const
