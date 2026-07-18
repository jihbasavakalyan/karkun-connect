/**
 * CampaignAutomationEngine — derives operational work from existing modules.
 * Does not store data. Follows Workflow Automation Constitution.
 */
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import {
  adminCompliancePath,
  adminExecutionPath,
  ROUTES,
  ruknVisitPath,
} from '@/constants/routes'
import { getExecutionDashboardData, getExecutionStatusForAssignment } from '@/lib/executionStatus'
import { isSubmissionDateOnDay } from '@/lib/dates/submissionDateDay'
import { getAllAssignments } from '@/stores/assignmentStore'
import { getSubmittedMeetingForms } from '@/stores/annexure1Store'
import {
  formatActiveCampaignDuration,
  getActiveCampaign,
  getActiveCampaignNextMilestone,
  getActiveCampaignObjective,
  getActiveCampaignTheme,
  getCampaignProgress,
  getCampaignTimeline,
} from '@/services/campaignService'
import { getAssignmentDashboardMetrics } from '@/services/assignmentService'
import {
  getAnnexure1ExecutionMetrics,
  getCampaignHealthFromAnnexure1,
  getTodaysMeetingAssignments,
} from '@/services/annexure1Service'
import { getPendingFollowUps } from '@/services/followUpService'
import {
  getBaitulMaalDashboardMetrics,
  getAllBaitulMaalSummaries,
} from '@/services/baitulMaalService'
import {
  getAllIjtemaAttendanceSummaries,
  getIjtemaAttendanceDashboardMetrics,
} from '@/services/ijtemaAttendanceService'
import {
  getAllJihWebPortalSummaries,
  getJihWebPortalDashboardMetrics,
} from '@/services/jihWebPortalService'
import type {
  AdminCommandCenterSnapshot,
  AutomationAlert,
  AutomationPriority,
  CallQueueItem,
  CampaignHeroData,
  CommandCenterKpi,
  FollowUpQueueGroup,
  FollowUpQueueSection,
  NextRecommendedAction,
  ReminderItem,
  RuknCommandCenterSnapshot,
  ScheduleItem,
} from '@/types/campaignAutomation.types'
import type { FollowUpRecord } from '@/types/followUp'

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(isoDate)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function endOfWeekIso(isoDate: string): string {
  const date = new Date(isoDate)
  const day = date.getDay()
  const daysUntilSunday = day === 0 ? 0 : 7 - day
  date.setDate(date.getDate() + daysUntilSunday)
  return date.toISOString().slice(0, 10)
}

function formatScheduleTime(hour: number, minute = 0): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function formatDisplayTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function filterByRukn<T extends { ruknId: string }>(items: T[], ruknId?: string): T[] {
  if (!ruknId) {
    return items
  }
  return items.filter((item) => item.ruknId === ruknId)
}

function getAssignedKarkunIds(ruknId?: string): Set<string> {
  return new Set(
    getAllAssignments()
      .filter((record) => record.status === 'Active' && (!ruknId || record.ruknId === ruknId))
      .map((record) => record.karkunId),
  )
}

type ActionableComplianceItem = {
  label: string
  count: number
  priority: 1 | 2 | 3
  route: string
}

type ActionableComplianceSummary = {
  totalCount: number
  highestPriority: ActionableComplianceItem | null
}

function getActionableComplianceSummary(ruknId?: string): ActionableComplianceSummary {
  const assignedIds = getAssignedKarkunIds(ruknId)
  if (assignedIds.size === 0) {
    return { totalCount: 0, highestPriority: null }
  }

  const items: ActionableComplianceItem[] = []

  const ijtemaPending = getAllIjtemaAttendanceSummaries().filter(
    (item) =>
      assignedIds.has(item.karkunId) &&
      (item.status === 'Not recorded' || item.status === 'Absent'),
  ).length

  if (ijtemaPending > 0) {
    items.push({
      label: 'Pending Weekly Ijtema',
      count: ijtemaPending,
      priority: 3,
      route: adminCompliancePath('ijtema'),
    })
  }

  const monthlyReportsPending = getAllJihWebPortalSummaries().filter(
    (item) =>
      assignedIds.has(item.karkunId) &&
      item.registration.status === 'Registered' &&
      item.monthlyStatus === 'Pending',
  ).length

  if (monthlyReportsPending > 0) {
    items.push({
      label: 'Pending Monthly Reports',
      count: monthlyReportsPending,
      priority: 3,
      route: adminCompliancePath('monthly-reporting'),
    })
  }

  const baitulPending = getAllBaitulMaalSummaries().filter(
    (item) => assignedIds.has(item.karkunId) && item.status === 'Pending',
  ).length

  if (baitulPending > 0) {
    items.push({
      label: 'Pending Bait-ul-Maal',
      count: baitulPending,
      priority: 3,
      route: adminCompliancePath('baitul-maal'),
    })
  }

  const totalCount = items.reduce((sum, item) => sum + item.count, 0)
  const highestPriority = [...items].sort((a, b) => a.priority - b.priority)[0] ?? null

  return { totalCount, highestPriority }
}

