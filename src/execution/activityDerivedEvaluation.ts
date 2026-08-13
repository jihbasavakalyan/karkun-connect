/**
 * Phase 8 / TASK-064 — Activity-derived evaluation (KC-020 Evaluation layer).
 * Authority: docs/architecture/kc-phase8-activity-derived-evaluation-arch009-gate.md
 *
 * Answers: how actual recorded activity contributes toward an Objective.
 * Consumes TASK-063 PlanningObjectiveEvaluation + Phase 5 activity rows.
 * Derived read model. Does NOT persist. Does NOT invent a performance score.
 * Does NOT generate Next Best Action or Rafeeq copy.
 *
 * Scheduled-only activity is not contribution. Journey snapshots stay on TASK-063.
 */

import type { CampaignListItem } from '@/constants/mockMissions'
import {
  buildMansoobaActivityReport,
  type MansoobaActivityRow,
  type WorkPeriodRow,
} from '@/lib/mansoobaReporting/buildMansoobaActivityReport'
import {
  MANSOOBA_REPORT_TIMEZONE,
  resolveMansoobaReportPeriod,
  type MansoobaReportPeriod,
} from '@/lib/mansoobaReporting/periods'
import { todayWorkCalendarDate } from '@/lib/work/ruknActionItems'
import { unwrapRepository } from '@/repositories/errors'
import { getRepositories } from '@/repositories/provider'
import { getAllMonthlyBaitulMaalCycles, getAllMonthlyBaitulMaalSubmissions } from '@/stores/monthlyBaitulMaalStore'
import { getAllWeeklyIjtemaEvents, getAllWeeklyIjtemaSubmissions } from '@/stores/weeklyIjtemaStore'
import type { LocalProgramme } from '@/types/localProgramme.types'
import type { MeqatiMansooba } from '@/types/planning.types'
import type { Work } from '@/types/work.types'
import { getAutomationEngine } from './AutomationEngine'
import type { ObjectiveEvaluation } from './objectiveEvaluation'
import {
  loadPlanningObjectiveEvaluations,
  type PlanningObjectiveEvaluation,
} from './planningObjectiveEvaluation'
import type { CampaignObjectiveKind } from './types'

export type ActivityDerivedEvaluationState =
  | 'not_evaluated'
  | 'insufficient_activity'
  | 'activity_contributes'

export type ActivityDerivedEvidenceKind =
  | 'occurrence_occurred'
  | 'occurrence_completed'
  | 'occurrence_pending'
  | 'wi_attendance'
  | 'bm_contribution'
  | 'work_completed'
  | 'work_pending'
  | 'execution_advanced'

export type ActivityDerivedEvidenceItem = {
  kind: ActivityDerivedEvidenceKind
  sourceId: string
  label: string
  detail: string
}

export type ActivityDerivedCounts = {
  scheduled: number
  occurred: number
  completed: number
  pending: number
  wiPresent: number
  wiAbsent: number
  bmContributed: number
  bmPending: number
  workCompleted: number
  workPending: number
  executionsAdvanced: number
}

export type ActivityDerivedEvaluation = {
  objectiveId: string
  mansoobaId: string
  title: string
  objectiveState: PlanningObjectiveEvaluation['state']
  activityState: ActivityDerivedEvaluationState
  objectiveKind: CampaignObjectiveKind | null
  period: MansoobaReportPeriod
  counts: ActivityDerivedCounts
  evidence: ActivityDerivedEvidenceItem[]
  explanation: string
  evaluatedAt: string
  objectiveEvaluation: PlanningObjectiveEvaluation
}

export type EvaluateActivityDerivedInput = {
  evaluation: PlanningObjectiveEvaluation
  period: MansoobaReportPeriod
  activityRows: readonly MansoobaActivityRow[]
  workRows?: readonly WorkPeriodRow[]
  executionEvaluations?: readonly ObjectiveEvaluation[]
  evaluatedAt?: string
}

function emptyCounts(): ActivityDerivedCounts {
  return {
    scheduled: 0,
    occurred: 0,
    completed: 0,
    pending: 0,
    wiPresent: 0,
    wiAbsent: 0,
    bmContributed: 0,
    bmPending: 0,
    workCompleted: 0,
    workPending: 0,
    executionsAdvanced: 0,
  }
}

function explain(
  state: ActivityDerivedEvaluationState,
  counts: ActivityDerivedCounts,
  evidenceCount: number,
): string {
  if (state === 'not_evaluated') {
    return 'Not evaluated: Objective has no evaluation rule, so recorded activity is not interpreted toward it.'
  }
  if (state === 'insufficient_activity') {
    if (counts.scheduled > 0 || counts.pending > 0 || counts.workPending > 0) {
      return 'Insufficient activity: scheduled or pending records exist, but no occurred/completed activity, attendance marks, completed Work, or advanced execution was found. This is not a performance score.'
    }
    return 'Insufficient activity: evaluation rule is present but no recorded activity contributes toward this Objective. Journey snapshots are not period-scoped activity. This is not a performance score.'
  }
  return `Activity contributes: ${evidenceCount} recorded activity reference(s) toward this Objective (${counts.occurred} occurred, ${counts.completed} completed). This is not a performance score.`
}

