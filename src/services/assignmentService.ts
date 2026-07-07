import { MOCK_KARKUN_REGISTRY, getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById, ruknMaster } from '@/data/ruknMaster'
import { getAllKarkuns, getCompatibleKarkunsForRukn, notifyPeopleRegistryChange } from '@/lib/peopleStore'
import { logPeopleAudit } from '@/lib/peopleAuditLog'
import { isValidMobileFormat, normalizeMobile } from '@/lib/mobileValidation'
import { logActivity } from '@/stores/activityLogStore'
import {
  appendAssignment,
  countAssignmentChanges,
  generateAssignmentNumber,
  getActiveAssignmentForRukn,
  getActiveAssignmentsForKarkun,
  getActiveAssignmentsForRukn,
  getAllAssignments,
  getAssignmentHistoryForKarkun,
  getAssignmentHistoryForRukn,
  getAssignmentPeriodCounts,
  getSuspendedAssignmentForRukn,
  updateAssignmentStatus,
} from '@/stores/assignmentStore'
import type {
  AssignInput,
  AssignmentDashboardMetrics,
  AssignmentRecord,
  AssignmentResult,
  KarkunWorkloadSummary,
  RemoveInput,
  ReplaceInput,
  RestoreInput,
  RuknAssignmentSummary,
} from '@/types/assignment'
import {
  validateAssignInput,
  validateRemoveInput,
  validateReplaceInput,
  validateRestoreInput,
} from '@/validation/assignmentValidation'

function nowIso(): string {
  return new Date().toISOString()
}

