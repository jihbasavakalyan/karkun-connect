/**
 * Module 4 — Smart Work Queue
 * Prioritized work queue from Priority Intelligence + domain fallbacks.
 * Priority order: overdue visits → follow-ups → Weekly Ijtema → registration → BM → campaign.
 */

import { ROUTES, adminAssignmentsPath } from '@/constants/routes'
import { buildWorkQueue } from '@/lib/missionWorkspace/queueBuilder'
import { runPriorityEngine } from '@/lib/priorityIntelligence'
import { getPendingFollowUps } from '@/services/followUpService'
import { getTurnMetricsBundle } from '../turnMetricsCache'
import type { RafeeqAction, RafeeqRole } from '../types'
import { reason } from './explainability'
import type { WorkQueueTask, WorkQueueTaskPriority } from './types'

const CONTEXT_PRIORITY: Record<string, WorkQueueTaskPriority> = {
  'pending-visits': 1,
  'follow-up-pending': 2,
  'pending-weekly-ijtema': 3,
  'pending-jih-registration': 4,
  'pending-baitul-maal': 5,
}

function fallbackTasks(
  role: RafeeqRole,
  ruknId: string | null,
): WorkQueueTask[] {
  const bundle = getTurnMetricsBundle(ruknId)
  const tasks: WorkQueueTask[] = []
  const openVisits =
    role === 'administrator' ? adminAssignmentsPath() : ROUTES.RUKN_MY_KARKUN

  if (bundle.visits.pending > 0) {
    tasks.push({
      id: 'wq-visits',
      priority: 1,
      title: 'Overdue / pending visits',
      reason: `${bundle.visits.pending} visits pending`,
      why: [
        reason(
          'visits',
          `${bundle.visits.pending} pending visits`,
          'dashboardMetricsService.getDashboardVisitMetrics.pending',
        ),
      ],
      openRoute: openVisits,
      quickAction: {
        id: 'wq-open-visits',
        label: 'کھولیں',
        route: openVisits,
      },
      context: 'pending-visits',
    })
  }

  const followUps = getPendingFollowUps()
  if (followUps.length > 0) {
    tasks.push({
      id: 'wq-followups',
      priority: 2,
      title: 'Follow-ups',
      reason: `${followUps.length} follow-ups pending`,
      why: [
        reason(
          'followups',
          `${followUps.length} from followUpService`,
          'followUpService.getPendingFollowUps',
        ),
      ],
      openRoute: openVisits,
      quickAction: {
        id: 'wq-open-fu',
        label: 'فالو اپ',
        route: openVisits,
      },
      context: 'follow-up-pending',
    })
  }

  if (bundle.weeklyIjtemaHealth.moduleActive && bundle.weeklyIjtemaHealth.pct < 100) {
    const route =
      role === 'administrator'
        ? ROUTES.ADMIN_WEEKLY_IJTEMA
        : ROUTES.RUKN_WEEKLY_IJTEMA
    tasks.push({
      id: 'wq-ijtema',
      priority: 3,
      title: 'Upcoming Weekly Ijtema',
      reason: `Attendance ${bundle.weeklyIjtemaHealth.pct}%`,
      why: [
        reason(
          'ijtema',
          `Health ${bundle.weeklyIjtemaHealth.pct}%`,
          'getDashboardWeeklyIjtemaHealthSlice',
        ),
      ],
      openRoute: route,
      quickAction: { id: 'wq-open-ij', label: 'اجتماع', route },
      context: 'pending-weekly-ijtema',
    })
  }

  if (bundle.appRegistration.pending > 0) {
    tasks.push({
      id: 'wq-reg',
      priority: 4,
      title: 'Registration pending',
      reason: `${bundle.appRegistration.pending} still pending`,
      why: [
        reason(
          'reg',
          `${bundle.appRegistration.pending} pending`,
          'getDashboardAppRegistrationMetrics.pending',
        ),
      ],
      openRoute: openVisits,
      context: 'pending-jih-registration',
    })
  }

  if (bundle.baitulMaalHealth.moduleActive && bundle.baitulMaalHealth.pct < 100) {
    tasks.push({
      id: 'wq-bm',
      priority: 5,
      title: 'Baitul Maal follow-up',
      reason: `${bundle.baitulMaalHealth.pct}% complete`,
      why: [
        reason(
          'bm',
          `${bundle.baitulMaalHealth.pct}%`,
          'getDashboardMonthlyBaitulMaalHealthSlice',
        ),
      ],
      openRoute: role === 'administrator'
        ? ROUTES.ADMIN_MONTHLY_BAITUL_MAAL
        : ROUTES.RUKN_MONTHLY_BAITUL_MAAL,
      context: 'pending-baitul-maal',
    })
  }

  if (bundle.campaign.progressPct < 100) {
    tasks.push({
      id: 'wq-campaign',
      priority: 6,
      title: 'Remaining campaign tasks',
      reason: `Campaign at ${bundle.campaign.progressPct}%`,
      why: [
        reason(
          'campaign',
          `progressPct=${bundle.campaign.progressPct}`,
          'metricsService.getCampaignConnectionMetrics',
        ),
      ],
      openRoute: role === 'administrator' ? ROUTES.ADMIN : ROUTES.RUKN,
      context: 'campaign',
    })
  }

  return tasks
}

export function buildSmartWorkQueue(
  role: RafeeqRole,
  ruknId: string | null,
): readonly WorkQueueTask[] {
  const fromEngine: WorkQueueTask[] = []
  try {
    const snapshot = runPriorityEngine()
    const workItems = buildWorkQueue(snapshot)
    for (const item of workItems) {
      const priority: WorkQueueTaskPriority =
        CONTEXT_PRIORITY[item.context] ?? 6
      const openRoute =
        item.openRoute ??
        (role === 'administrator' ? adminAssignmentsPath() : ROUTES.RUKN_MY_KARKUN)
      const quick: RafeeqAction = {
        id: `wq-qa-${item.id}`,
        label: 'فوری عمل',
        route: openRoute,
      }
      fromEngine.push({
        id: item.id,
        priority,
        title: item.title,
        reason: item.reason,
        why: [
          reason(
            'pi',
            item.reason,
            'priorityIntelligence.runPriorityEngine + missionWorkspace.queueBuilder',
          ),
        ],
        openRoute,
        quickAction: quick,
        context: item.context,
      })
    }
  } catch {
    // fall through to metrics-derived queue
  }

  const tasks = fromEngine.length > 0 ? fromEngine : fallbackTasks(role, ruknId)
  return Object.freeze(
    [...tasks].sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title)),
  )
}

export function formatWorkQueueText(tasks: readonly WorkQueueTask[]): string {
  if (tasks.length === 0) return 'ابھی کوئی ترجیحی کام کی قطار نہیں۔'
  return [
    'ترجیحی کام کی قطار:',
    ...tasks.map(
      (t, i) =>
        `${i + 1}. [P${t.priority}] ${t.title}\n   وجہ: ${t.reason}`,
    ),
  ].join('\n')
}

export function workQueueActions(tasks: readonly WorkQueueTask[]): RafeeqAction[] {
  return tasks.slice(0, 6).flatMap((t) => {
    const open: RafeeqAction = {
      id: `open-${t.id}`,
      label: `کھولیں: ${t.title}`,
      route: t.openRoute,
      description: t.reason,
    }
    return t.quickAction ? [open, t.quickAction] : [open]
  })
}
