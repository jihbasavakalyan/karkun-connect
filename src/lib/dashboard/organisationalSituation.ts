/**
 * Admin organisational Dashboard — derived read model.
 * Reuses people, Ijtema, Meqati report, health slices. No new collections.
 * Year status is classified from existing OccurrenceExecutionState via
 * buildMansoobaActivityReport programme rows (scheduled / occurred / completed / pending).
 */

import { ROUTES, adminAssignmentsPath, adminCompliancePath, adminMissionWorkspacePath } from '@/constants/routes'
import { getRuknById } from '@/data/ruknMaster'
import {
  buildMansoobaActivityReport,
  type ProgrammeActivityRow,
} from '@/lib/mansoobaReporting/buildMansoobaActivityReport'
import { karachiDateKey } from '@/lib/mansoobaReporting/periods'
import { getPeopleStatistics } from '@/lib/peopleStore'
import { unwrapRepository } from '@/repositories/errors'
import { getRepositories } from '@/repositories/provider'
import {
  getDashboardAppRegistrationMetrics,
  getDashboardVisitMetrics,
} from '@/services/dashboardMetricsService'
import { getFollowUpDashboardMetrics } from '@/services/followUpService'
import { getPendingKarkunRequests } from '@/services/karkunRequestService'
import { getMonthlyBaitulMaalDashboardKpi } from '@/services/monthlyBaitulMaalService'
import {
  formatActiveCampaignDuration,
  getActiveCampaign,
  getCampaignProgress,
  getCampaignTimeline,
} from '@/services/campaignService'
import { getWeeklyIjtemaDashboardKpi } from '@/services/weeklyIjtemaService'
import {
  getAllMonthlyBaitulMaalCycles,
  getAllMonthlyBaitulMaalSubmissions,
} from '@/stores/monthlyBaitulMaalStore'
import {
  getAllWeeklyIjtemaEvents,
  getAllWeeklyIjtemaSubmissions,
} from '@/stores/weeklyIjtemaStore'
import type { LocalProgramme, ProgrammeFrequency } from '@/types/localProgramme.types'
import type { MeqatiMansooba, PlanningObjective, Shobah } from '@/types/planning.types'
import {
  meqatiYearToReportPeriod,
  type MeqatiYear,
} from './meqatiYear'

export type MeqatiYearActivityStatus = 'completed' | 'in_progress' | 'remaining'

export type OrganisationalStatusCounts = {
  activities: number
  completed: number
  inProgress: number
  remaining: number
  progressPct: number
}

export type ShobahDrillActivity = {
  id: string
  name: string
  status: MeqatiYearActivityStatus
  responsibleName: string | null
  scheduleLabel: string
}

export type ShobahDrillObjective = {
  id: string
  title: string
  activities: ShobahDrillActivity[]
}

export type ShobahStatusRow = OrganisationalStatusCounts & {
  shobahId: string
  name: string
  objectives: ShobahDrillObjective[]
}

export type AttentionCategory = {
  id: 'activities' | 'responsibilities' | 'follow-up' | 'other'
  label: string
  count: number
}

export type ImportantActivitySnapshot = {
  id: string
  label: string
  value: string
  hint?: string
  route: string
  hasMetric: boolean
}

export type ActiveCampaignCompact = {
  id: string
  name: string
  periodLabel: string
  progressPct: number
  focusedLabels: string[]
  route: string
}

export type WeeklyIjtemaSnapshot = {
  hasOpenEvent: boolean
  meetingDate: string | null
  present: number
  eligible: number
  attendancePct: number
  malePresent: number
  femalePresent: number
  ruknsSubmitted: number
  ruknsTotal: number
  ruknsPending: number
}

export type OrganisationalSituation = {
  generatedAt: string
  metricsLive: true
  people: {
    rukns: number
    karkuns: number
    muttafiqeen: number
    connections: number
  }
  implementation: {
    inProgressActivities: number
    assignedResponsibles: number
    meqatiProgressPct: number | null
  }
  ijtema: WeeklyIjtemaSnapshot
  meqati: {
    mansooba: MeqatiMansooba | null
    empty: boolean
    year: MeqatiYear
    counts: OrganisationalStatusCounts
    shobahs: ShobahStatusRow[]
  }
  attention: {
    categories: AttentionCategory[]
    total: number
    detailRoute: string
  }
  importantActivities: ImportantActivitySnapshot[]
  activeCampaign: ActiveCampaignCompact | null
}