/**
 * Derive how actual activity contributes to a TASK-063 Objective evaluation.
 * Does not mutate PlanningObjective. Does not persist.
 */
export function evaluateActivityDerivedObjective(
  input: EvaluateActivityDerivedInput,
): ActivityDerivedEvaluation {
  const evaluatedAt = input.evaluatedAt ?? input.evaluation.evaluatedAt
  const evaluation = input.evaluation
  const rows = input.activityRows.filter((row) =>
    row.objectiveIds.includes(evaluation.objectiveId),
  )
  const workRows = input.workRows ?? []
  const counts = emptyCounts()
  const evidence: ActivityDerivedEvidenceItem[] = []

  if (evaluation.state === 'not_evaluated') {
    return {
      objectiveId: evaluation.objectiveId,
      mansoobaId: evaluation.mansoobaId,
      title: evaluation.title,
      objectiveState: evaluation.state,
      activityState: 'not_evaluated',
      objectiveKind: evaluation.objectiveKind,
      period: input.period,
      counts,
      evidence: [],
      explanation: explain('not_evaluated', counts, 0),
      evaluatedAt,
      objectiveEvaluation: evaluation,
    }
  }

  for (const row of rows) {
    if (row.execution.scheduled) counts.scheduled += 1
    if (row.execution.occurred) counts.occurred += 1
    if (row.execution.completed) counts.completed += 1
    if (row.execution.pending) counts.pending += 1

    if (row.execution.occurred) {
      evidence.push({
        kind: 'occurrence_occurred',
        sourceId: row.occurrenceId,
        label: row.programmeName,
        detail: `Occurrence on ${row.occurrenceDate} occurred (${row.occurrenceStatus}).`,
      })
    }
    if (row.execution.completed) {
      evidence.push({
        kind: 'occurrence_completed',
        sourceId: row.occurrenceId,
        label: row.programmeName,
        detail: `Occurrence on ${row.occurrenceDate} completed.`,
      })
    }
    if (row.execution.pending && !row.execution.occurred && !row.execution.completed) {
      evidence.push({
        kind: 'occurrence_pending',
        sourceId: row.occurrenceId,
        label: row.programmeName,
        detail: `Occurrence on ${row.occurrenceDate} is scheduled/pending and has not occurred.`,
      })
    }

    const attendance = row.attendance
    if (attendance && attendance.present + attendance.absent > 0) {
      if (attendance.source === 'weekly_ijtema') {
        counts.wiPresent += attendance.present
        counts.wiAbsent += attendance.absent
        evidence.push({
          kind: 'wi_attendance',
          sourceId: row.occurrenceId,
          label: row.programmeName,
          detail: `Weekly Ijtema marks: ${attendance.present} Present, ${attendance.absent} Absent.`,
        })
      } else {
        counts.bmContributed += attendance.present
        counts.bmPending += attendance.absent
        evidence.push({
          kind: 'bm_contribution',
          sourceId: row.occurrenceId,
          label: row.programmeName,
          detail: `Bait-ul-Maal marks: ${attendance.present} Contributed, ${attendance.absent} Pending.`,
        })
      }
    }
  }

  for (const work of workRows) {
    if (work.completed) {
      counts.workCompleted += 1
      evidence.push({
        kind: 'work_completed',
        sourceId: work.workId,
        label: work.title,
        detail: `Work completed (due ${work.dueDate}).`,
      })
    } else if (work.pending) {
      counts.workPending += 1
      evidence.push({
        kind: 'work_pending',
        sourceId: work.workId,
        label: work.title,
        detail: `Work still pending (due ${work.dueDate}${work.overdue ? ', overdue' : ''}).`,
      })
    }
  }

  if (evaluation.objectiveKind) {
    const advanced = (input.executionEvaluations ?? []).filter(
      (row) => row.objectiveKind === evaluation.objectiveKind && row.progress === 'advanced',
    )
    counts.executionsAdvanced = advanced.length
    if (advanced.length > 0) {
      const latest = advanced[advanced.length - 1]!
      evidence.push({
        kind: 'execution_advanced',
        sourceId: latest.id,
        label: 'KC-020 execution evaluation',
        detail: `${advanced.length} execution evaluation(s) advanced kind ${evaluation.objectiveKind}.`,
      })
    }
  }

  const contributing = evidence.filter(
    (row) =>
      row.kind === 'occurrence_occurred' ||
      row.kind === 'occurrence_completed' ||
      row.kind === 'wi_attendance' ||
      row.kind === 'bm_contribution' ||
      row.kind === 'work_completed' ||
      row.kind === 'execution_advanced',
  )
  const activityState: ActivityDerivedEvaluationState =
    contributing.length > 0 ? 'activity_contributes' : 'insufficient_activity'

  return {
    objectiveId: evaluation.objectiveId,
    mansoobaId: evaluation.mansoobaId,
    title: evaluation.title,
    objectiveState: evaluation.state,
    activityState,
    objectiveKind: evaluation.objectiveKind,
    period: input.period,
    counts,
    evidence,
    explanation: explain(activityState, counts, contributing.length),
    evaluatedAt,
    objectiveEvaluation: evaluation,
  }
}

