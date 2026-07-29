/**
 * Module 5 — Personal Dashboard
 * Personalized operational snapshot from existing metrics (role/rukn scoped).
 */

import { ROUTES, adminAssignmentsPath } from '@/constants/routes'
import { getPendingFollowUps } from '@/services/followUpService'
import { getTurnMetricsBundle } from '../turnMetricsCache'
import type { RafeeqRole } from '../types'
import { reason } from './explainability'
import type { PersonalDashboardSnapshot } from './types'

export function buildPersonalDashboard(
  role: RafeeqRole,
  ruknId: string | null,
): PersonalDashboardSnapshot {
  const bundle = getTurnMetricsBundle(ruknId)
  const followUps = getPendingFollowUps().length
  const pending =
    bundle.visits.pending +
    followUps +
    bundle.appRegistration.pending
  const completedToday =
    bundle.visits.submittedToday +
    (bundle.assignments.assignmentsToday ?? 0)
  const todaysWork = pending + completedToday
  const completionPct =
    todaysWork > 0 ? Math.round((completedToday / todaysWork) * 100) : 0

  const attendanceHeadline = bundle.weeklyIjtemaHealth.moduleActive
    ? `Attendance ${bundle.weeklyIjtemaHealth.pct}%`
    : 'Weekly Ijtema inactive'
  const messagesHeadline =
    bundle.pendingCount > 0
      ? `${bundle.pendingCount} inbox request(s)`
      : 'No pending inbox requests'
  const campaignHeadline = `Campaign ${bundle.campaign.progressPct}% (${bundle.campaign.connected}/${bundle.campaign.total})`

  const actions =
    role === 'administrator'
      ? [
          { id: 'pd-assign', label: 'روابط', route: adminAssignmentsPath() },
          { id: 'pd-ijtema', label: 'اجتماع', route: ROUTES.ADMIN_WEEKLY_IJTEMA },
          { id: 'pd-inbox', label: 'پیغامات', route: ROUTES.ADMIN_INBOX },
        ]
      : [
          { id: 'pd-my', label: 'آج کا کام', route: ROUTES.RUKN_MY_KARKUN },
          { id: 'pd-ijtema', label: 'حاضری', route: ROUTES.RUKN_WEEKLY_IJTEMA },
        ]

  return {
    todaysWork,
    completedToday,
    pending,
    completionPct,
    visitsPending: bundle.visits.pending,
    followUpsPending: followUps,
    attendanceHeadline,
    messagesHeadline,
    campaignHeadline,
    why: [
      reason('visits', 'Visit pending/completed today', 'getDashboardVisitMetrics'),
      reason('assignments', 'Assignments today', 'getAssignmentDashboardMetrics'),
      reason('followups', 'Pending follow-ups', 'getPendingFollowUps'),
      reason('campaign', 'Campaign progress', 'getCampaignConnectionMetrics'),
    ],
    actions: Object.freeze(actions),
  }
}

export function formatPersonalDashboardText(
  snap: PersonalDashboardSnapshot,
): string {
  return [
    'ذاتی ڈیش بورڈ',
    `• Today's Work: ${snap.todaysWork}`,
    `• Completed Today: ${snap.completedToday}`,
    `• Pending: ${snap.pending}`,
    `• Completion: ${snap.completionPct}%`,
    `• Visits pending: ${snap.visitsPending}`,
    `• Follow-ups: ${snap.followUpsPending}`,
    `• ${snap.attendanceHeadline}`,
    `• ${snap.messagesHeadline}`,
    `• ${snap.campaignHeadline}`,
  ].join('\n')
}