export function buildCampaignHeroData(): CampaignHeroData | null {
  const campaign = getActiveCampaign()
  const timeline = getCampaignTimeline()
  if (!campaign || !timeline) {
    return null
  }

  const health = getCampaignHealthFromAnnexure1()

  return {
    name: campaign.name,
    theme: getActiveCampaignTheme(),
    objective: getActiveCampaignObjective(),
    duration: formatActiveCampaignDuration(),
    dayLabel: timeline.dayLabel,
    currentDay: timeline.currentDay,
    totalDays: timeline.totalDays,
    daysRemaining: timeline.daysRemaining,
    daysUntilStart: timeline.daysUntilStart,
    timelineStatus: timeline.status,
    campaignStatus: campaign.status,
    progress: getCampaignProgress(),
    healthScore: health.overallScore,
    nextMilestone: getActiveCampaignNextMilestone(),
    percentageElapsed: timeline.percentageElapsed,
  }
}

function getPendingComplianceCount(ruknId?: string): number {
  return getActionableComplianceSummary(ruknId).totalCount
}

function getPendingFirstVisitsCount(ruknId?: string): number {
  const { activeItems } = getExecutionDashboardData()
  const scoped = ruknId
    ? activeItems.filter((item) => {
        const assignment = getAllAssignments().find(
          (record) => record.assignmentId === item.assignmentId,
        )
        return assignment?.ruknId === ruknId
      })
    : activeItems

  return scoped.filter((item) => item.status === 'Pending').length
}

function buildAdminKpis(): CommandCenterKpi[] {
  const assignmentMetrics = getAssignmentDashboardMetrics()
  const execution = getExecutionDashboardData()
  const annexureMetrics = getAnnexure1ExecutionMetrics()
  const pendingCompliance = getPendingComplianceCount()

  return [
    {
      id: 'assigned-karkuns',
      label: 'Connected Karkuns',
      value: assignmentMetrics.activeAssignments,
      route: ROUTES.ADMIN_ASSIGNMENTS,
    },
    {
      id: 'pending-first-visits',
      label: 'Pending First Visits',
      value: getPendingFirstVisitsCount(),
      route: adminExecutionPath('pending'),
    },
    {
      id: 'todays-visits',
      label: "Today's Scheduled Visits",
      value: getTodaysMeetingAssignments().length,
      route: adminExecutionPath('pending'),
    },
    {
      id: 'pending-annexure',
      label: 'Pending Visit',
      value: annexureMetrics.pendingReports,
      route: adminExecutionPath('pending'),
    },
    {
      id: 'follow-up-required',
      label: 'Follow-up Required',
      value: execution.counts.followUpRequired,
      route: adminExecutionPath('follow-up'),
    },
    {
      id: 'pending-compliance',
      label: 'Pending Compliance',
      value: pendingCompliance,
      route: adminCompliancePath('ijtema'),
    },
    {
      id: 'completed-today',
      label: 'Completed Today',
      value: execution.counts.completedToday,
      route: adminExecutionPath('completed-today'),
    },
    {
      id: 'campaign-progress',
      label: 'Campaign Progress',
      value: getCampaignProgress(),
      route: ROUTES.ADMIN_CAMPAIGN,
    },
  ]
}

