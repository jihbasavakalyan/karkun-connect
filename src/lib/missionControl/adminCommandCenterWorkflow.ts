/**
 * KC-0127 — Admin Command Center workflow presentation helpers.
 * Reuses existing metrics / health / delivery counts. No calculation changes.
 */

import {
  ROUTES,
  adminAssignmentsPath,
  adminCompliancePath,
  adminExecutionPath,
  adminFollowUpPath,
  adminKarkunPendingRequestsPath,
  adminMonthlyBaitulMaalPath,
  adminWeeklyIjtemaPath,
} from '@/constants/routes'
import { adminKarkunRegistryPath } from '@/lib/peopleRegistryNavigation'
import {
  buildAdminCampaignAchievementProgress,
  buildAdminCampaignTrends,
  type CampaignAchievementMetric,
} from '@/lib/missionControl/adminMissionControlPresentation'
import { getPeopleStatistics, getAllKarkuns } from '@/lib/peopleStore'
import { getDeliverySummary } from '@/services/deliveryService'
import {
  getDashboardAppRegistrationMetrics,
  getDashboardVisitMetrics,
} from '@/services/dashboardMetricsService'
import { getFollowUpDashboardMetrics } from '@/services/followUpService'
import { getMonthlyBaitulMaalDashboardKpi } from '@/services/monthlyBaitulMaalService'
import { getWeeklyIjtemaDashboardKpi } from '@/services/weeklyIjtemaService'
import { getPendingKarkunRequests } from '@/services/karkunRequestService'
import { runRegistryHealthScan } from '@/services/registryHealthService'
import { hasContinuousDevelopmentSignal } from '@/lib/journey/continuousKarkunJourney'
import { hasParticipationSignal } from '@/lib/guidance/journeyEngine'
import { isWorkOverdue, todayWorkCalendarDate } from '@/lib/work/ruknActionItems'
import { canActOnWork } from '@/lib/work/permissions'
import { unwrapRepository } from '@/repositories/errors'
import { getRepositories } from '@/repositories/provider'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'

export type CommandCenterLinkItem = {
  id: string
  label: string
  count: number
  description: string
  route: string
  tone?: 'default' | 'warn' | 'critical'
}

export type CampaignProgressCard = CampaignAchievementMetric & {
  route: string
  trend?: string
}

export type QuickActionItem = {
  id: string
  label: string
  route: string
  icon: 'plus' | 'users' | 'link' | 'flag' | 'refresh' | 'sprout' | 'calendar' | 'handshake'
}

/** Next Actions — pending operational queues with deep links. */
export function buildAdminNextActions(): CommandCenterLinkItem[] {
  const ijtema = getWeeklyIjtemaDashboardKpi()
  const visits = getDashboardVisitMetrics()
  const followUps = getFollowUpDashboardMetrics()
  const app = getDashboardAppRegistrationMetrics()
  const baitul = getMonthlyBaitulMaalDashboardKpi()
  const pendingRequests = getPendingKarkunRequests().length
  const unassigned = getPeopleStatistics().unassignedKarkuns

  const items: CommandCenterLinkItem[] = [
    {
      id: 'weekly-ijtema',
      label: 'Pending Weekly Ijtema follow-ups',
      count: ijtema.ruknsPending,
      description: 'Rukns still needing attendance submission',
      route: adminWeeklyIjtemaPath(),
      tone: ijtema.ruknsPending >= 5 ? 'warn' : 'default',
    },
    {
      id: 'visit-followups',
      label: 'Pending Visit follow-ups',
      count: Math.max(followUps.pendingFollowUps, visits.pending),
      description: 'Visits and follow-ups awaiting completion',
      route: adminFollowUpPath(),
      tone: followUps.pendingFollowUps >= 10 ? 'critical' : 'warn',
    },
    {
      id: 'app-registration',
      label: 'Pending App Registration',
      count: app.pending,
      description: 'Eligible Karkuns not yet registered',
      route: adminCompliancePath('jih-portal'),
      tone: app.pending >= 10 ? 'warn' : 'default',
    },
    {
      id: 'baitul-maal',
      label: 'Pending Baitul Maal commitments',
      count: Math.max(baitul.pending, baitul.ruknsPending),
      description: 'Contributions still pending this cycle',
      route: adminMonthlyBaitulMaalPath(),
      tone: baitul.pending >= 10 ? 'warn' : 'default',
    },
    {
      id: 'awaiting-assignment',
      label: 'Newly added Karkuns awaiting assignment',
      count: unassigned,
      description: 'Not Connected Karkuns ready for a Rukn',
      route: adminKarkunRegistryPath({ assignmentStatus: 'Unassigned' }),
      tone: unassigned >= 10 ? 'warn' : 'default',
    },
    {
      id: 'pending-approvals',
      label: 'Pending approval requests',
      count: pendingRequests,
      description: 'New Karkun requests awaiting review',
      route: adminKarkunPendingRequestsPath(),
      tone: pendingRequests >= 5 ? 'warn' : 'default',
    },
  ]

  return items.filter((item) => item.count > 0)
}