/**
 * Map existing report occurrence semantics onto one سرگرمی for one Meqati year.
 * completed = every scheduled occurrence in the year is closed/completed
 * in_progress = at least one occurred or completed, but not all completed
 * remaining = no occurred/completed record in this year (including no occurrences)
 */
export function classifyProgrammeYearStatus(
  row: Pick<ProgrammeActivityRow, 'scheduled' | 'occurred' | 'completed' | 'pending'>,
): MeqatiYearActivityStatus {
  if (row.scheduled <= 0) return 'remaining'
  if (row.completed >= row.scheduled && row.pending === 0) return 'completed'
  if (row.occurred > 0 || row.completed > 0) return 'in_progress'
  return 'remaining'
}

export function formatProgrammeSchedule(frequency: ProgrammeFrequency | undefined): string {
  if (!frequency) return 'غیر متعین'
  if (frequency.cadence === 'weekly') return 'ہفتہ وار'
  if (frequency.cadence === 'monthly') return 'ماہانہ'
  if (frequency.cadence === 'yearly') return 'سالانہ'
  if (frequency.cadence === 'once') return 'یک بار'
  return frequency.note?.trim() ? `دیگر: ${frequency.note}` : 'دیگر'
}

function emptyCounts(): OrganisationalStatusCounts {
  return { activities: 0, completed: 0, inProgress: 0, remaining: 0, progressPct: 0 }
}

function countsFromStatuses(statuses: readonly MeqatiYearActivityStatus[]): OrganisationalStatusCounts {
  const activities = statuses.length
  const completed = statuses.filter((row) => row === 'completed').length
  const inProgress = statuses.filter((row) => row === 'in_progress').length
  const remaining = statuses.filter((row) => row === 'remaining').length
  return {
    activities,
    completed,
    inProgress,
    remaining,
    progressPct: activities === 0 ? 0 : Math.round((completed / activities) * 100),
  }
}