function buildRuknKpis(ruknId: string): CommandCenterKpi[] {
  const assigned = getAllAssignments().filter(
    (record) => record.status === 'Active' && record.ruknId === ruknId,
  )
  const execution = getExecutionDashboardData()
  const scopedItems = execution.activeItems.filter((item) =>
    assigned.some((record) => record.assignmentId === item.assignmentId),
  )

  const pendingAnnexure = scopedItems.filter(
    (item) => item.status === 'Pending' || item.status === 'In Progress',
  ).length

  const followUpRequired = scopedItems.filter(
    (item) => item.status === 'Follow-up Required',
  ).length

  const completedToday = getSubmittedMeetingForms().filter(
    (form) =>
      isSubmissionDateOnDay(form.submissionDate, todayIsoDate()) &&
      assigned.some((record) => record.assignmentId === form.assignmentId),
  ).length

  return [
    {
      id: 'assigned-karkuns',
      label: 'Connected Karkuns',
      value: assigned.length,
      route: ROUTES.RUKN_MY_KARKUN,
    },
    {
      id: 'pending-first-visits',
      label: 'Pending First Visits',
      value: scopedItems.filter((item) => item.status === 'Pending').length,
      route: ROUTES.RUKN_MY_KARKUN,
    },
    {
      id: 'pending-annexure',
      label: 'Pending Visit',
      value: pendingAnnexure,
      route: ROUTES.RUKN_MY_KARKUN,
    },
    {
      id: 'follow-up-required',
      label: 'Follow-up Required',
      value: followUpRequired,
      route: ROUTES.RUKN_MY_KARKUN,
    },
    {
      id: 'pending-compliance',
      label: 'Pending Compliance',
      value: getPendingComplianceCount(ruknId),
      route: ROUTES.RUKN_MY_KARKUN,
    },
    {
      id: 'completed-today',
      label: 'Completed Today',
      value: completedToday,
      route: ROUTES.RUKN_CAMPAIGN_RECORD,
    },
    {
      id: 'campaign-progress',
      label: 'Campaign Progress',
      value: getCampaignProgress(),
      route: ROUTES.RUKN_CAMPAIGN_RECORD,
    },
  ]
}

function categorizeFollowUpRecord(record: FollowUpRecord, today: string): FollowUpQueueSection {
  if (record.followUpDate < today) {
    return 'overdue'
  }
  if (record.followUpDate === today) {
    return 'today'
  }
  if (record.followUpDate === addDays(today, 1)) {
    return 'tomorrow'
  }
  if (record.followUpDate <= endOfWeekIso(today)) {
    return 'thisWeek'
  }
  return 'thisWeek'
}

export function buildFollowUpQueue(ruknId?: string): FollowUpQueueGroup[] {
  const today = todayIsoDate()
  const pending = filterByRukn(getPendingFollowUps(), ruknId)

  const sections: FollowUpQueueGroup[] = [
    { section: 'overdue', label: 'Overdue', items: [] },
    { section: 'today', label: 'Today', items: [] },
    { section: 'tomorrow', label: 'Tomorrow', items: [] },
    { section: 'thisWeek', label: 'This Week', items: [] },
  ]

  for (const record of pending) {
    const section = categorizeFollowUpRecord(record, today)
    const group = sections.find((entry) => entry.section === section)
    if (!group) {
      continue
    }

    group.items.push({
      followUpId: record.followUpId,
      karkunName: record.karkunName,
      followUpDate: record.followUpDate,
      purpose: record.purpose,
      route: ruknId ? ROUTES.RUKN_MY_KARKUN : ROUTES.ADMIN_FOLLOW_UP,
    })
  }

  return sections.filter((group) => group.items.length > 0)
}

export function buildCallQueue(ruknId?: string): CallQueueItem[] {
  const activeAssignments = getAllAssignments().filter((record) => record.status === 'Active')
  const scoped = ruknId
    ? activeAssignments.filter((record) => record.ruknId === ruknId)
    : activeAssignments

  return scoped
    .filter((assignment) => {
      const status = getExecutionStatusForAssignment(assignment.assignmentId, assignment.karkunId)
      return status === 'Pending'
    })
    .map((assignment) => {
      const karkun = getKarkunById(assignment.karkunId)
      return {
        id: `call-${assignment.assignmentId}`,
        karkunId: assignment.karkunId,
        karkunName: karkun?.name ?? assignment.karkunId,
        mobile: karkun?.mobile ?? '',
        ruknId: assignment.ruknId,
        assignmentId: assignment.assignmentId,
        label: `Call ${karkun?.name ?? 'Karkun'}`,
        route: ruknId
          ? ruknVisitPath(assignment.karkunId)
          : adminExecutionPath('pending'),
      }
    })
    .slice(0, 8)
}