/** Attention Required — registry / data quality / delivery issues. */
export function buildAdminAttentionRequired(): CommandCenterLinkItem[] {
  const stats = getPeopleStatistics()
  const health = runRegistryHealthScan()
  const incompleteProfiles = getAllKarkuns(false).filter(
    (k) => !k.isArchived && Boolean(k.needsReview),
  ).length
  const failedDeliveries = getDeliverySummary().failed

  const items: CommandCenterLinkItem[] = [
    {
      id: 'unassigned',
      label: 'Not Connected Karkuns',
      count: stats.unassignedKarkuns,
      description: 'People without an active Rukn connection',
      route: adminKarkunRegistryPath({ assignmentStatus: 'Unassigned' }),
      tone: 'warn',
    },
    {
      id: 'duplicate-mobiles',
      label: 'Duplicate mobile numbers',
      count: health.duplicateChecks.duplicateMobiles,
      description: 'Registry records sharing the same mobile',
      route: `${ROUTES.ADMIN_SETTINGS}?section=data`,
      tone: 'critical',
    },
    {
      id: 'missing-mobiles',
      label: 'Missing mobile numbers',
      count: health.dataQuality.missingMobile,
      description: 'Active records without a usable mobile',
      route: `${ROUTES.ADMIN_SETTINGS}?section=maintenance`,
      tone: 'warn',
    },
    {
      id: 'incomplete-profiles',
      label: 'Incomplete profiles',
      count: incompleteProfiles,
      description: 'Records flagged Needs Review',
      route: adminKarkunRegistryPath({ registryLifecycle: 'needs_review' }),
      tone: 'warn',
    },
  ]

  if (failedDeliveries > 0) {
    items.push({
      id: 'failed-deliveries',
      label: 'Failed communication deliveries',
      count: failedDeliveries,
      description: 'Messages that did not deliver',
      route: ROUTES.ADMIN_COMMUNICATION_HISTORY,
      tone: 'critical',
    })
  }

  const asOfDate = todayWorkCalendarDate()
  const overdueWork = unwrapRepository(getRepositories().work.loadAll(), []).filter(
    (row) => row.status !== 'done' && isWorkOverdue(row.dueDate, asOfDate),
  ).length
  if (overdueWork > 0) {
    items.push({
      id: 'overdue-work',
      label: 'Overdue work',
      count: overdueWork,
      description: 'Work past its due date still not done',
      route: ROUTES.ADMIN_PLANNING,
      tone: 'critical',
    })
  }

  const connectedWithoutDevelopment = getAllKarkuns(false).filter((karkun) => {
    if (karkun.isArchived) return false
    const assignmentId = getActiveAssignmentsForKarkun(karkun.id)[0]?.assignmentId
    if (!assignmentId) return false
    return !hasContinuousDevelopmentSignal(karkun, assignmentId)
  }).length
  if (connectedWithoutDevelopment > 0) {
    items.push({
      id: 'connection-without-development',
      label: 'Connected without development',
      count: connectedWithoutDevelopment,
      description: 'Connected Karkuns with no visit, orientation, or JIH signal yet',
      route: adminAssignmentsPath(),
      tone: 'warn',
    })
  }

  const developedWithoutParticipation = getAllKarkuns(false).filter((karkun) => {
    if (karkun.isArchived) return false
    const assignmentId = getActiveAssignmentsForKarkun(karkun.id)[0]?.assignmentId
    if (!assignmentId) return false
    if (!hasContinuousDevelopmentSignal(karkun, assignmentId)) return false
    return !hasParticipationSignal(karkun)
  }).length
  if (developedWithoutParticipation > 0) {
    items.push({
      id: 'developed-without-participation',
      label: 'Developed without participation',
      count: developedWithoutParticipation,
      description: 'Development signals exist, but Ijtema participation is still open',
      route: adminWeeklyIjtemaPath(),
      tone: 'warn',
    })
  }

  const responsibilities = unwrapRepository(getRepositories().responsibility.loadAll(), [])
  const unactionableWork = unwrapRepository(getRepositories().work.loadAll(), []).filter((row) => {
    if (row.status === 'done') return false
    return !canActOnWork(
      { role: 'rukn', ruknId: row.ruknId },
      row,
      responsibilities,
      asOfDate,
    )
  }).length
  if (unactionableWork > 0) {
    items.push({
      id: 'work-without-in-force-responsibility',
      label: 'Work without in-force responsibility',
      count: unactionableWork,
      description: 'Open Work the assigned Rukn cannot act on — missing or not-in-force Responsibility',
      route: ROUTES.ADMIN_PLANNING,
      tone: 'critical',
    })
  }

  return items.filter((item) => item.count > 0)
}