export function buildOrganisationalSituation(year: MeqatiYear): OrganisationalSituation {
  const people = getPeopleStatistics()
  const repos = getRepositories()
  const asOfDate = karachiDateKey()
  const mansooba = unwrapRepository(repos.meqatiMansooba.getActive(), undefined) ?? null
  const shobahs = unwrapRepository(repos.shobah.loadAll(), [])
  const objectives = unwrapRepository(repos.objective.loadAll(), [])
  const programmes = unwrapRepository(repos.localProgramme.loadAll(), [])
  const occurrences = unwrapRepository(repos.occurrence.loadAll(), [])
  const work = unwrapRepository(repos.work.loadAll(), [])
  const campaigns = unwrapRepository(repos.campaign.getAll(), [])

  const period = meqatiYearToReportPeriod(year)
  const report = mansooba
    ? buildMansoobaActivityReport({
        mansooba,
        period,
        asOfDate,
        objectives,
        campaigns,
        programmes,
        occurrences,
        work,
        weeklyIjtemaEvents: getAllWeeklyIjtemaEvents(),
        weeklyIjtemaSubmissions: getAllWeeklyIjtemaSubmissions(),
        baitulMaalCycles: getAllMonthlyBaitulMaalCycles(),
        baitulMaalSubmissions: getAllMonthlyBaitulMaalSubmissions(),
      })
    : null

  const statusByProgrammeId = new Map<string, MeqatiYearActivityStatus>()
  if (report) {
    for (const row of report.programmeRows) {
      statusByProgrammeId.set(row.programmeId, classifyProgrammeYearStatus(row))
    }
  }

  const mansoobaObjectives = mansooba
    ? objectives.filter((row) => row.mansoobaId === mansooba.id && row.status !== 'archived')
    : []
  const mansoobaObjectiveIds = new Set(mansoobaObjectives.map((row) => row.id))
  const linkedProgrammes = programmes.filter(
    (row) => mansoobaObjectiveIds.has(row.objectiveId) && row.status !== 'archived',
  )

  const yearStatuses = linkedProgrammes.map(
    (row) => statusByProgrammeId.get(row.id) ?? 'remaining',
  )
  const meqatiCounts = countsFromStatuses(yearStatuses)
  const assignedResponsibles = linkedProgrammes.filter((row) => Boolean(row.responsibleRuknId?.trim())).length

  const visibleShobahs = mansooba
    ? shobahs
        .filter((row) => row.mansoobaId === mansooba.id && row.status !== 'archived')
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
    : []

  const shobahRows = visibleShobahs.map((shobah) =>
    buildShobahRow(shobah, mansoobaObjectives, linkedProgrammes, statusByProgrammeId),
  )

  const ijtemaAll = getWeeklyIjtemaDashboardKpi()
  const ijtemaMale = getWeeklyIjtemaDashboardKpi({ audienceGender: 'Male' })
  const ijtemaFemale = getWeeklyIjtemaDashboardKpi({ audienceGender: 'Female' })

  const missingResponsible = linkedProgrammes.filter((row) => !row.responsibleRuknId?.trim()).length
  const followUps = getFollowUpDashboardMetrics().pendingFollowUps
  const pendingRequests = getPendingKarkunRequests().length
  const otherCount = people.unassignedKarkuns + pendingRequests
  const attentionCategories: AttentionCategory[] = [
    {
      id: 'activities',
      label: 'سرگرمیاں',
      count: meqatiCounts.inProgress + meqatiCounts.remaining,
    },
    { id: 'responsibilities', label: 'ذمہ داریاں', count: missingResponsible },
    { id: 'follow-up', label: 'فالو اَپ', count: followUps },
    { id: 'other', label: 'دیگر', count: otherCount },
  ]

  const visits = getDashboardVisitMetrics()
  const app = getDashboardAppRegistrationMetrics()
  const baitul = getMonthlyBaitulMaalDashboardKpi()

  const importantActivities: ImportantActivitySnapshot[] = [
    {
      id: 'weekly-ijtema',
      label: 'اجتماع ہفتہ وار',
      value: ijtemaAll.eventId ? `${ijtemaAll.attendancePct}%` : '—',
      hint: ijtemaAll.eventId
        ? `${ijtemaAll.present} / ${ijtemaAll.totalAssigned} حاضر`
        : 'کوئی کھلا اجتماع نہیں',
      route: ROUTES.ADMIN_WEEKLY_IJTEMA,
      hasMetric: Boolean(ijtemaAll.eventId),
    },
    {
      id: 'baitul-maal',
      label: 'بیت المال',
      value: baitul.cycleId ? `${baitul.completionPct}%` : '—',
      hint: baitul.cycleId
        ? `${baitul.contributed} / ${baitul.totalAssigned} ادا`
        : 'کوئی کھلا دور نہیں',
      route: ROUTES.ADMIN_MONTHLY_BAITUL_MAAL,
      hasMetric: Boolean(baitul.cycleId),
    },
    {
      id: 'jih-app',
      label: 'JIH App رجسٹریشن',
      value: app.eligible > 0 ? `${app.pct}%` : '—',
      hint: app.eligible > 0 ? `${app.registered} / ${app.eligible}` : 'اہل کارکنان دستیاب نہیں',
      route: adminCompliancePath('jih-portal'),
      hasMetric: app.eligible > 0,
    },
    {
      id: 'visits',
      label: 'کارکن ملاقاتیں',
      value: visits.planned > 0 ? `${visits.pct}%` : '—',
      hint: visits.planned > 0 ? `${visits.completed} / ${visits.planned}` : 'کوئی منصوبہ شدہ ملاقات نہیں',
      route: adminAssignmentsPath(),
      hasMetric: visits.planned > 0,
    },
    {
      id: 'tarbiyah',
      label: 'تربیت و رہنمائی',
      value: 'تفصیل',
      hint: 'موجودہ روابط سے کھولیں — کوئی readiness اسکور نہیں',
      route: adminAssignmentsPath(),
      hasMetric: false,
    },
  ]

  const timeline = getCampaignTimeline()
  const campaign = getActiveCampaign()
  const activeCampaign =
    timeline?.status === 'active' && campaign
      ? {
          id: campaign.id,
          name: campaign.name,
          periodLabel: formatActiveCampaignDuration(),
          progressPct: getCampaignProgress(),
          focusedLabels: resolveCampaignFocusLabels(campaign.objectiveIds, campaign.activityIds, objectives, programmes),
          route: ROUTES.ADMIN_CAMPAIGN,
        }
      : null

  return {
    generatedAt: new Date().toISOString(),
    metricsLive: true,
    people: {
      rukns: people.totalRukns,
      karkuns: people.totalMaleKarkuns + people.totalFemaleKarkuns,
      muttafiqeen: people.totalMuttafiqeen ?? 0,
      connections: people.assignedKarkuns,
    },
    implementation: {
      inProgressActivities: meqatiCounts.inProgress,
      assignedResponsibles,
      meqatiProgressPct: mansooba && linkedProgrammes.length > 0 ? meqatiCounts.progressPct : null,
    },
    ijtema: {
      hasOpenEvent: Boolean(ijtemaAll.eventId),
      meetingDate: ijtemaAll.meetingDate,
      present: ijtemaAll.present,
      eligible: ijtemaAll.totalAssigned,
      attendancePct: ijtemaAll.attendancePct,
      malePresent: ijtemaMale.present,
      femalePresent: ijtemaFemale.present,
      ruknsSubmitted: ijtemaAll.ruknsSubmitted,
      ruknsTotal: ijtemaAll.ruknsTotal,
      ruknsPending: ijtemaAll.ruknsPending,
    },
    meqati: {
      mansooba,
      empty: !mansooba || linkedProgrammes.length === 0,
      year,
      counts: mansooba ? meqatiCounts : emptyCounts(),
      shobahs: shobahRows,
    },
    attention: {
      categories: attentionCategories,
      total: attentionCategories.reduce((sum, row) => sum + row.count, 0),
      detailRoute: adminMissionWorkspacePath(),
    },
    importantActivities,
    activeCampaign,
  }
}