function createAssignmentRecord(
  input: Omit<
    AssignmentRecord,
    'assignmentId' | 'assignmentNumber' | 'assignedDate' | 'createdAt' | 'updatedAt' | 'status'
  >,
): AssignmentRecord {
  const timestamp = nowIso()
  return {
    assignmentId: `asgn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    assignmentNumber: generateAssignmentNumber(),
    assignedDate: input.effectiveFrom,
    status: 'Active',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input,
  }
}

function syncKarkunRegistryFromAssignments(karkunId: string, options?: { notify?: boolean }): void {
  const karkun = MOCK_KARKUN_REGISTRY.find((k) => k.id === karkunId && !k.isArchived)
  if (!karkun) return

  const activeAssignments = getActiveAssignmentsForKarkun(karkunId)
  if (activeAssignments.length === 0) {
    karkun.assignmentStatus = 'Available'
    karkun.assignedRuknId = ''
    karkun.assignedRukn = ''
    karkun.assignmentDate = undefined
    karkun.campaignStatus = karkun.status === 'active' ? 'not_assigned' : 'inactive'
    if (options?.notify !== false) {
      notifyPeopleRegistryChange()
    }
    return
  }

  const primary = activeAssignments[0]
  const rukn = getRuknById(primary.ruknId)
  karkun.assignmentStatus = 'Assigned'
  karkun.assignedRuknId = primary.ruknId
  karkun.assignedRukn = rukn?.name ?? ''
  karkun.assignmentDate = primary.effectiveFrom
  karkun.campaignStatus = 'active'

  if (options?.notify !== false) {
    notifyPeopleRegistryChange()
  }
}

/** Reconcile Karkun registry fields from persisted assignment records after app reload. */
export function syncAllKarkunRegistryFromAssignments(): void {
  for (const karkun of getAllKarkuns()) {
    syncKarkunRegistryFromAssignments(karkun.id, { notify: false })
  }
  notifyPeopleRegistryChange()
}

function formatNames(ruknId: string, karkunId: string): { ruknName: string; karkunName: string } {
  return {
    ruknName: getRuknById(ruknId)?.name ?? ruknId,
    karkunName: getKarkunById(karkunId)?.name ?? karkunId,
  }
}

export function assignRukn(input: AssignInput): AssignmentResult {
  const validation = validateAssignInput(input)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const assignment = appendAssignment(
    createAssignmentRecord({
      ruknId: input.ruknId,
      karkunId: input.karkunId,
      effectiveFrom: input.effectiveFrom,
      assignedBy: input.assignedBy,
      remarks: input.remarks,
    }),
  )

  syncKarkunRegistryFromAssignments(input.karkunId)

  const { ruknName, karkunName } = formatNames(input.ruknId, input.karkunId)

  logPeopleAudit({
    personKind: 'karkun',
    personId: input.karkunId,
    personName: karkunName,
    action: 'assign',
    newValue: ruknName,
    updatedBy: input.assignedBy,
  })

  logActivity({
    type: 'assign',
    message: `${karkunName} connected to ${ruknName}`,
    ruknId: input.ruknId,
    karkunId: input.karkunId,
    assignmentId: assignment.assignmentId,
    actor: input.assignedBy,
  })

  return { success: true, assignment }
}

export function replaceAssignment(input: ReplaceInput): AssignmentResult {
  const validation = validateReplaceInput(input)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const current = (input.currentKarkunId
    ? getActiveAssignmentsForKarkun(input.currentKarkunId).find(
        (record) => record.ruknId === input.ruknId,
      )
    : getActiveAssignmentForRukn(input.ruknId))!
  const endedAt = input.effectiveFrom
  const timestamp = nowIso()

  updateAssignmentStatus(current.assignmentId, 'Replaced', {
    replacementReason: input.replacementReason,
    remarks: input.remarks,
    endedDate: endedAt,
    updatedAt: timestamp,
  })

  syncKarkunRegistryFromAssignments(current.karkunId)

  const newAssignment = appendAssignment(
    createAssignmentRecord({
      ruknId: input.ruknId,
      karkunId: input.newKarkunId,
      effectiveFrom: input.effectiveFrom,
      assignedBy: input.assignedBy,
      remarks: input.remarks,
    }),
  )

  syncKarkunRegistryFromAssignments(input.newKarkunId)

  const previous = formatNames(input.ruknId, current.karkunId)
  const next = formatNames(input.ruknId, input.newKarkunId)

  logPeopleAudit({
    personKind: 'karkun',
    personId: current.karkunId,
    personName: previous.karkunName,
    action: 'unassign',
    previousValue: previous.ruknName,
    updatedBy: input.assignedBy,
  })

  logPeopleAudit({
    personKind: 'karkun',
    personId: input.newKarkunId,
    personName: next.karkunName,
    action: 'assign',
    newValue: next.ruknName,
    updatedBy: input.assignedBy,
  })

  logActivity({
    type: 'replace',
    message: `${next.karkunName} replaced ${previous.karkunName}`,
    ruknId: input.ruknId,
    karkunId: input.newKarkunId,
    assignmentId: newAssignment.assignmentId,
    actor: input.assignedBy,
  })

  return { success: true, assignment: newAssignment }
}

export function removeAssignment(input: RemoveInput): AssignmentResult {
  const validation = validateRemoveInput(input)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const current = (input.karkunId
    ? getActiveAssignmentsForKarkun(input.karkunId).find(
        (record) => record.ruknId === input.ruknId,
      )
    : getActiveAssignmentForRukn(input.ruknId))!
  const timestamp = nowIso()

  updateAssignmentStatus(current.assignmentId, 'Unassigned', {
    removalReason: input.removalReason,
    remarks: input.remarks,
    endedDate: input.effectiveFrom,
    updatedAt: timestamp,
  })

  syncKarkunRegistryFromAssignments(current.karkunId)

  const { ruknName, karkunName } = formatNames(input.ruknId, current.karkunId)

  logPeopleAudit({
    personKind: 'karkun',
    personId: current.karkunId,
    personName: karkunName,
    action: 'unassign',
    previousValue: ruknName,
    updatedBy: input.assignedBy,
  })

  logActivity({
    type: 'remove',
    message: `Connection removed — ${karkunName} from ${ruknName}`,
    ruknId: input.ruknId,
    karkunId: current.karkunId,
    assignmentId: current.assignmentId,
    actor: input.assignedBy,
  })

  return { success: true, assignment: current }
}

export function restoreAssignment(input: RestoreInput): AssignmentResult {
  const validation = validateRestoreInput(input)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const result = assignRukn(input)
  if (!result.success) {
    return result
  }

  const { ruknName, karkunName } = formatNames(input.ruknId, input.karkunId)

  logActivity({
    type: 'restore',
    message: `Connection restored — ${karkunName} to ${ruknName}`,
    ruknId: input.ruknId,
    karkunId: input.karkunId,
    assignmentId: result.assignment.assignmentId,
    actor: input.assignedBy,
  })

  return result
}

export function getRuknAssignmentSummary(ruknId: string): RuknAssignmentSummary {
  const history = getAssignmentHistoryForRukn(ruknId)
  const activeAssignments = getActiveAssignmentsForRukn(ruknId)
  const currentAssignment = activeAssignments[0] ?? null
  const suspendedAssignment = getSuspendedAssignmentForRukn(ruknId) ?? null
  const lastChange = history[0]

  let assignmentStatus: RuknAssignmentSummary['assignmentStatus'] = 'Unassigned'
  if (activeAssignments.length > 0) {
    assignmentStatus = 'Assigned'
  } else if (suspendedAssignment) {
    assignmentStatus = 'Suspended'
  }

  const primary = currentAssignment ?? suspendedAssignment

  return {
    currentAssignment: primary,
    activeAssignments,
    assignedKarkunCount: activeAssignments.length,
    assignmentSince: primary?.effectiveFrom ?? null,
    assignmentHistory: history,
    lastAssignmentChange: lastChange?.updatedAt ?? null,
    assignmentStatus,
  }
}

export function getKarkunWorkloadSummary(karkunId: string): KarkunWorkloadSummary {
  const history = getAssignmentHistoryForKarkun(karkunId)
  const activeAssignments = history.filter((record) => record.status === 'Active')
  const completedAssignments = history.filter((record) => record.status === 'Completed')
  const inactiveAssignments = history.filter(
    (record) =>
      record.status === 'Unassigned' ||
      record.status === 'Replaced' ||
      record.status === 'Suspended',
  )

  const assignedRukns = activeAssignments
    .map((record) => getRuknById(record.ruknId)?.name ?? record.ruknId)
    .filter(Boolean)

  return {
    assignedRukns,
    activeAssignments,
    completedAssignments,
    inactiveAssignments,
  }
}

export function getAssignmentDashboardMetrics(): AssignmentDashboardMetrics {
  const activeAssignments = getAllAssignments().filter((record) => record.status === 'Active')
  const assignedRuknIds = new Set(activeAssignments.map((record) => record.ruknId))
  const activeRukns = ruknMaster.filter((rukn) => rukn.status === 'active')
  const karkuns = getAllKarkuns().filter(
    (k) => k.status === 'active' && isValidMobileFormat(normalizeMobile(k.mobile)),
  )
  const periodCounts = getAssignmentPeriodCounts()

  return {
    activeAssignments: activeAssignments.length,
    unassignedRukns: activeRukns.filter((rukn) => !assignedRuknIds.has(rukn.id)).length,
    assignedRukns: assignedRuknIds.size,
    availableMaleKarkuns: karkuns.filter(
      (k) => k.gender === 'Male' && k.assignmentStatus === 'Available',
    ).length,
    availableFemaleKarkuns: karkuns.filter(
      (k) => k.gender === 'Female' && k.assignmentStatus === 'Available',
    ).length,
    totalAssignmentChanges: countAssignmentChanges(),
    assignmentsToday: periodCounts.assignmentsToday,
    assignmentsThisWeek: periodCounts.assignmentsThisWeek,
    assignmentsThisMonth: periodCounts.assignmentsThisMonth,
  }
}

export function getKarkunsForRuknAssignment(ruknId: string) {
  return getCompatibleKarkunsForRukn(ruknId).filter(
    (k) => !k.isArchived && isValidMobileFormat(normalizeMobile(k.mobile)),
  )
}

export function getUnassignedRukns() {
  const assignedIds = new Set(
    getAllAssignments()
      .filter((record) => record.status === 'Active')
      .map((record) => record.ruknId),
  )
  return ruknMaster.filter((rukn) => rukn.status === 'active' && !assignedIds.has(rukn.id))
}

export function getAssignedRukns() {
  const assignedIds = new Set(
    getAllAssignments()
      .filter((record) => record.status === 'Active')
      .map((record) => record.ruknId),
  )
  return ruknMaster.filter((rukn) => assignedIds.has(rukn.id))
}

export function getKarkunWithWorkload() {
  return getAllKarkuns()
    .filter((k) => !k.isArchived)
    .map((karkun) => ({
      karkun,
      workload: getKarkunWorkloadSummary(karkun.id),
    }))
}

export function ruknMatchesAssignmentSearch(ruknId: string, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  const rukn = getRuknById(ruknId)
  if (!rukn) return false

  if (rukn.name.toLowerCase().includes(normalized)) return true
  if (rukn.mobile.toLowerCase().includes(normalized)) return true

  const history = getAssignmentHistoryForRukn(ruknId)
  for (const record of history) {
    if (record.assignmentNumber.toLowerCase().includes(normalized)) return true

    const karkun = getKarkunById(record.karkunId)
    if (karkun) {
      if (karkun.name.toLowerCase().includes(normalized)) return true
      if (karkun.mobile.toLowerCase().includes(normalized)) return true
    }
  }

  return false
}

export { getAllAssignments, getAssignmentHistoryForRukn, getAssignmentHistoryForKarkun }