export function buildReminders(ruknId?: string): ReminderItem[] {
  const reminders: ReminderItem[] = []
  const today = todayIsoDate()
  const ijtema = getIjtemaAttendanceDashboardMetrics()
  const jih = getJihWebPortalDashboardMetrics()
  const baitul = getBaitulMaalDashboardMetrics()
  const pendingFollowUps = filterByRukn(getPendingFollowUps(), ruknId)
  const overdueFollowUps = pendingFollowUps.filter((record) => record.followUpDate < today)
  const todaysFollowUps = pendingFollowUps.filter((record) => record.followUpDate === today)
  const todaysVisits = ruknId
    ? getTodaysMeetingAssignments().filter((item) => item.assignment.ruknId === ruknId)
    : getTodaysMeetingAssignments()
  const newAssignments = (ruknId
    ? getAllAssignments().filter((record) => record.status === 'Active' && record.ruknId === ruknId)
    : getAllAssignments().filter((record) => record.status === 'Active')
  ).filter((assignment) => getExecutionStatusForAssignment(assignment.assignmentId, assignment.karkunId) === 'Pending')

  if (ijtema.absent > 0 || getAllIjtemaAttendanceSummaries().some((item) => item.status === 'Not recorded')) {
    reminders.push({
      id: 'reminder-ijtema',
      label: 'Weekly Ijtema',
      reason: 'Attendance needs recording for this week',
      route: adminCompliancePath('ijtema'),
      priority: 4,
    })
  }

  if (jih.pendingReports > 0) {
    reminders.push({
      id: 'reminder-monthly-report',
      label: 'Monthly Report',
      reason: `${jih.pendingReports} monthly report(s) pending`,
      route: adminCompliancePath('monthly-reporting'),
      priority: 4,
    })
  }

  if (baitul.pending > 0) {
    reminders.push({
      id: 'reminder-baitul-maal',
      label: 'Bait-ul-Maal',
      reason: `${baitul.pending} contribution(s) pending`,
      route: adminCompliancePath('baitul-maal'),
      priority: 4,
    })
  }

  if (overdueFollowUps.length > 0) {
    reminders.push({
      id: 'reminder-follow-up-overdue',
      label: 'Follow-up Due',
      reason: `${overdueFollowUps.length} overdue follow-up(s)`,
      route: ruknId ? ROUTES.RUKN_MY_KARKUN : ROUTES.ADMIN_FOLLOW_UP,
      priority: 1,
    })
  }

  if (todaysFollowUps.length > 0) {
    reminders.push({
      id: 'reminder-follow-up-today',
      label: 'Follow-up Today',
      reason: `${todaysFollowUps.length} follow-up(s) scheduled today`,
      route: ruknId ? ROUTES.RUKN_MY_KARKUN : ROUTES.ADMIN_FOLLOW_UP,
      priority: 2,
    })
  }

  if (todaysVisits.length > 0) {
    reminders.push({
      id: 'reminder-visit-due',
      label: 'Visit Due',
      reason: `${todaysVisits.length} visit(s) scheduled for today`,
      route: ruknId ? ROUTES.RUKN_MY_KARKUN : adminExecutionPath('pending'),
      priority: 2,
    })
  }

  if (newAssignments.length > 0) {
    reminders.push({
      id: 'reminder-assignment-pending',
      label: 'Connection Pending',
      reason: `${newAssignments.length} connection(s) awaiting first visit`,
      route: ruknId ? ROUTES.RUKN_MY_KARKUN : ROUTES.ADMIN_ASSIGNMENTS,
      priority: 3,
    })
  }

  return reminders.sort((a, b) => a.priority - b.priority)
}

type RawWorkItem = {
  id: string
  title: string
  subtitle?: string
  type: ScheduleItem['type']
  route: string
  priority: AutomationPriority
  karkunId?: string
}

