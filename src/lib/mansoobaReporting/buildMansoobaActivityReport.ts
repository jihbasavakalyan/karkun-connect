/**
 * Phase 5 — Meqati Mansooba activity report (TASK-042–044).
 * Derived consumer. Does not persist. Does not write operational SoTs.
 * Authority: docs/architecture/kc-phase5-mansooba-activity-reporting-arch009-gate.md
 */

import type { CampaignListItem } from '@/constants/mockMissions'
import type { LocalProgramme } from '@/types/localProgramme.types'
import type { Occurrence } from '@/types/occurrence.types'
import type { MeqatiMansooba, PlanningObjective } from '@/types/planning.types'
import type { Work } from '@/types/work.types'
import type { WeeklyIjtemaEvent, WeeklyIjtemaSubmission } from '@/types/weeklyIjtema'
import type {
  MonthlyBaitulMaalCycle,
  MonthlyBaitulMaalSubmission,
} from '@/types/monthlyBaitulMaal'
import {
  dateKeyInPeriod,
  type MansoobaReportPeriod,
} from '@/lib/mansoobaReporting/periods'
import { programmeRequiresEventAttendance } from '@/lib/orientation/orientationAttendance'

export type MansoobaReportGapId =
  | 'orientation_not_period_scoped'
  | 'work_requires_primary_unit_and_due_date'
  | 'programmes_unlinked_to_mansooba'
  | 'no_approved_performance_score'

export type OccurrenceExecutionState = {
  scheduled: boolean
  occurred: boolean
  completed: boolean
  pending: boolean
}

export type AttendanceSnapshot = {
  present: number
  absent: number
  reminded: number
  source: 'weekly_ijtema' | 'monthly_baitul_maal'
}

export type MansoobaActivityRow = {
  occurrenceId: string
  occurrenceDate: string
  occurrenceStatus: Occurrence['status']
  programmeId: string
  programmeName: string
  programmeKind: LocalProgramme['kind']
  programmeStatus: LocalProgramme['status']
  campaignId?: string
  objectiveIds: string[]
  execution: OccurrenceExecutionState
  attendance?: AttendanceSnapshot
  attention: string[]
}

export type ObjectiveProgressRow = {
  objectiveId: string
  title: string
  programmeCount: number
  scheduled: number
  occurred: number
  completed: number
  pending: number
}

export type ProgrammeActivityRow = {
  programmeId: string
  name: string
  kind: LocalProgramme['kind']
  status: LocalProgramme['status']
  scheduled: number
  occurred: number
  completed: number
  pending: number
}

export type WorkPeriodRow = {
  workId: string
  title: string
  status: Work['status']
  dueDate: string
  completed: boolean
  pending: boolean
  overdue: boolean
}

export type MonthlyProgressionRow = {
  monthKey: string
  scheduled: number
  completed: number
  pending: number
}

export type MansoobaActivityReport = {
  mansoobaId: string
  mansoobaName: string
  period: MansoobaReportPeriod
  plannedProgrammeCount: number
  scheduled: number
  occurred: number
  completed: number
  pending: number
  workCompleted: number
  workPending: number
  activityRows: MansoobaActivityRow[]
  objectiveRows: ObjectiveProgressRow[]
  programmeRows: ProgrammeActivityRow[]
  workRows: WorkPeriodRow[]
  monthlyProgression: MonthlyProgressionRow[]
  attentionItems: string[]
  gaps: MansoobaReportGapId[]
  unlinkedProgrammeCount: number
}

export type MansoobaActivityReportInput = {
  mansooba: MeqatiMansooba
  period: MansoobaReportPeriod
  /** Karachi civil date used for overdue / past-due attention */
  asOfDate: string
  objectives: readonly PlanningObjective[]
  campaigns: readonly CampaignListItem[]
  programmes: readonly LocalProgramme[]
  occurrences: readonly Occurrence[]
  work: readonly Work[]
  weeklyIjtemaEvents?: readonly WeeklyIjtemaEvent[]
  weeklyIjtemaSubmissions?: readonly WeeklyIjtemaSubmission[]
  baitulMaalCycles?: readonly MonthlyBaitulMaalCycle[]
  baitulMaalSubmissions?: readonly MonthlyBaitulMaalSubmission[]
}

function uniqueCount(ids: Iterable<string>): number {
  return new Set(ids).size
}

function wiAttendance(
  eventId: string,
  submissions: readonly WeeklyIjtemaSubmission[],
): AttendanceSnapshot {
  let present = 0
  let absent = 0
  let reminded = 0
  for (const submission of submissions) {
    if (submission.eventId !== eventId) continue
    for (const mark of submission.marks) {
      if (mark.status === 'Present') present += 1
      else if (mark.status === 'Absent') absent += 1
      if (mark.reminded === true || mark.status === 'Present' || mark.status === 'Absent') {
        reminded += 1
      }
    }
  }
  return { present, absent, reminded, source: 'weekly_ijtema' }
}

