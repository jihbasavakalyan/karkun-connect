/**
 * KC-0108 — Monthly Baitul Maal completion service.
 * Reuses shared campaignCycle lifecycle from KC-0107.
 *
 * KC-0112 — CANONICAL Monthly Baitul Maal execution track (cycle/submission).
 * Campaign Health / Mission / Top Priority must use this service
 * (`getMonthlyBaitulMaalDashboardKpi`). Do not replace with baitulMaal*.
 * Inventory: docs/architecture/kc-0112-monthly-baitul-maal-inventory.md
 *
 * KC-0111 — Health slice uses contributed÷totalAssigned from this KPI
 * (not marked-only completionPct). See kc-0111-campaign-health-inventory.md.
 *
 * KC-0112.6
 * Canonical Monthly Baitul Maal write path (single-mark upsert / remove).
 * Legacy updates retained only for documented compatibility (via write adapter).
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
import { getAllBaitulMaalRecords } from '@/stores/baitulMaalStore'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { classifyBaitulMaalStoredRecord } from '@/lib/reporting/statusNormalization'
import type {
  CreateMonthlyBaitulMaalCycleInput,
  MonthlyBaitulMaalCommittedRow,
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
import { getCurrentMonthKey } from '@/services/jihWebPortalService'

/**
 * Prefer Open cycle for the application current month.
 * Never rely on array order when multiple Open cycles exist (Phase 2: July before August).
 */
export function pickPreferredOpenMonthlyBaitulMaalCycle(
  cycles: MonthlyBaitulMaalCycle[],
  monthKey: string = getCurrentMonthKey(),
): MonthlyBaitulMaalCycle | undefined {
  const open = cycles.filter((cycle) => cycle.status === 'Open')
  if (open.length === 0) return undefined

  const forMonth = open.filter((cycle) => cycle.monthKey === monthKey)
  const pool = forMonth.length > 0 ? forMonth : open

  if (pool.length > 1) {
    console.warn('[monthlyBaitulMaal] multiple Open cycles — selecting deterministically', {
      monthKey,
      preferredMonthMatch: forMonth.length > 0,
      cycleIds: pool.map((cycle) => cycle.id),
      monthKeys: pool.map((cycle) => cycle.monthKey),
    })
  }

  return [...pool].sort((a, b) => {
    // Current-month matches: newest updatedAt, then id.
    // Cross-month fallback: newest monthKey first, then updatedAt, then id.
    if (forMonth.length === 0) {
      const byMonth = b.monthKey.localeCompare(a.monthKey)
      if (byMonth !== 0) return byMonth
    }
    const byUpdated = String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''))
    if (byUpdated !== 0) return byUpdated
    return b.id.localeCompare(a.id)
  })[0]
}

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
  return pickPreferredOpenMonthlyBaitulMaalCycle(cycles) ?? cycles[0]
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

/** Open cycle for current-month writes (KC-0112.6) — never first-Open-by-array-order. */
export function getOpenMonthlyBaitulMaalCycle(): MonthlyBaitulMaalCycle | undefined {
  return pickPreferredOpenMonthlyBaitulMaalCycle(getAllMonthlyBaitulMaalCycles())
}

export type UpsertMonthlyBaitulMaalKarkunMarkInput = {
  cycleId: string
  ruknId: string
  ruknName: string
  karkunId: string
  karkunName: string
  status: 'Contributed' | 'Pending'
  submittedBy: string
}

/**
 * KC-0112.6 — Canonical single-mark upsert (partial submission allowed).
 * Full-register submit remains `saveMonthlyBaitulMaalSubmission` (all assigned required).
 */
export function upsertMonthlyBaitulMaalKarkunMark(
  input: UpsertMonthlyBaitulMaalKarkunMarkInput,
): { success: true; submission: MonthlyBaitulMaalSubmission } | { success: false; error: string } {
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
  if (!assignedIds.includes(input.karkunId)) {
    return { success: false, error: 'Karkun is not assigned to this Rukn.' }
  }
  if (input.status !== 'Contributed' && input.status !== 'Pending') {
    return { success: false, error: 'Contribution status must be Contributed or Pending.' }
  }

  const timestamp = nowIso()
  const existing = getMonthlyBaitulMaalSubmission(input.cycleId, input.ruknId)
  const marks = [...(existing?.marks ?? [])]
  const nextMark = {
    karkunId: input.karkunId,
    karkunName: input.karkunName,
    status: input.status,
  }
  const index = marks.findIndex((mark) => mark.karkunId === input.karkunId)
  if (index >= 0) {
    marks[index] = nextMark
  } else {
    marks.push(nextMark)
  }

  for (const mark of marks) {
    if (!assignedIds.includes(mark.karkunId)) {
      return { success: false, error: 'Submission includes a Karkun that is not assigned.' }
    }
    if (mark.status !== 'Contributed' && mark.status !== 'Pending') {
      return { success: false, error: 'Contribution status must be Contributed or Pending.' }
    }
  }

  const submission: MonthlyBaitulMaalSubmission = {
    id: existing?.id ?? `${input.cycleId}:${input.ruknId}`,
    eventId: input.cycleId,
    ruknId: input.ruknId,
    ruknName: input.ruknName,
    marks,
    submittedAt: existing?.submittedAt ?? timestamp,
    submittedBy: existing?.submittedBy ?? input.submittedBy,
    updatedAt: timestamp,
    updatedBy: input.submittedBy,
  }

  return { success: true, submission: upsertMonthlyBaitulMaalSubmission(submission) }
}