export function buildDailySchedule(ruknId?: string): ScheduleItem[] {
  const rawItems: RawWorkItem[] = []
  const followUpQueue = buildFollowUpQueue(ruknId)
  const callQueue = buildCallQueue(ruknId)
  const reminders = buildReminders(ruknId)
  const todaysVisits = ruknId
    ? getTodaysMeetingAssignments().filter((item) => item.assignment.ruknId === ruknId)
    : getTodaysMeetingAssignments()

  for (const group of followUpQueue) {
    if (group.section !== 'overdue' && group.section !== 'today') {
      continue
    }
    for (const item of group.items) {
      rawItems.push({
        id: `schedule-follow-up-${item.followUpId}`,
        title: `Follow-up ${item.karkunName}`,
        subtitle: item.purpose,
        type: group.section === 'overdue' ? 'overdue-follow-up' : 'follow-up',
        route: item.route,
        priority: group.section === 'overdue' ? 1 : 2,
        karkunId: undefined,
      })
    }
  }

  for (const visit of todaysVisits) {
    rawItems.push({
      id: `schedule-visit-${visit.assignment.assignmentId}`,
      title: `Visit ${visit.karkun?.name ?? 'Karkun'}`,
      subtitle: visit.karkun?.area,
      type: 'scheduled-visit',
      route: ruknId
        ? ruknVisitPath(visit.assignment.karkunId)
        : adminExecutionPath('pending'),
      priority: 2,
      karkunId: visit.assignment.karkunId,
    })
  }

  for (const call of callQueue) {
    rawItems.push({
      id: `schedule-call-${call.id}`,
      title: call.label,
      subtitle: call.mobile,
      type: 'call',
      route: call.route,
      priority: 3,
      karkunId: call.karkunId,
    })
  }

  for (const reminder of reminders.slice(0, 3)) {
    rawItems.push({
      id: `schedule-reminder-${reminder.id}`,
      title: reminder.label,
      subtitle: reminder.reason,
      type: 'reminder',
      route: reminder.route,
      priority: reminder.priority,
    })
  }

  const compliancePending = getPendingComplianceCount(ruknId)
  if (compliancePending > 0) {
    rawItems.push({
      id: 'schedule-compliance',
      title: 'Compliance Review',
      subtitle: `${compliancePending} item(s) pending`,
      type: 'compliance',
      route: adminCompliancePath('ijtema'),
      priority: 4,
    })
  }

  const sorted = rawItems.sort((a, b) => a.priority - b.priority)
  const startHour = 9
  const slotMinutes = 90

  return sorted.map((item, index) => {
    const totalMinutes = startHour * 60 + index * slotMinutes
    const hour = Math.floor(totalMinutes / 60)
    const minute = totalMinutes % 60

    return {
      id: item.id,
      time: formatScheduleTime(hour, minute),
      title: item.title,
      subtitle: item.subtitle,
      type: item.type,
      route: item.route,
      priority: item.priority,
      karkunId: item.karkunId,
    }
  })
}

