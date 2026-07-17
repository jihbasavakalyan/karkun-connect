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

function conversational(body: string): string {
  const clean = body.trim()
  if (!clean) return clean
  if (/السلام علیکم/.test(clean)) return clean
  return `السلام علیکم\n\n${clean}`
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
      text: conversational(
        `${people.unassignedKarkuns} Karkuns remain unconnected, while ${people.assignedKarkuns} are already connected. I recommend focusing Connections on the remaining pool next.`,
      ),
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
        text: conversational('Rukn performance data is not available yet. Once connections begin, I will highlight who needs support.'),
        actions: [{ id: 'connections', label: 'Open Connections', route: ROUTES.ADMIN_ASSIGNMENTS }],
      }
    }
    return {
      text: conversational(
        `${weakest.ruknName} needs attention right now (${weakest.completionPct}% completion, ${weakest.pendingWork} pending). ${strongest.ruknName} is currently leading at ${strongest.completionPct}%.`,
      ),
      actions: [
        { id: 'rukn', label: 'Open Rukns', route: ROUTES.ADMIN_RUKN },
        { id: 'execution', label: 'Open Execution', route: adminExecutionPath() },
      ],
    }
  }

  if (matches(query, [/attendance|ijtema|missed/])) {
    return {
      text: conversational(
        `This week’s Ijtema picture: ${ijtema.present} present, ${ijtema.absent} absent, ${ijtema.excused} excused, and ${ijtema.notRecorded} not yet recorded. Attendance follow-up will strengthen participation.`,
      ),
      actions: [
        { id: 'attendance', label: 'Open Attendance', route: adminCompliancePath('ijtema') },
        { id: 'reminder', label: 'Send Reminder', route: ROUTES.ADMIN_COMMUNICATION },
      ],
    }
  }

  if (matches(query, [/bait.?ul.?maal|contribution|target/])) {
    return {
      text: conversational(
        `Bait-ul-Maal compliance is at ${baitulMaal.compliancePercentage}%. ${baitulMaal.pending} are pending and ${baitulMaal.paid} are paid. A gentle reminder wave will help close the month calmly.`,
      ),
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
      text: conversational(
        `There ${overdue === 1 ? 'is' : 'are'} ${overdue} overdue follow-up${overdue === 1 ? '' : 's'} across ${assignments.activeAssignments} active connections. Clearing these first will restore campaign rhythm.`,
      ),
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
      text: conversational(
        `For today, I recommend this focus: ${title}${detail ? `. ${detail}` : ''}`,
      ),
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
      text: conversational(
        `JIH registration status: ${jih.registered} registered, ${jih.notRegistered} not registered, and ${jih.pendingReports} pending reports. Supporting registrations will unlock the next journey stages.`,
      ),
      actions: [
        { id: 'jih', label: 'Open Compliance', route: adminCompliancePath('jih-portal') },
      ],
    }
  }

  return {
    text: conversational(
      `Campaign snapshot — ${people.assignedKarkuns} connected, ${people.unassignedKarkuns} remaining, and ${team.length} Rukns with active work. Ask me about visits, attendance, follow-ups, or Rukn performance.`,
    ),
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
      text: conversational(
        `${snapshot?.nextAction.title ?? 'Review your connected Karkuns'}${
          snapshot?.nextAction.description ? `. ${snapshot.nextAction.description}` : ''
        }`,
      ),
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
      .filter(Boolean) as string[]
    const firstId = visitItems.find((item) => item.karkunId)?.karkunId
    const recommendation =
      names.length > 0
        ? ` I recommend completing ${names.slice(0, 3).join(', ')} first.`
        : ''
    return {
      text: conversational(
        visitItems.length === 0
          ? 'No visits are queued in today’s schedule. A quick review of connected Karkuns will show who needs a meeting next.'
          : `Today you have ${visitItems.length} pending visit${visitItems.length === 1 ? '' : 's'}.${recommendation}`,
      ),
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
      .filter(Boolean) as string[]
    return {
      text: conversational(
        missed.length === 0
          ? 'Alhamdulillah — all connected Karkuns are Present or Excused for this week’s Ijtema.'
          : `${missed.length} Karkun${missed.length === 1 ? '' : 's'} need attendance attention${
              names.length ? `: ${names.join(', ')}` : ''
            }. A short reminder will help.`,
      ),
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
      .filter(Boolean) as string[]
    return {
      text: conversational(
        pending.length === 0
          ? 'All connected Karkuns appear registered on JIH. You can move attention to visits and development.'
          : `${pending.length} still need registration support${
              names.length ? `: ${names.join(', ')}` : ''
            }.`,
      ),
      actions: [{ id: 'connected', label: 'Open Connections', route: ROUTES.RUKN_MY_KARKUN }],
    }
  }

  if (matches(query, [/bait.?ul.?maal|contribution/])) {
    return {
      text: conversational(
        `For your connections, Bait-ul-Maal shows ${baitulMaal.pending} pending, ${baitulMaal.paid} paid, and ${baitulMaal.exempt} exempt. A calm reminder helps close the month.`,
      ),
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
      text: conversational(
        `You are accompanying ${connectedIds.length} connected Karkuns. ${due} development assessment${due === 1 ? '' : 's'} ${due === 1 ? 'is' : 'are'} due — take them one by one with care.`,
      ),
      actions: [{ id: 'connected', label: 'Open Connections', route: ROUTES.RUKN_MY_KARKUN }],
    }
  }

  if (matches(query, [/follow.?up/])) {
    const count = snapshot?.followUpQueue.reduce((sum, group) => sum + group.items.length, 0) ?? 0
    return {
      text: conversational(
        `You have ${count} follow-up item${count === 1 ? '' : 's'} waiting. Clearing even a few today will keep relationships warm.`,
      ),
      actions: [{ id: 'connected', label: 'Open Connections', route: ROUTES.RUKN_MY_KARKUN }],
    }
  }

  return {
    text: conversational(
      `You currently have ${connectedIds.length} connected Karkuns. Ask me about today’s mission, visits, Ijtema, registration, or Bait-ul-Maal.`,
    ),
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
