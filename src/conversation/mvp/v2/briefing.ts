/**
 * Module 2 — Daily Briefing
 * Composes a complete operational briefing from existing metrics only.
 */

import { ROUTES, adminAssignmentsPath, adminExecutionPath } from '@/constants/routes'
import { getPendingFollowUps } from '@/services/followUpService'
import { getTurnMetricsBundle } from '../turnMetricsCache'
import type { RafeeqAction, RafeeqRole } from '../types'
import { deriveCampaignInsights } from '../campaignIntelligence/insights'
import { reason } from './explainability'
import type { BriefingSection } from './types'

export function buildDailyBriefing(
  role: RafeeqRole,
  ruknId: string | null,
): {
  readonly title: string
  readonly sections: readonly BriefingSection[]
  readonly why: ReturnType<typeof reason>[]
  readonly text: string
  readonly actions: readonly RafeeqAction[]
} {
  const bundle = getTurnMetricsBundle(ruknId)
  const followUps = getPendingFollowUps().length
  const insights = deriveCampaignInsights(bundle)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'صبح بخیر' : 'السلام علیکم'

  const suggestedActions: RafeeqAction[] =
    role === 'administrator'
      ? [
          { id: 'br-visits', label: 'روابط / ملاقاتیں', route: adminAssignmentsPath() },
          { id: 'br-exec', label: 'عملدرآمد', route: adminExecutionPath() },
          { id: 'br-ijtema', label: 'ہفتہ وار اجتماع', route: ROUTES.ADMIN_WEEKLY_IJTEMA },
          { id: 'br-inbox', label: 'ان باکس', route: ROUTES.ADMIN_INBOX },
        ]
      : [
          { id: 'br-my', label: 'میرے کارکنان', route: ROUTES.RUKN_MY_KARKUN },
          { id: 'br-ijtema', label: 'ہفتہ وار اجتماع', route: ROUTES.RUKN_WEEKLY_IJTEMA },
          { id: 'br-avail', label: 'دستیاب', route: ROUTES.RUKN_AVAILABLE_KARKUN },
        ]

  const sections: BriefingSection[] = [
    {
      id: 'priorities',
      title: "Today's Priorities",
      lines: [
        `Pending visits: ${bundle.visits.pending}`,
        `Follow-ups: ${followUps}`,
        `Campaign: ${bundle.campaign.progressPct}%`,
        ...insights.slice(0, 2),
      ],
      actions: suggestedActions.slice(0, 2),
    },
    {
      id: 'visits',
      title: 'Pending Visits',
      lines: [
        `Pending ${bundle.visits.pending} / Planned ${bundle.visits.planned}`,
        `Completed ${bundle.visits.completed} (${bundle.visits.pct}%)`,
        `Submitted today ${bundle.visits.submittedToday}`,
      ],
      actions: [suggestedActions[0]!],
    },
    {
      id: 'followups',
      title: "Today's Follow-ups",
      lines: [
        followUps > 0
          ? `${followUps} follow-up(s) pending`
          : 'No pending follow-ups',
      ],
      actions: [],
    },
    {
      id: 'attendance',
      title: 'Attendance Summary',
      lines: bundle.weeklyIjtemaHealth.moduleActive
        ? [
            `Weekly Ijtema ${bundle.weeklyIjtemaHealth.pct}% (${bundle.weeklyIjtemaHealth.current}/${bundle.weeklyIjtemaHealth.total})`,
          ]
        : ['Weekly Ijtema module not active'],
      actions: [
        {
          id: 'br-att',
          label: 'حاضری',
          route:
            role === 'administrator'
              ? ROUTES.ADMIN_WEEKLY_IJTEMA
              : ROUTES.RUKN_WEEKLY_IJTEMA,
        },
      ],
    },
    {
      id: 'campaign',
      title: 'Campaign Progress',
      lines: [
        `${bundle.campaign.connected}/${bundle.campaign.total} connected (${bundle.campaign.progressPct}%)`,
      ],
      actions: [],
    },
    {
      id: 'ijtema',
      title: 'Weekly Ijtema Status',
      lines: [
        bundle.weeklyIjtemaHealth.moduleActive
          ? `Active — ${bundle.weeklyIjtemaHealth.pct}%`
          : 'Inactive',
      ],
      actions: [],
    },
    {
      id: 'registration',
      title: 'Registration Progress',
      lines: [
        `Registered ${bundle.appRegistration.registered}/${bundle.appRegistration.eligible} (${bundle.appRegistration.pct}%)`,
        `Pending ${bundle.appRegistration.pending}`,
      ],
      actions: [],
    },
    {
      id: 'bm',
      title: 'Baitul Maal Status',
      lines: bundle.baitulMaalHealth.moduleActive
        ? [
            `${bundle.baitulMaalHealth.pct}% (${bundle.baitulMaalHealth.current}/${bundle.baitulMaalHealth.total})`,
          ]
        : ['Module not active'],
      actions: [],
    },
    {
      id: 'suggested',
      title: 'Suggested Actions',
      lines: insights.slice(0, 3),
      actions: suggestedActions,
    },
  ]

  const text = [
    greeting,
    '',
    ...sections.flatMap((s) => [`## ${s.title}`, ...s.lines.map((l) => `• ${l}`), '']),
  ].join('\n')

  const why = [
    reason('visits', 'Visit metrics', 'dashboardMetricsService.getDashboardVisitMetrics'),
    reason('campaign', 'Campaign metrics', 'metricsService.getCampaignConnectionMetrics'),
    reason('followups', 'Follow-ups', 'followUpService.getPendingFollowUps'),
    reason('ijtema', 'Weekly Ijtema health', 'getDashboardWeeklyIjtemaHealthSlice'),
    reason('registration', 'App registration', 'getDashboardAppRegistrationMetrics'),
    reason('bm', 'Baitul Maal health', 'getDashboardMonthlyBaitulMaalHealthSlice'),
  ]

  return {
    title: greeting,
    sections: Object.freeze(sections),
    why,
    text,
    actions: Object.freeze(suggestedActions),
  }
}