function bmAttendance(
  cycleId: string,
  submissions: readonly MonthlyBaitulMaalSubmission[],
): AttendanceSnapshot {
  let present = 0
  let absent = 0
  for (const submission of submissions) {
    if (submission.eventId !== cycleId) continue
    for (const mark of submission.marks) {
      if (mark.status === 'Contributed') present += 1
      else if (mark.status === 'Pending') absent += 1
    }
  }
  return {
    present,
    absent,
    reminded: present + absent,
    source: 'monthly_baitul_maal',
  }
}

function resolveExecution(
  occurrence: Occurrence,
  wiEvents: readonly WeeklyIjtemaEvent[],
  bmCycles: readonly MonthlyBaitulMaalCycle[],
): OccurrenceExecutionState {
  const archived = occurrence.status === 'archived'
  const scheduled = !archived
  const sourceRef = occurrence.sourceRef
  const wiEvent =
    sourceRef?.kind === 'weekly_ijtema_event'
      ? wiEvents.find((event) => event.id === sourceRef.eventId)
      : undefined
  const bmCycle =
    sourceRef?.kind === 'monthly_baitul_maal_cycle'
      ? bmCycles.find((cycle) => cycle.id === sourceRef.cycleId)
      : undefined

  const occurred =
    scheduled &&
    (occurrence.status === 'open' ||
      occurrence.status === 'closed' ||
      Boolean(wiEvent) ||
      Boolean(bmCycle))

  const completed =
    scheduled &&
    (occurrence.status === 'closed' ||
      wiEvent?.status === 'Closed' ||
      bmCycle?.status === 'Closed')

  return {
    scheduled,
    occurred,
    completed,
    pending: scheduled && !completed,
  }
}

/**
 * Build a derived Mansooba activity report. Pure — no repository writes.
 */