export function buildAlerts(ruknId?: string): AutomationAlert[] {
  const alerts: AutomationAlert[] = []
  const today = todayIsoDate()
  const pendingFollowUps = filterByRukn(getPendingFollowUps(), ruknId)
  const overdueFollowUps = pendingFollowUps.filter((record) => record.followUpDate < today)
  const annexureMetrics = getAnnexure1ExecutionMetrics()
  const jih = getJihWebPortalDashboardMetrics()
  const assignmentMetrics = getAssignmentDashboardMetrics()

  if (overdueFollowUps.length > 0) {
    alerts.push({
      id: 'alert-overdue-follow-ups',
      severity: 'high',
      title: 'Overdue Follow-ups',
      message: `${overdueFollowUps.length} follow-up(s) are past due`,
      route: ruknId ? ROUTES.RUKN_MY_KARKUN : ROUTES.ADMIN_FOLLOW_UP,
    })
  }

  if (jih.pendingReports > 0) {
    alerts.push({
      id: 'alert-pending-reports',
      severity: 'medium',
      title: 'Pending Reports',
      message: `${jih.pendingReports} monthly report(s) still pending`,
      route: adminCompliancePath('monthly-reporting'),
    })
  }

  const inactiveAssigned = getAllAssignments()
    .filter((record) => record.status === 'Active')
    .filter((record) => !ruknId || record.ruknId === ruknId)
    .filter((record) => getKarkunById(record.karkunId)?.status === 'inactive')

  if (inactiveAssigned.length > 0) {
    alerts.push({
      id: 'alert-inactive-karkuns',
      severity: 'medium',
      title: 'Inactive Karkuns',
      message: `${inactiveAssigned.length} connected Karkun(s) are inactive`,
      route: ROUTES.ADMIN_KARKUN,
    })
  }

  const uncontacted = getAllAssignments()
    .filter((record) => record.status === 'Active')
    .filter((record) => !ruknId || record.ruknId === ruknId)
    .filter(
      (record) =>
        getExecutionStatusForAssignment(record.assignmentId, record.karkunId) === 'Pending',
    )

  if (uncontacted.length > 0) {
    alerts.push({
      id: 'alert-uncontacted',
      severity: 'medium',
      title: 'Long Uncontacted Karkuns',
      message: `${uncontacted.length} connected Karkun(s) have no visit recorded`,
      route: ruknId ? ROUTES.RUKN_MY_KARKUN : adminExecutionPath('pending'),
    })
  }

  if (assignmentMetrics.activeAssignments > 0 && annexureMetrics.pendingReports > 0) {
    alerts.push({
      id: 'alert-assignment-without-visit',
      severity: 'high',
      title: 'Connection without Visit',
      message: `${annexureMetrics.pendingReports} active connection(s) need a visit`,
      route: adminExecutionPath('pending'),
    })
  }

  const compliancePending = getPendingComplianceCount(ruknId)
  if (compliancePending > 0) {
    alerts.push({
      id: 'alert-compliance-overdue',
      severity: 'medium',
      title: 'Compliance Overdue',
      message: `${compliancePending} actionable compliance item${compliancePending === 1 ? '' : 's'} need attention`,
      route: adminCompliancePath('ijtema'),
    })
  }

  return alerts
}

function buildAdminNextAction(): NextRecommendedAction {
  const overdue = buildFollowUpQueue().find((group) => group.section === 'overdue')
  if (overdue && overdue.items.length > 0) {
    return {
      title: 'Overdue Follow-ups',
      description: `${overdue.items.length} follow-up(s) need immediate attention`,
      route: ROUTES.ADMIN_FOLLOW_UP,
      actionLabel: 'Open Follow-up',
      isCaughtUp: false,
    }
  }

  const compliancePending = getActionableComplianceSummary()
  if (compliancePending.totalCount > 0 && compliancePending.highestPriority) {
    return {
      title: 'Pending Compliance',
      description: `${compliancePending.totalCount} item${compliancePending.totalCount === 1 ? '' : 's'} require attention`,
      route: compliancePending.highestPriority.route,
      actionLabel: 'Open Compliance',
      isCaughtUp: false,
    }
  }

  const pendingVisits = getPendingFirstVisitsCount()
  if (pendingVisits > 0) {
    return {
      title: 'Pending First Visits',
      description: `${pendingVisits} Karkun(s) need their first visit`,
      route: adminExecutionPath('pending'),
      actionLabel: 'Open Pending Visits',
      isCaughtUp: false,
    }
  }

  const unassignedRukns = getAssignmentDashboardMetrics().unassignedRukns
  if (unassignedRukns > 0) {
    return {
      title: 'Unconnected Rukns',
      description: `${unassignedRukns} Rukn(s) still need Karkun connections`,
      route: ROUTES.ADMIN_ASSIGNMENTS,
      actionLabel: 'Connect Karkun',
      isCaughtUp: false,
    }
  }

  return {
    title: "You're all caught up",
    description: 'No urgent campaign actions right now.',
    route: ROUTES.ADMIN,
    actionLabel: 'View Command Center',
    isCaughtUp: true,
  }
}

