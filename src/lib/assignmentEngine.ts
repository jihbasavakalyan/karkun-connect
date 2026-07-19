import { getKarkunById, MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import {
  getCanonicalConnectedKarkunCount,
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
  transferAssignment,
} from '@/services/assignmentService'
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
  const assignedKarkun = getCanonicalConnectedKarkunCount()
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

export async function assignKarkun(
  karkunId: string,
  ruknId: string,
  assignedBy: AssignedBy,
): Promise<AssignKarkunResult> {
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

export async function replaceKarkun(
  currentKarkunId: string,
  newKarkunId: string,
  ruknId: string,
  releaseReason: ReleaseReason,
  assignedBy: AssignedBy,
): Promise<AssignKarkunResult> {
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

/**
 * Change a Karkun's Rukn connection.
 *
 * KC-0055 — When Transfer UI passes `options` and an Active connection exists,
 * ownership is updated in place (same assignmentId + ASN). No ASN allocation.
 * Registry/profile callers without options still treat same-Rukn as idempotent.
 */
export async function changeKarkunRuknAssignment(
  karkunId: string,
  selectedRuknId: string,
  assignedBy: AssignedBy = 'Administrator',
  options?: {
    removalReason?: RemovalReason
    remarks?: string
    effectiveFrom?: string
  },
): Promise<AssignKarkunResult> {
  const current = getCurrentAssignmentForKarkun(karkunId)
  const targetRuknId = selectedRuknId.trim()

  if (!targetRuknId) {
    if (!current) {
      return { success: true } as AssignmentResult
    }
    return adminUnassignKarkun(karkunId, options)
  }

  // KC-0052: Transfer UI always passes options. Same-Rukn must fail visibly (not silent no-op success).
  // Registry/profile callers omit options and treat same-Rukn as an idempotent no-op.
  if (current?.ruknId === targetRuknId) {
    if (options) {
      return {
        success: false,
        error: 'Select a different Rukn. Transfer to the same Rukn has no effect.',
      }
    }
    return { success: true, assignment: current }
  }

  if (!current) {
    return assignKarkun(karkunId, targetRuknId, assignedBy)
  }

  // KC-0055 — in-place ownership update (same assignmentId + ASN). No ASN allocation.
  return transferAssignment({
    karkunId,
    targetRuknId,
    effectiveFrom: options?.effectiveFrom ?? todayDate(),
    assignedBy,
    removalReason: options?.removalReason ?? 'Transferred',
    remarks: options?.remarks,
  })
}

export async function bulkAssignKarkuns(
  karkunIds: string[],
  ruknId: string,
  assignedBy: AssignedBy,
): Promise<{ success: number; failed: { id: string; error: string }[] }> {
  const failed: { id: string; error: string }[] = []
  let success = 0

  for (const karkunId of karkunIds) {
    const result = await assignKarkun(karkunId, ruknId, assignedBy)
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
  transferAssignment,
  getAssignmentHistoryForRukn,
  getAssignmentHistoryForKarkun,
} from '@/services/assignmentService'

export { getRuknById }