export function buildMansoobaActivityReport(
  input: MansoobaActivityReportInput,
): MansoobaActivityReport {
  const {
    mansooba,
    period,
    asOfDate,
    objectives,
    campaigns,
    programmes,
    occurrences,
    work,
  } = input
  void campaigns
  const wiEvents = input.weeklyIjtemaEvents ?? []
  const wiSubmissions = input.weeklyIjtemaSubmissions ?? []
  const bmCycles = input.baitulMaalCycles ?? []
  const bmSubmissions = input.baitulMaalSubmissions ?? []

  const mansoobaObjectives = objectives.filter(
    (row) => row.mansoobaId === mansooba.id && row.status !== 'archived',
  )
  const mansoobaObjectiveIds = new Set(mansoobaObjectives.map((row) => row.id))
  const linkedProgrammes = programmes.filter((row) => {
    const objectiveId = row.objectiveId?.trim()
    return Boolean(objectiveId) && mansoobaObjectiveIds.has(objectiveId!)
  })
  const programmeById = new Map(linkedProgrammes.map((row) => [row.id, row]))

  const unlinkedProgrammeCount = programmes.filter((row) => {
    const objectiveId = row.objectiveId?.trim()
    return !objectiveId || !mansoobaObjectiveIds.has(objectiveId)
  }).length

  const periodOccurrences = occurrences.filter((row) => {
    if (!programmeById.has(row.programmeId)) return false
    return dateKeyInPeriod(row.occurrenceDate, period)
  })

  const activityRows: MansoobaActivityRow[] = []
  const attentionItems: string[] = []

  for (const occurrence of periodOccurrences) {
    const programme = programmeById.get(occurrence.programmeId)
    if (!programme) continue
    const execution = resolveExecution(occurrence, wiEvents, bmCycles)
    const attention: string[] = []

    if (occurrence.status === 'archived') {
      attention.push(`Archived occurrence ${occurrence.occurrenceDate}`)
    }
    if (
      execution.pending &&
      occurrence.occurrenceDate < asOfDate &&
      occurrence.status === 'scheduled'
    ) {
      attention.push(
        `${programme.name} on ${occurrence.occurrenceDate} is still scheduled (past date)`,
      )
    }

    let attendance: AttendanceSnapshot | undefined
    if (programmeRequiresEventAttendance(programme.kind)) {
      const eventId =
        occurrence.sourceRef?.kind === 'weekly_ijtema_event'
          ? occurrence.sourceRef.eventId
          : undefined
      if (eventId) {
        attendance = wiAttendance(eventId, wiSubmissions)
        if (attendance.reminded === 0 && execution.occurred) {
          attention.push(`${programme.name} on ${occurrence.occurrenceDate} has no WI marks`)
        }
      }
    } else if (programme.kind === 'monthly_baitul_maal') {
      const cycleId =
        occurrence.sourceRef?.kind === 'monthly_baitul_maal_cycle'
          ? occurrence.sourceRef.cycleId
          : undefined
      if (cycleId) {
        attendance = bmAttendance(cycleId, bmSubmissions)
      }
    }

    for (const item of attention) attentionItems.push(item)

    activityRows.push({
      occurrenceId: occurrence.id,
      occurrenceDate: occurrence.occurrenceDate,
      occurrenceStatus: occurrence.status,
      programmeId: programme.id,
      programmeName: programme.name,
      programmeKind: programme.kind,
      programmeStatus: programme.status,
      campaignId: programme.campaignId,
      objectiveIds: [programme.objectiveId]
        .filter((id): id is string => Boolean(id?.trim()))
        .filter((id) => mansoobaObjectiveIds.has(id)),
      execution,
      attendance,
      attention,
    })
  }

  activityRows.sort((a, b) => {
    if (a.occurrenceDate !== b.occurrenceDate) {
      return a.occurrenceDate < b.occurrenceDate ? -1 : 1
    }
    return a.occurrenceId.localeCompare(b.occurrenceId)
  })

  const countable = activityRows.filter((row) => row.execution.scheduled)
  const scheduled = uniqueCount(countable.map((row) => row.occurrenceId))
  const occurred = uniqueCount(
    countable.filter((row) => row.execution.occurred).map((row) => row.occurrenceId),
  )
  const completed = uniqueCount(
    countable.filter((row) => row.execution.completed).map((row) => row.occurrenceId),
  )
  const pending = uniqueCount(
    countable.filter((row) => row.execution.pending).map((row) => row.occurrenceId),
  )

  const programmeRows: ProgrammeActivityRow[] = linkedProgrammes
    .map((programme) => {
      const rows = countable.filter((row) => row.programmeId === programme.id)
      return {
        programmeId: programme.id,
        name: programme.name,
        kind: programme.kind,
        status: programme.status,
        scheduled: rows.length,
        occurred: rows.filter((row) => row.execution.occurred).length,
        completed: rows.filter((row) => row.execution.completed).length,
        pending: rows.filter((row) => row.execution.pending).length,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const objectiveRows: ObjectiveProgressRow[] = mansoobaObjectives
    .map((objective) => {
      const programmeIds = new Set(
        linkedProgrammes
          .filter((programme) => programme.objectiveId === objective.id)
          .map((programme) => programme.id),
      )
      const rows = countable.filter((row) => programmeIds.has(row.programmeId))
      const ids = rows.map((row) => row.occurrenceId)
      return {
        objectiveId: objective.id,
        title: objective.title,
        programmeCount: programmeIds.size,
        scheduled: uniqueCount(ids),
        occurred: uniqueCount(
          rows.filter((row) => row.execution.occurred).map((row) => row.occurrenceId),
        ),
        completed: uniqueCount(
          rows.filter((row) => row.execution.completed).map((row) => row.occurrenceId),
        ),
        pending: uniqueCount(
          rows.filter((row) => row.execution.pending).map((row) => row.occurrenceId),
        ),
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title))

  const workRows: WorkPeriodRow[] = []
  const gaps: MansoobaReportGapId[] = ['orientation_not_period_scoped', 'no_approved_performance_score']
  if (!mansooba.primaryUnitId) {
    gaps.push('work_requires_primary_unit_and_due_date')
  } else {
    for (const item of work) {
      if (item.unitId !== mansooba.primaryUnitId) continue
      if (!item.dueDate || !dateKeyInPeriod(item.dueDate, period)) continue
      const done = item.status === 'done'
      const pendingWork = item.status === 'pending' || item.status === 'in_progress'
      const overdue = pendingWork && item.dueDate < asOfDate
      if (overdue) {
        attentionItems.push(`Work overdue: ${item.title} (${item.dueDate})`)
      }
      workRows.push({
        workId: item.id,
        title: item.title,
        status: item.status,
        dueDate: item.dueDate,
        completed: done,
        pending: pendingWork,
        overdue,
      })
    }
  }
  if (unlinkedProgrammeCount > 0) {
    gaps.push('programmes_unlinked_to_mansooba')
  }

  const monthlyMap = new Map<string, MonthlyProgressionRow>()
  for (const row of countable) {
    const monthKey = row.occurrenceDate.slice(0, 7)
    const current = monthlyMap.get(monthKey) ?? {
      monthKey,
      scheduled: 0,
      completed: 0,
      pending: 0,
    }
    current.scheduled += 1
    if (row.execution.completed) current.completed += 1
    if (row.execution.pending) current.pending += 1
    monthlyMap.set(monthKey, current)
  }
  const monthlyProgression = [...monthlyMap.values()].sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey),
  )

  return {
    mansoobaId: mansooba.id,
    mansoobaName: mansooba.name,
    period,
    plannedProgrammeCount: linkedProgrammes.length,
    scheduled,
    occurred,
    completed,
    pending,
    workCompleted: workRows.filter((row) => row.completed).length,
    workPending: workRows.filter((row) => row.pending).length,
    activityRows,
    objectiveRows,
    programmeRows,
    workRows,
    monthlyProgression,
    attentionItems: [...new Set(attentionItems)],
    gaps,
    unlinkedProgrammeCount,
  }
}
