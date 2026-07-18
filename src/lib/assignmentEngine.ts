import { getKarkunById, MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import {
  getConnectedKarkunsForRukn,
} from '@/lib/connections/getConnectedKarkunsForRukn'
import { isValidMobileFormat, normalizeMobile } from '@/lib/mobileValidation'
import {
  assignRukn,
  getAllAssignments,
  getAssignmentHistoryForKarkun,
  getAssignmentHistoryForRukn,
  removeAssignment,
  replaceAssignment,
} from '@/services/assignmentService'
import {
  validateEffectiveDate,
  validateGenderMatch,
  validateKarkunActive,
  validateKarkunMobile,
  validateRuknActive,
} from '@/validation/assignmentValidation'
import { canAssignByGender } from '@/lib/peopleStore'
import { subscribeToAssignmentStore, getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import type { RemovalReason, ReplacementReason } from '@/types/assignment'
import type { AssignedBy, ReleaseReason } from '@/types/assignment.types'
import type { AssignmentRecord, AssignmentResult } from '@/types/assignment'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export type AssignKarkunResult = AssignmentResult

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export const subscribeToAssignments = subscribeToAssignmentStore

/** @see getConnectedKarkunsForRukn — canonical Active + !archived + deduped set. */
export function getAssignedKarkunanForRukn(ruknId: string): KarkunRegistryRecord[] {
  return getConnectedKarkunsForRukn(ruknId)
}

export function getAvailableKarkunan(ruknId?: string): KarkunRegistryRecord[] {
  const available = MOCK_KARKUN_REGISTRY.filter(
    (karkun) =>
      !karkun.isArchived &&
      karkun.status === 'active' &&
      karkun.assignmentStatus === 'Available' &&
      getActiveAssignmentsForKarkun(karkun.id).length === 0 &&
      karkun.mobile.trim() &&
      isValidMobileFormat(normalizeMobile(karkun.mobile)),
  )

  if (!ruknId) {
    return available
  }

  const rukn = getRuknById(ruknId)
  if (!rukn) {
    return []
  }

  return available.filter((karkun) => canAssignByGender(ruknId, karkun.id))
}

export function getAssignmentMetrics() {
  const availableKarkun = getAvailableKarkunan().length
  const assignedKarkun = new Set(
    getAllAssignments()
      .filter((record) => record.status === 'Active')
      .map((record) => record.karkunId),
  ).size
  const completedAssignments = getAllAssignments().filter(
    (record) => record.status === 'Completed' || record.status === 'Replaced',
  ).length

  return { availableKarkun, assignedKarkun, completedAssignments }
}

export function getRuknAssignmentEngineStats(ruknId: string) {
  const assignedCount = getAssignedKarkunanForRukn(ruknId).length
  const completedCount = getAssignmentHistoryForRukn(ruknId).filter(
    (record) => record.status === 'Replaced' || record.status === 'Unassigned',
  ).length

  return {
    assignedCount,
    completedCount,
    availableCapacity: getAvailableKarkunan().length,
  }
}

export function getAllRuknAssignmentEngineStats() {
  const stats: Record<string, ReturnType<typeof getRuknAssignmentEngineStats>> = {}
  for (const record of getAllAssignments()) {
    if (record.status === 'Active' && !stats[record.ruknId]) {
      stats[record.ruknId] = getRuknAssignmentEngineStats(record.ruknId)
    }
  }
  return stats
}

export function getAssignmentHistory(): AssignmentRecord[] {
  return getAllAssignments()
}

export function assignKarkun(
  karkunId: string,
  ruknId: string,
  assignedBy: AssignedBy,
): AssignKarkunResult {
  return assignRukn({
    ruknId,
    karkunId,
    effectiveFrom: todayDate(),
    assignedBy,
  })
}

function mapReleaseToRemoval(reason: ReleaseReason): RemovalReason {
  if (reason === 'Shifted Area') return 'Shifted Area'
  if (reason === 'Wrong Assignment') return 'Wrong Assignment'
  if (reason === 'Not Available') return 'Not Available'
  if (reason === 'Personal Reason') return 'Personal Reason'
  return 'Other'
}

function mapReleaseToReplacement(reason: ReleaseReason): ReplacementReason {
  if (reason === 'Shifted Area') return 'Shifted responsibility'
  if (reason === 'Already Covered') return 'Already Covered'
  if (reason === 'Wrong Assignment') return 'Wrong Assignment'
  if (reason === 'Not Available') return 'Not Available'
  if (reason === 'Personal Reason') return 'Personal Reason'
  return 'Other'
}

export function releaseKarkun(
  karkunId: string,
  ruknId: string,
  releaseReason: ReleaseReason,
): AssignKarkunResult {
  return removeAssignment({
    ruknId,
    karkunId,
    effectiveFrom: todayDate(),
    removalReason: mapReleaseToRemoval(releaseReason),
    assignedBy: 'Rukn',
  })
}

export function replaceKarkun(
  currentKarkunId: string,
  newKarkunId: string,
  ruknId: string,
  releaseReason: ReleaseReason,
  assignedBy: AssignedBy,
): AssignKarkunResult {
  return replaceAssignment({
    ruknId,
    currentKarkunId,
    newKarkunId,
    effectiveFrom: todayDate(),
    replacementReason: mapReleaseToReplacement(releaseReason),
    assignedBy,
  })
}

export function adminUnassignKarkun(
  karkunId: string,
  options?: {
    removalReason?: RemovalReason
    remarks?: string
    effectiveFrom?: string
  },
): AssignKarkunResult {
  const active = getAllAssignments().find(
    (record) => record.karkunId === karkunId && record.status === 'Active',
  )
  if (!active) {
    return { success: false, error: 'Karkun is not currently assigned.' }
  }
  return removeAssignment({
    ruknId: active.ruknId,
    karkunId,
    effectiveFrom: options?.effectiveFrom ?? todayDate(),
    removalReason: options?.removalReason ?? 'Other',
    remarks: options?.remarks,
    assignedBy: 'Administrator',
  })
}

export function changeKarkunRuknAssignment(
  karkunId: string,
  selectedRuknId: string,
  assignedBy: AssignedBy = 'Administrator',
  options?: {
    removalReason?: RemovalReason
    remarks?: string
    effectiveFrom?: string
  },
): AssignKarkunResult {
  const current = getCurrentAssignmentForKarkun(karkunId)
  const targetRuknId = selectedRuknId.trim()

  if (!targetRuknId) {
    if (!current) {
      return { success: true } as AssignmentResult
    }
    return adminUnassignKarkun(karkunId, options)
  }

  if (current?.ruknId === targetRuknId) {
    return { success: true, assignment: current }
  }

  if (!current) {
    return assignKarkun(karkunId, targetRuknId, assignedBy)
  }

  // Transferring a Karkun to a Rukn that already has other active Karkuns is allowed:
  // the target Rukn is no longer blocked. Only this Karkun's current assignment moves.
  const effectiveFrom = options?.effectiveFrom ?? todayDate()
  const transferChecks = [
    validateEffectiveDate(effectiveFrom),
    validateRuknActive(targetRuknId),
    validateKarkunActive(karkunId),
    validateKarkunMobile(karkunId),
    validateGenderMatch(targetRuknId, karkunId),
  ]

  for (const check of transferChecks) {
    if (!check.valid) {
      return { success: false, error: check.error }
    }
  }

  const removeResult = removeAssignment({
    ruknId: current.ruknId,
    karkunId,
    effectiveFrom,
    removalReason: options?.removalReason ?? 'Transferred',
    remarks: options?.remarks
      ? `Previous Rukn: ${current.ruknId}. ${options.remarks}`
      : `Previous Rukn: ${current.ruknId}`,
    assignedBy,
  })
  if (!removeResult.success) {
    return removeResult
  }

  return assignKarkun(karkunId, targetRuknId, assignedBy)
}

export function bulkAssignKarkuns(
  karkunIds: string[],
  ruknId: string,
  assignedBy: AssignedBy,
): { success: number; failed: { id: string; error: string }[] } {
  const failed: { id: string; error: string }[] = []
  let success = 0

  for (const karkunId of karkunIds) {
    const result = assignKarkun(karkunId, ruknId, assignedBy)
    if (result.success) {
      success++
    } else {
      failed.push({ id: karkunId, error: result.error ?? 'Connection failed.' })
    }
  }

  return { success, failed }
}

export function getCompletedAssignmentHistoryForKarkun(karkunId: string) {
  return getAssignmentHistoryForKarkun(karkunId).filter(
    (record) => record.status === 'Completed' || record.status === 'Replaced',
  )
}

export function getCurrentAssignmentForKarkun(karkunId: string) {
  return getAllAssignments().find(
    (record) => record.karkunId === karkunId && record.status === 'Active',
  )
}

export function getCompletedAssignmentHistoryForRukn(ruknId: string) {
  return getAssignmentHistoryForRukn(ruknId).filter((record) => record.status !== 'Active')
}

export function canAssignKarkun(karkunId: string): boolean {
  const karkun = getKarkunById(karkunId)
  return Boolean(
    karkun &&
      !karkun.isArchived &&
      karkun.status === 'active' &&
      karkun.assignmentStatus === 'Available' &&
      getActiveAssignmentsForKarkun(karkunId).length === 0 &&
      karkun.mobile.trim() &&
      isValidMobileFormat(normalizeMobile(karkun.mobile)),
  )
}

export {
  assignRukn,
  replaceAssignment,
  removeAssignment,
  restoreAssignment,
  getAssignmentHistoryForRukn,
  getAssignmentHistoryForKarkun,
} from '@/services/assignmentService'

export { getRuknById }