function buildShobahRow(
  shobah: Shobah,
  objectives: readonly PlanningObjective[],
  programmes: readonly LocalProgramme[],
  statusByProgrammeId: ReadonlyMap<string, MeqatiYearActivityStatus>,
): ShobahStatusRow {
  const shobahObjectives = objectives
    .filter((row) => row.shobahId === shobah.id)
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title))

  const objectiveViews: ShobahDrillObjective[] = shobahObjectives.map((objective) => {
    const activities = programmes
      .filter((row) => row.objectiveId === objective.id)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((programme) => {
        const rukn = programme.responsibleRuknId
          ? getRuknById(programme.responsibleRuknId)
          : undefined
        return {
          id: programme.id,
          name: programme.name,
          status: statusByProgrammeId.get(programme.id) ?? 'remaining',
          responsibleName: rukn?.name ?? null,
          scheduleLabel: formatProgrammeSchedule(programme.frequency),
        }
      })
    return { id: objective.id, title: objective.title, activities }
  })

  const statuses = objectiveViews.flatMap((row) => row.activities.map((activity) => activity.status))
  return {
    shobahId: shobah.id,
    name: shobah.name,
    ...countsFromStatuses(statuses),
    objectives: objectiveViews,
  }
}

function resolveCampaignFocusLabels(
  objectiveIds: readonly string[] | undefined,
  activityIds: readonly string[] | undefined,
  objectives: readonly PlanningObjective[],
  programmes: readonly LocalProgramme[],
): string[] {
  const labels: string[] = []
  for (const id of objectiveIds ?? []) {
    const title = objectives.find((row) => row.id === id)?.title
    if (title) labels.push(title)
  }
  for (const id of activityIds ?? []) {
    const name = programmes.find((row) => row.id === id)?.name
    if (name) labels.push(name)
  }
  return labels.slice(0, 6)
}