const PROGRESS_ROUTES: Record<string, string> = {
  connected: adminKarkunRegistryPath({ assignmentStatus: 'Assigned' }),
  visit: adminExecutionPath('pending'),
  app: adminCompliancePath('jih-portal'),
  ijtema: adminWeeklyIjtemaPath(),
  baitul: adminMonthlyBaitulMaalPath(),
}

const PROGRESS_LABELS: Record<string, string> = {
  connected: 'Connected',
  visit: 'Visit Conducted',
  app: 'App Registered',
  ijtema: 'Weekly Ijtema',
  baitul: 'Baitul Maal',
}

/** Campaign Progress — five achievement metrics with deep links (existing arithmetic). */
export function buildAdminCampaignProgressCards(): CampaignProgressCard[] {
  const progress = buildAdminCampaignAchievementProgress()
  const trends = buildAdminCampaignTrends()
  const connectionTrend = trends.find((t) => t.id === 'engagement')?.detail
  const visitTrend = trends.find((t) => t.id === 'daily-visits')?.detail

  return progress.metrics.map((metric) => ({
    ...metric,
    label: PROGRESS_LABELS[metric.id] ?? metric.label,
    route: PROGRESS_ROUTES[metric.id] ?? ROUTES.ADMIN_KARKUN,
    trend:
      metric.id === 'connected'
        ? connectionTrend
        : metric.id === 'visit'
          ? visitTrend
          : undefined,
  }))
}

/** Sticky Quick Actions — navigation only. Organisational shortcuts, not a hierarchy. */
export function buildAdminQuickActions(): QuickActionItem[] {
  return [
    {
      id: 'add-karkun',
      label: 'کارکن شامل کریں',
      route: adminKarkunRegistryPath({ action: 'add' }),
      icon: 'plus',
    },
    {
      id: 'add-muttafiq',
      label: 'متفق شامل کریں',
      route: `${ROUTES.ADMIN_MUTTAFIQEEN}?action=add`,
      icon: 'users',
    },
    {
      id: 'assign-rukn',
      label: 'رکن تفویض کریں',
      route: adminAssignmentsPath({ view: 'assign' }),
      icon: 'link',
    },
    {
      id: 'assign-responsible',
      label: 'ذمہ داری شامل کریں',
      route: ROUTES.ADMIN_PLANNING,
      icon: 'flag',
    },
    {
      id: 'update-activity',
      label: 'سرگرمی کی تازہ کاری',
      route: ROUTES.ADMIN_PLANNING,
      icon: 'refresh',
    },
    {
      id: 'tarbiyah',
      label: 'تربیت و رہنمائی',
      route: adminAssignmentsPath(),
      icon: 'sprout',
    },
    {
      id: 'record-ijtema',
      label: 'اجتماع ہفتہ وار',
      route: adminWeeklyIjtemaPath(),
      icon: 'calendar',
    },
    {
      id: 'record-baitul',
      label: 'بیت المال',
      route: adminMonthlyBaitulMaalPath(),
      icon: 'handshake',
    },
  ]
}
