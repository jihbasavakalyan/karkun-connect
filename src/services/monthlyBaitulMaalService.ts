/**
 * KC-0108 — Monthly Baitul Maal completion service.
 * Reuses shared campaignCycle lifecycle from KC-0107.
 */

import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import {
  applyCycleStatusChange,
  canRuknEditCycle,
  createCycleId,
  cycleReadOnlyReason,
  isCycleDeadlinePassed,
  nowIso,
} from '@/lib/campaignCycle/lifecycle'
import { buildBinaryCycleReport } from '@/lib/campaignCycle/report'
import {
  getAllMonthlyBaitulMaalCycles,
  getMonthlyBaitulMaalCycle,
  getMonthlyBaitulMaalSubmission,
  getMonthlyBaitulMaalSubmissionsForCycle,
  upsertMonthlyBaitulMaalCycle,
  upsertMonthlyBaitulMaalSubmission,
} from '@/stores/monthlyBaitulMaalStore'
import type {
  CreateMonthlyBaitulMaalCycleInput,
  MonthlyBaitulMaalCycle,
  MonthlyBaitulMaalDashboardKpi,
  MonthlyBaitulMaalReport,
  MonthlyBaitulMaalSubmission,
  SaveMonthlyBaitulMaalSubmissionInput,
  UpdateMonthlyBaitulMaalCycleStatusInput,
} from '@/types/monthlyBaitulMaal'
import {
  defaultMonthlyBaitulMaalDeadline,
  defaultMonthlyBaitulMaalTitle,
} from '@/types/monthlyBaitulMaal'
import {
  validateCreateMonthlyBaitulMaalCycle,
  validateSaveMonthlyBaitulMaalSubmission,
} from '@/validation/monthlyBaitulMaalValidation'

export function listMonthlyBaitulMaalCycles(): MonthlyBaitulMaalCycle[] {
  return getAllMonthlyBaitulMaalCycles()
}

export function getMonthlyBaitulMaalCycleById(
  cycleId: string,
): MonthlyBaitulMaalCycle | undefined {
  return getMonthlyBaitulMaalCycle(cycleId)
}

export function getCurrentMonthlyBaitulMaalCycle(): MonthlyBaitulMaalCycle | undefined {
  const cycles = getAllMonthlyBaitulMaalCycles()
  return cycles.find((cycle) => cycle.status === 'Open') ?? cycles[0]
}

export function createMonthlyBaitulMaalCycle(
  input: CreateMonthlyBaitulMaalCycleInput,
): { success: true; cycle: MonthlyBaitulMaalCycle } | { success: false; error: string } {
  const validation = validateCreateMonthlyBaitulMaalCycle(input)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const existing = getAllMonthlyBaitulMaalCycles().find(
    (cycle) => cycle.monthKey === input.monthKey,
  )
  if (existing) {
    return { success: false, error: 'A Baitul Maal cycle already exists for this month.' }
  }

  const timestamp = nowIso()
  const actor = input.createdBy ?? 'Administrator'
  const cycle: MonthlyBaitulMaalCycle = {
    id: createCycleId('mbm'),
    title: input.title?.trim() || defaultMonthlyBaitulMaalTitle(input.monthKey),
    monthKey: input.monthKey,
    status: 'Open',
    submissionDeadline:
      input.submissionDeadline || defaultMonthlyBaitulMaalDeadline(input.monthKey),
    createdAt: timestamp,
    createdBy: actor,
    updatedAt: timestamp,
    updatedBy: actor,
  }

  return { success: true, cycle: upsertMonthlyBaitulMaalCycle(cycle) }
}

export function setMonthlyBaitulMaalCycleStatus(
  input: UpdateMonthlyBaitulMaalCycleStatusInput,
): { success: true; cycle: MonthlyBaitulMaalCycle } | { success: false; error: string } {
  const existing = getMonthlyBaitulMaalCycle(input.cycleId)
  if (!existing) {
    return { success: false, error: 'Baitul Maal cycle not found.' }
  }

  const actor = input.updatedBy ?? 'Administrator'
  return {
    success: true,
    cycle: upsertMonthlyBaitulMaalCycle(applyCycleStatusChange(existing, input.status, actor)),
  }
}

export function openMonthlyBaitulMaalCycle(cycleId: string, updatedBy?: string) {
  return setMonthlyBaitulMaalCycleStatus({ cycleId, status: 'Open', updatedBy })
}

export function closeMonthlyBaitulMaalCycle(cycleId: string, updatedBy?: string) {
  return setMonthlyBaitulMaalCycleStatus({ cycleId, status: 'Closed', updatedBy })
}

export function reopenMonthlyBaitulMaalCycle(cycleId: string, updatedBy?: string) {
  return setMonthlyBaitulMaalCycleStatus({ cycleId, status: 'Open', updatedBy })
}