export type RemoveMonthlyBaitulMaalKarkunMarkInput = {
  cycleId: string
  ruknId: string
  ruknName: string
  karkunId: string
  submittedBy: string
}

/** Remove a karkun mark from an open-cycle submission (e.g. Exempt / not discussed). */
export function removeMonthlyBaitulMaalKarkunMark(
  input: RemoveMonthlyBaitulMaalKarkunMarkInput,
): { success: true; submission: MonthlyBaitulMaalSubmission | null } | { success: false; error: string } {
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

  const existing = getMonthlyBaitulMaalSubmission(input.cycleId, input.ruknId)
  if (!existing) {
    return { success: true, submission: null }
  }

  const marks = existing.marks.filter((mark) => mark.karkunId !== input.karkunId)
  if (marks.length === existing.marks.length) {
    return { success: true, submission: existing }
  }

  const timestamp = nowIso()
  const submission: MonthlyBaitulMaalSubmission = {
    ...existing,
    ruknName: input.ruknName || existing.ruknName,
    marks,
    updatedAt: timestamp,
    updatedBy: input.submittedBy,
  }

  return { success: true, submission: upsertMonthlyBaitulMaalSubmission(submission) }
}

/**
 * Read-side compatibility: surface legacy Campaign:Committed for the cycle month
 * when that Karkun has no canonical cycle mark.
 *
 * Dedup (deterministic):
 * - Canonical mark for karkunId on this cycle → contribution track wins; legacy
 *   Campaign:Committed is NOT counted as Committed (and never as Contributed).
 * - No canonical mark + legacy Campaign:Committed for cycle.monthKey → Committed +1.
 * Never mutates Firestore. Never changes contributed/pending totals.
 */
function collectLegacyCommittedForCycle(cycle: MonthlyBaitulMaalCycle): {
  committed: number
  committedRows: MonthlyBaitulMaalCommittedRow[]
  committedByRukn: Map<string, number>
} {
  const canonicalKarkunIds = new Set<string>()
  for (const submission of getMonthlyBaitulMaalSubmissionsForCycle(cycle.id)) {
    for (const mark of submission.marks ?? []) {
      canonicalKarkunIds.add(mark.karkunId)
    }
  }

  const committedRows: MonthlyBaitulMaalCommittedRow[] = []
  const committedByRukn = new Map<string, number>()

  for (const record of getAllBaitulMaalRecords()) {
    if (record.monthKey !== cycle.monthKey) continue
    const classified = classifyBaitulMaalStoredRecord({
      status: record.status,
      remarks: record.remarks,
    })
    if (classified.bucket !== 'campaign_committed') continue
    if (canonicalKarkunIds.has(record.karkunId)) continue

    const assignment = getActiveAssignmentsForKarkun(record.karkunId)[0]
    const ruknId =
      assignment?.ruknId ||
      getKarkunById(record.karkunId)?.assignedRuknId ||
      'unassigned'
    const ruknName = getRuknById(ruknId)?.name ?? ruknId
    const karkunName = getKarkunById(record.karkunId)?.name ?? record.karkunId

    committedRows.push({
      karkunId: record.karkunId,
      karkunName,
      ruknId,
      ruknName,
      monthKey: record.monthKey,
      legacyStatus: String(record.status ?? ''),
      remarks: String(record.remarks ?? ''),
      updatedAt: record.updatedAt,
      source: 'legacy',
    })
    committedByRukn.set(ruknId, (committedByRukn.get(ruknId) ?? 0) + 1)
  }

  committedRows.sort((a, b) => {
    const byRukn = a.ruknName.localeCompare(b.ruknName)
    if (byRukn !== 0) return byRukn
    return a.karkunName.localeCompare(b.karkunName)
  })

  return {
    committed: committedRows.length,
    committedRows,
    committedByRukn,
  }
}

function buildReportForCycle(cycle: MonthlyBaitulMaalCycle): MonthlyBaitulMaalReport {
  const binary = buildBinaryCycleReport(
    getMonthlyBaitulMaalSubmissionsForCycle(cycle.id),
    'Contributed',
    'Pending',
  )
  const legacyCommitted = collectLegacyCommittedForCycle(cycle)

  return {
    cycle,
    contributed: binary.positive,
    pending: binary.negative,
    committed: legacyCommitted.committed,
    committedRows: legacyCommitted.committedRows,
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
      committed: legacyCommitted.committedByRukn.get(row.ruknId) ?? 0,
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
