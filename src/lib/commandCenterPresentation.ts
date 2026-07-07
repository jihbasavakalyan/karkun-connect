import { ruknMaster } from '@/data/ruknMaster'
import { getExecutionDashboardData } from '@/lib/executionStatus'
import { getPeopleStatistics } from '@/lib/peopleStore'
import { getAllAssignments } from '@/stores/assignmentStore'
import { getRuknById } from '@/data/ruknMaster'
import {
  getAnnexure1ExecutionMetrics,
  getCampaignHealthFromAnnexure1,
} from '@/services/annexure1Service'
import { getAssignmentDashboardMetrics } from '@/services/assignmentService'
import { getCampaignProgress, getCampaignTimeline } from '@/services/campaignService'
import { getBaitulMaalDashboardMetrics } from '@/services/baitulMaalService'
import { getIjtemaAttendanceDashboardMetrics } from '@/services/ijtemaAttendanceService'
import { getJihWebPortalDashboardMetrics } from '@/services/jihWebPortalService'
import type { CommandCenterKpi } from '@/types/campaignAutomation.types'

export type KpiPresentationMeta = {
  icon: string
  subtitle: string
}

export const KPI_PRESENTATION: Record<string, KpiPresentationMeta> = {
  'assigned-karkuns': { icon: '👥', subtitle: 'Active campaign connections' },
  'pending-first-visits': { icon: '📍', subtitle: 'Awaiting first contact visit' },
  'todays-visits': { icon: '📅', subtitle: 'Scheduled for today' },
  'pending-annexure': { icon: '📋', subtitle: 'Visit not recorded' },
  'follow-up-required': { icon: '🔄', subtitle: 'Needs follow-up action' },
  'pending-compliance': { icon: '✅', subtitle: 'Compliance items open' },
  'completed-today': { icon: '✨', subtitle: 'Finished today' },
  'campaign-progress': { icon: '📊', subtitle: 'Overall campaign health' },
}

export function getKpiTrendLabel(kpiId: string): string {
  const assignment = getAssignmentDashboardMetrics()
  const annexure = getAnnexure1ExecutionMetrics()

  switch (kpiId) {
    case 'assigned-karkuns':
      return assignment.assignmentsToday > 0
        ? `+${assignment.assignmentsToday} today`
        : 'No change today'
    case 'pending-first-visits':
      return `${annexure.pendingMeetings} meetings due`
    case 'todays-visits':
      return `${annexure.submittedToday} submitted today`
    case 'pending-annexure':
      return `${annexure.pendingReports} open`
    case 'follow-up-required':
      return `${annexure.todaysFollowUps} due today`
    case 'pending-compliance':
      return 'Review required'
    case 'completed-today':
      return `${annexure.submittedToday} today`
    case 'campaign-progress':
      return `${getCampaignTimeline()?.dayLabel ?? '—'}`
    default:
      return 'Live'
  }
}

export function enrichKpiPresentation(kpi: CommandCenterKpi) {
  const meta = KPI_PRESENTATION[kpi.id] ?? { icon: '📌', subtitle: 'Operational metric' }
  return {
    ...kpi,
    ...meta,
    trend: getKpiTrendLabel(kpi.id),
    suffix: kpi.id === 'campaign-progress' ? '%' : '',
  }
}

export type TeamPerformanceRow = {
  ruknId: string
  ruknName: string
  assignedKarkuns: number
  pendingWork: number
  completionPct: number
  followUpPct: number
  visits: number
}