export function resolveActivityEvaluationPeriod(
  mansooba: Pick<MeqatiMansooba, 'startDate' | 'endDate'> | undefined,
  asOfDate: string,
  explicit?: MansoobaReportPeriod,
): MansoobaReportPeriod {
  if (explicit) return explicit
  const startDate = mansooba?.startDate?.trim()
  const endDate = mansooba?.endDate?.trim()
  if (startDate && endDate) {
    return {
      kind: 'yearly',
      startDate,
      endDate,
      periodKey: `${startDate}:${endDate}`,
      timezone: MANSOOBA_REPORT_TIMEZONE,
    }
  }
  return (
    resolveMansoobaReportPeriod({ kind: 'yearly', asOfDate }) ?? {
      kind: 'yearly',
      startDate: `${asOfDate.slice(0, 4)}-01-01`,
      endDate: `${asOfDate.slice(0, 4)}-12-31`,
      periodKey: asOfDate.slice(0, 4),
      timezone: MANSOOBA_REPORT_TIMEZONE,
    }
  )
}

function unitIdsForObjective(
  objectiveId: string,
  campaigns: readonly CampaignListItem[],
  programmes: readonly LocalProgramme[],
  mansooba?: MeqatiMansooba,
): Set<string> {
  const linkedCampaigns = campaigns.filter((row) => row.objectiveIds?.includes(objectiveId))
  const linkedCampaignIds = new Set(linkedCampaigns.map((row) => row.id))
  const unitIds = new Set(
    programmes
      .filter((row) => linkedCampaignIds.has(row.campaignId))
      .map((row) => row.unitId?.trim())
      .filter((id): id is string => Boolean(id)),
  )
  if (mansooba?.primaryUnitId?.trim() && linkedCampaigns.length > 0) {
    unitIds.add(mansooba.primaryUnitId.trim())
  }
  return unitIds
}

/** Load derived activity evaluations for all Planning Objectives. No persistence. */
export function loadActivityDerivedEvaluations(
  asOfDate = todayWorkCalendarDate(),
  period?: MansoobaReportPeriod,
): ActivityDerivedEvaluation[] {
  const evaluations = loadPlanningObjectiveEvaluations(asOfDate)
  const repos = getRepositories()
  const objectives = unwrapRepository(repos.objective.loadAll(), [])
  const mansoobas = unwrapRepository(repos.meqatiMansooba.loadAll(), [])
  const mansoobaById = new Map(mansoobas.map((row) => [row.id, row]))
  const campaigns = unwrapRepository(repos.campaign.getAll(), [])
  const programmes = unwrapRepository(repos.localProgramme.loadAll(), [])
  const occurrences = unwrapRepository(repos.occurrence.loadAll(), [])
  const workRows = unwrapRepository(repos.work.loadAll(), [])
  const workById = new Map(workRows.map((row) => [row.id, row]))
  const weeklyIjtemaEvents = getAllWeeklyIjtemaEvents()
  const weeklyIjtemaSubmissions = getAllWeeklyIjtemaSubmissions()
  const baitulMaalCycles = getAllMonthlyBaitulMaalCycles()
  const baitulMaalSubmissions = getAllMonthlyBaitulMaalSubmissions()
  const snapshotEvaluations = getAutomationEngine().snapshot().objectiveEvaluations
  const evaluatedAt = new Date().toISOString()

  const reportByMansooba = new Map(
    mansoobas.map((mansooba) => {
      const resolvedPeriod = resolveActivityEvaluationPeriod(mansooba, asOfDate, period)
      const report = buildMansoobaActivityReport({
        mansooba,
        period: resolvedPeriod,
        asOfDate,
        objectives,
        campaigns,
        programmes,
        occurrences,
        work: workRows,
        weeklyIjtemaEvents,
        weeklyIjtemaSubmissions,
        baitulMaalCycles,
        baitulMaalSubmissions,
      })
      return [mansooba.id, { report, period: resolvedPeriod }] as const
    }),
  )

  return evaluations.map((evaluation) => {
    const mansooba = mansoobaById.get(evaluation.mansoobaId)
    const packed = reportByMansooba.get(evaluation.mansoobaId)
    const resolvedPeriod =
      packed?.period ?? resolveActivityEvaluationPeriod(mansooba, asOfDate, period)
    const report = packed?.report
    const unitIds = unitIdsForObjective(
      evaluation.objectiveId,
      campaigns,
      programmes,
      mansooba,
    )
    const scopedWork = (report?.workRows ?? []).filter((row) => {
      const original: Work | undefined = workById.get(row.workId)
      return Boolean(original?.unitId && unitIds.has(original.unitId))
    })
    return evaluateActivityDerivedObjective({
      evaluation,
      period: resolvedPeriod,
      activityRows: report?.activityRows ?? [],
      workRows: scopedWork,
      executionEvaluations: snapshotEvaluations,
      evaluatedAt,
    })
  })
}