export function getRuknMonthlyBaitulMaalWorkspace(cycleId: string, ruknId: string) {
  const cycle = getMonthlyBaitulMaalCycle(cycleId)
  if (!cycle) {
    return { success: false as const, error: 'Baitul Maal cycle not found.' }
  }

  const assigned = getAssignedKarkunanForRukn(ruknId)
  const submission = getMonthlyBaitulMaalSubmission(cycleId, ruknId)
  const editable = canRuknEditCycle(cycle)
  const deadlinePassed = isCycleDeadlinePassed(cycle)

  return {
    success: true as const,
    cycle,
    assigned,
    submission,
    editable,
    deadlinePassed,
    readOnlyReason: cycleReadOnlyReason(cycle, {
      closed: 'This Baitul Maal cycle is closed by Admin.',
      deadline: 'Submission deadline has passed. Records are read-only.',
      fallback: 'This cycle is not editable.',
    }),
  }
}

export function saveMonthlyBaitulMaalSubmission(
  input: SaveMonthlyBaitulMaalSubmissionInput,
):
  | { success: true; submission: MonthlyBaitulMaalSubmission }
  | { success: false; error: string } {
  const cycle = getMonthlyBaitulMaalCycle(input.cycleId)
  if (!cycle) {
    return { success: false, error: 'Baitul Maal cycle not found.' }
  }
  if (!canRuknEditCycle(cycle)) {
    return {
      success: false,
      error:
        cycle.status === 'Closed'
          ? 'Cycle is closed. Ask Admin to reopen if a correction is required.'
          : 'Submission deadline has passed. Records are read-only.',
    }
  }

  const assigned = getAssignedKarkunanForRukn(input.ruknId)
  const assignedIds = assigned.map((karkun) => karkun.id)
  const validation = validateSaveMonthlyBaitulMaalSubmission(input, assignedIds)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const timestamp = nowIso()
  const existing = getMonthlyBaitulMaalSubmission(input.cycleId, input.ruknId)
  const submission: MonthlyBaitulMaalSubmission = {
    id: existing?.id ?? `${input.cycleId}:${input.ruknId}`,
    eventId: input.cycleId,
    ruknId: input.ruknId,
    ruknName: input.ruknName,
    marks: input.marks.map((mark) => ({
      karkunId: mark.karkunId,
      karkunName: mark.karkunName,
      status: mark.status,
    })),
    submittedAt: existing?.submittedAt ?? timestamp,
    submittedBy: existing?.submittedBy ?? input.submittedBy,
    updatedAt: timestamp,
    updatedBy: input.submittedBy,
  }

  return { success: true, submission: upsertMonthlyBaitulMaalSubmission(submission) }
}

function buildReportForCycle(cycle: MonthlyBaitulMaalCycle): MonthlyBaitulMaalReport {
  const binary = buildBinaryCycleReport(
    getMonthlyBaitulMaalSubmissionsForCycle(cycle.id),
    'Contributed',
    'Pending',
  )

  return {
    cycle,
    contributed: binary.positive,
    pending: binary.negative,
    completionPct: binary.completionPct,
    totalAssigned: binary.totalAssigned,
    ruknsSubmitted: binary.ruknsSubmitted,
    ruknsPending: binary.ruknsPending,
    ruknsTotal: binary.ruknsTotal,
    ruknRows: binary.ruknRows.map((row) => ({
      ruknId: row.ruknId,
      ruknName: row.ruknName,
      assigned: row.assigned,
      contributed: row.positive,
      pending: row.negative,
      completionPct: row.completionPct,
      submitted: row.submitted,
      submittedAt: row.submittedAt,
    })),
  }
}

export function getMonthlyBaitulMaalReport(cycleId: string): MonthlyBaitulMaalReport | null {
  const cycle = getMonthlyBaitulMaalCycle(cycleId)
  if (!cycle) return null
  return buildReportForCycle(cycle)
}

export function getMonthlyBaitulMaalDashboardKpi(): MonthlyBaitulMaalDashboardKpi {
  const cycle = getCurrentMonthlyBaitulMaalCycle()
  if (!cycle) {
    return {
      cycleId: null,
      monthKey: null,
      title: null,
      cycleStatus: null,
      completionPct: 0,
      contributed: 0,
      pending: 0,
      totalAssigned: 0,
      ruknsSubmitted: 0,
      ruknsPending: 0,
      ruknsTotal: 0,
    }
  }

  const report = buildReportForCycle(cycle)
  return {
    cycleId: cycle.id,
    monthKey: cycle.monthKey,
    title: cycle.title,
    cycleStatus: cycle.status,
    completionPct: report.completionPct,
    contributed: report.contributed,
    pending: report.pending,
    totalAssigned: report.totalAssigned,
    ruknsSubmitted: report.ruknsSubmitted,
    ruknsPending: report.ruknsPending,
    ruknsTotal: report.ruknsTotal,
  }
}