export function getTeamPerformanceRows(): TeamPerformanceRow[] {
  const activeAssignments = getAllAssignments().filter((record) => record.status === 'Active')
  const { activeItems } = getExecutionDashboardData()
  const ruknIds = new Set(activeAssignments.map((record) => record.ruknId))

  const rows: TeamPerformanceRow[] = []

  for (const ruknId of ruknIds) {
    const rukn = getRuknById(ruknId)
    if (!rukn) {
      continue
    }

    const assigned = activeAssignments.filter((record) => record.ruknId === ruknId)
    const scopedItems = activeItems.filter((item) =>
      assigned.some((record) => record.assignmentId === item.assignmentId),
    )
    const completed = scopedItems.filter((item) => item.status === 'Completed').length
    const pending = scopedItems.filter((item) => item.status !== 'Completed').length
    const followUpRequired = scopedItems.filter(
      (item) => item.status === 'Follow-up Required',
    ).length
    const total = scopedItems.length || 1

    rows.push({
      ruknId,
      ruknName: rukn.name,
      assignedKarkuns: assigned.length,
      pendingWork: pending,
      completionPct: Math.round((completed / total) * 100),
      followUpPct: Math.round((followUpRequired / total) * 100),
      visits: completed,
    })
  }

  return rows.sort(
    (a, b) => b.completionPct - a.completionPct || b.assignedKarkuns - a.assignedKarkuns,
  )
}

export type CampaignProgressOverview = {
  overall: number
  execution: number
  coverage: number
  followUp: number
  compliance: number
  assignment: number
}

export function getCampaignProgressOverview(): CampaignProgressOverview {
  const assignmentMetrics = getAssignmentDashboardMetrics()
  const health = getCampaignHealthFromAnnexure1()
  const people = getPeopleStatistics()
  const activeRukns = ruknMaster.filter((rukn) => rukn.status === 'active').length
  const totalKarkuns = people.totalMaleKarkuns + people.totalFemaleKarkuns

  const jih = getJihWebPortalDashboardMetrics()
  const baitulMaal = getBaitulMaalDashboardMetrics()
  const ijtema = getIjtemaAttendanceDashboardMetrics()
  const assignedCount = assignmentMetrics.activeAssignments || 1
  const pendingComplianceItems =
    jih.notRegistered + jih.pendingReports + baitulMaal.pending + ijtema.absent
  const compliancePct = Math.max(
    0,
    Math.round(((assignedCount - Math.min(pendingComplianceItems, assignedCount)) / assignedCount) * 100),
  )

  return {
    overall: getCampaignProgress(),
    execution: health.visitCompletionRate,
    coverage: activeRukns > 0 ? Math.round((assignmentMetrics.assignedRukns / activeRukns) * 100) : 0,
    followUp: health.followUpCompletionRate,
    compliance: compliancePct,
    assignment:
      totalKarkuns > 0 ? Math.round((people.assignedKarkuns / totalKarkuns) * 100) : 0,
  }
}

export type CampaignIntelligenceData = {
  coveragePct: number
  executionPct: number
  activationPct: number
  maleKarkuns: number
  femaleKarkuns: number
  assignedKarkuns: number
  dailyTrend: string
  weeklyTrend: string
  completionForecast: string
}

export function getCampaignIntelligenceData(): CampaignIntelligenceData {
  const overview = getCampaignProgressOverview()
  const people = getPeopleStatistics()
  const annexure = getAnnexure1ExecutionMetrics()
  const timeline = getCampaignTimeline()
  const daysRemaining = timeline?.daysRemaining ?? 0
  const dailyRate = annexure.submittedToday
  const weeklyRate = annexure.submittedThisWeek
  const remaining = overview.overall >= 100 ? 0 : Math.max(0, 100 - overview.overall)
  const forecastDays =
    dailyRate > 0 ? Math.ceil(remaining / Math.max(1, (dailyRate / 7) * 7)) : daysRemaining

  return {
    coveragePct: overview.coverage,
    executionPct: overview.execution,
    activationPct: overview.overall,
    maleKarkuns: people.totalMaleKarkuns,
    femaleKarkuns: people.totalFemaleKarkuns,
    assignedKarkuns: people.assignedKarkuns,
    dailyTrend: `${annexure.submittedToday} submissions today`,
    weeklyTrend: `${weeklyRate} this week`,
    completionForecast:
      overview.overall >= 100
        ? 'Campaign targets met'
        : forecastDays > 0
          ? `~${forecastDays} day${forecastDays === 1 ? '' : 's'} at current pace`
          : `${daysRemaining} campaign day${daysRemaining === 1 ? '' : 's'} remaining`,
  }
}