function buildRuknNextAction(ruknId: string): NextRecommendedAction {
  const overdue = buildFollowUpQueue(ruknId).find((group) => group.section === 'overdue')
  if (overdue && overdue.items.length > 0) {
    return {
      title: 'Overdue Follow-up',
      description: `Complete follow-up for ${overdue.items[0]?.karkunName ?? 'Karkun'}`,
      route: ROUTES.RUKN_MY_KARKUN,
      actionLabel: 'Complete Follow-up',
      isCaughtUp: false,
    }
  }

  const pendingAssignment = getAllAssignments().find(
    (record) =>
      record.status === 'Active' &&
      record.ruknId === ruknId &&
      getExecutionStatusForAssignment(record.assignmentId, record.karkunId) === 'Pending',
  )

  if (pendingAssignment) {
    const karkun = getKarkunById(pendingAssignment.karkunId)
    return {
      title: 'Visit Pending',
      description: `Record a visit for ${karkun?.name ?? 'connected Karkun'}`,
      route: ruknVisitPath(pendingAssignment.karkunId),
      actionLabel: 'Record Visit',
      isCaughtUp: false,
    }
  }

  const inProgress = getAllAssignments().find(
    (record) =>
      record.status === 'Active' &&
      record.ruknId === ruknId &&
      getExecutionStatusForAssignment(record.assignmentId, record.karkunId) === 'In Progress',
  )

  if (inProgress) {
    return {
      title: 'Visit In Progress',
      description: 'Continue the visit form you started',
      route: ruknVisitPath(inProgress.karkunId),
      actionLabel: 'Continue Visit',
      isCaughtUp: false,
    }
  }

  const followUpRequired = getAllAssignments().find(
    (record) =>
      record.status === 'Active' &&
      record.ruknId === ruknId &&
      getExecutionStatusForAssignment(record.assignmentId, record.karkunId) ===
        'Follow-up Required',
  )

  if (followUpRequired) {
    return {
      title: 'Follow-up Due',
      description: 'Complete the required follow-up visit',
      route: ROUTES.RUKN_MY_KARKUN,
      actionLabel: 'Complete Follow-up',
      isCaughtUp: false,
    }
  }

  const callQueue = buildCallQueue(ruknId)
  if (callQueue.length > 0) {
    return {
      title: callQueue[0]!.label,
      description: 'Start with the next Karkun call before the visit',
      route: callQueue[0]!.route,
      actionLabel: 'Start Call Queue',
      isCaughtUp: false,
    }
  }

  return {
    title: "You're all caught up",
    description: 'All connected Karkuns are up to date for today.',
    route: ROUTES.RUKN,
    actionLabel: 'View Schedule',
    isCaughtUp: true,
  }
}

function buildRuknCompletedToday(ruknId: string) {
  const today = todayIsoDate()
  const assignedIds = new Set(
    getAllAssignments()
      .filter((record) => record.status === 'Active' && record.ruknId === ruknId)
      .map((record) => record.assignmentId),
  )

  return getSubmittedMeetingForms()
    .filter(
      (form) =>
        isSubmissionDateOnDay(form.submissionDate, today) &&
        assignedIds.has(form.assignmentId),
    )
    .map((form) => ({
      id: form.id,
      label: `Visit — ${form.workerName}`,
      time: formatDisplayTime(form.submittedAt),
    }))
}

export function getAdminCommandCenterSnapshot(): AdminCommandCenterSnapshot {
  return {
    role: 'administrator',
    hero: buildCampaignHeroData(),
    kpis: buildAdminKpis(),
    schedule: buildDailySchedule(),
    callQueue: buildCallQueue(),
    reminders: buildReminders(),
    followUpQueue: buildFollowUpQueue(),
    alerts: buildAlerts(),
    nextAction: buildAdminNextAction(),
  }
}

export function getRuknCommandCenterSnapshot(ruknId: string): RuknCommandCenterSnapshot {
  return {
    role: 'rukn',
    ruknId,
    hero: buildCampaignHeroData(),
    kpis: buildRuknKpis(ruknId),
    schedule: buildDailySchedule(ruknId),
    callQueue: buildCallQueue(ruknId),
    reminders: buildReminders(ruknId),
    followUpQueue: buildFollowUpQueue(ruknId),
    alerts: buildAlerts(ruknId),
    nextAction: buildRuknNextAction(ruknId),
    completedToday: buildRuknCompletedToday(ruknId),
  }
}

export const CampaignAutomationEngine = {
  buildCampaignHeroData,
  buildDailySchedule,
  buildCallQueue,
  buildReminders,
  buildFollowUpQueue,
  buildAlerts,
  getAdminCommandCenterSnapshot,
  getRuknCommandCenterSnapshot,
} as const
