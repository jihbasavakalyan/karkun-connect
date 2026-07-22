/**
 * KC-0076 — Administrator registry review, safe archive, and controlled delete.
 * Soft-archive only (existing preservation model). No repository / schema changes.
 */

import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { logPeopleAudit } from '@/lib/peopleAuditLog'
import { bumpVersion } from '@/lib/preservation/softDelete'
import { notifyPeopleRegistryUiOnly } from '@/lib/peopleStore'
import { archiveKarkun } from '@/services/archiveService'
import { getSubmittedMeetingForms } from '@/stores/annexure1Store'
import {
  getActiveAssignmentsForKarkun,
  getAssignmentHistoryForKarkun,
} from '@/stores/assignmentStore'
import type { KarkunRegistryRecord, KarkunReviewReason } from '@/types/karkun-registry.types'

export type RegistryMaintenanceResult = {
  success: boolean
  error?: string
  blockers?: string[]
}

function nowIso(): string {
  return new Date().toISOString()
}

function findKarkun(id: string): KarkunRegistryRecord | undefined {
  return MOCK_KARKUN_REGISTRY.find((k) => k.id === id)
}

function hasActiveConnection(karkun: KarkunRegistryRecord): boolean {
  if (karkun.assignmentStatus === 'Assigned') return true
  if (karkun.assignedRuknId?.trim()) return true
  return getActiveAssignmentsForKarkun(karkun.id).length > 0
}

function hasCampaignHistory(karkunId: string): boolean {
  const karkun = findKarkun(karkunId)
  if (karkun?.lastVisit) return true
  if (getSubmittedMeetingForms().some((form) => form.karkunId === karkunId)) return true
  if (getAssignmentHistoryForKarkun(karkunId).length > 0) return true
  return false
}

/** Blockers for soft-archive (Feature 3). */
export function getKarkunArchiveBlockers(karkunId: string): string[] {
  const karkun = findKarkun(karkunId)
  if (!karkun) return ['Karkun not found.']
  if (karkun.isArchived) return ['Karkun is already archived.']

  const blockers: string[] = []
  if (getActiveAssignmentsForKarkun(karkunId).length > 0) {
    blockers.push('This Karkun has an active assignment. Disconnect first.')
  } else if (hasActiveConnection(karkun)) {
    blockers.push('This Karkun has an active connection to a Rukn. Disconnect first.')
  }
  return blockers
}

/** Blockers for controlled delete (Feature 4). */
export function getKarkunDeleteBlockers(karkunId: string): string[] {
  const karkun = findKarkun(karkunId)
  if (!karkun) return ['Karkun not found.']
  if (karkun.isArchived && karkun.archiveKind === 'admin_delete') {
    return ['This Karkun is already removed from the registry.']
  }

  const blockers: string[] = []
  if (getActiveAssignmentsForKarkun(karkunId).length > 0) {
    blockers.push('This Karkun has an active assignment.')
  } else if (hasActiveConnection(karkun)) {
    blockers.push('This Karkun has an active connection.')
  }
  if (hasCampaignHistory(karkunId)) {
    blockers.push('This Karkun has campaign / visit history and cannot be deleted.')
  }
  return blockers
}

export function flagKarkunForReview(
  karkunId: string,
  reason: KarkunReviewReason,
  notes: string,
  updatedBy = 'Administrator',
): RegistryMaintenanceResult {
  const karkun = findKarkun(karkunId)
  if (!karkun) return { success: false, error: 'Karkun not found.' }
  if (karkun.isArchived) {
    return { success: false, error: 'Cannot flag an archived Karkun for review.' }
  }

  karkun.needsReview = true
  karkun.reviewReason = reason
  karkun.reviewNotes = notes.trim() || undefined
  karkun.reviewedBy = updatedBy
  karkun.reviewedAt = nowIso()
  karkun.updatedAt = nowIso()
  karkun.updatedBy = updatedBy
  karkun.version = bumpVersion(karkun.version)

  logPeopleAudit({
    personKind: 'karkun',
    personId: karkunId,
    personName: karkun.name,
    action: 'review_flag',
    field: 'reviewReason',
    newValue: reason,
    updatedBy,
  })

  notifyPeopleRegistryUiOnly()
  return { success: true }
}

export function updateKarkunReviewNotes(
  karkunId: string,
  notes: string,
  updatedBy = 'Administrator',
): RegistryMaintenanceResult {
  const karkun = findKarkun(karkunId)
  if (!karkun) return { success: false, error: 'Karkun not found.' }
  if (!karkun.needsReview) {
    return { success: false, error: 'Karkun is not marked for review.' }
  }

  const trimmed = notes.trim()
  karkun.reviewNotes = trimmed || undefined
  karkun.reviewedBy = updatedBy
  karkun.reviewedAt = nowIso()
  karkun.updatedAt = nowIso()
  karkun.updatedBy = updatedBy
  karkun.version = bumpVersion(karkun.version)

  logPeopleAudit({
    personKind: 'karkun',
    personId: karkunId,
    personName: karkun.name,
    action: 'review_notes',
    field: 'reviewNotes',
    newValue: trimmed || '(cleared)',
    updatedBy,
  })

  notifyPeopleRegistryUiOnly()
  return { success: true }
}

export function clearKarkunReview(
  karkunId: string,
  updatedBy = 'Administrator',
): RegistryMaintenanceResult {
  const karkun = findKarkun(karkunId)
  if (!karkun) return { success: false, error: 'Karkun not found.' }
  if (!karkun.needsReview) {
    return { success: false, error: 'Karkun is not marked for review.' }
  }

  karkun.needsReview = false
  karkun.reviewReason = undefined
  karkun.reviewNotes = undefined
  karkun.reviewedBy = updatedBy
  karkun.reviewedAt = nowIso()
  karkun.updatedAt = nowIso()
  karkun.updatedBy = updatedBy
  karkun.version = bumpVersion(karkun.version)

  logPeopleAudit({
    personKind: 'karkun',
    personId: karkunId,
    personName: karkun.name,
    action: 'review_clear',
    updatedBy,
  })

  notifyPeopleRegistryUiOnly()
  return { success: true }
}

/**
 * Soft-archive with connection/assignment validation.
 * Reuses archiveKarkun(); caller must await persistKarkunDurable.
 */
export function archiveKarkunSafely(
  karkunId: string,
  archivedBy = 'Administrator',
): RegistryMaintenanceResult {
  const blockers = getKarkunArchiveBlockers(karkunId)
  if (blockers.length > 0) {
    return {
      success: false,
      error: blockers.join(' '),
      blockers,
    }
  }

  const result = archiveKarkun(karkunId, archivedBy)
  if (!result.ok) {
    return { success: false, error: result.error }
  }

  const karkun = findKarkun(karkunId)
  if (karkun) {
    karkun.archiveKind = karkun.archiveKind ?? 'standard'
    karkun.needsReview = false
  }

  logPeopleAudit({
    personKind: 'karkun',
    personId: karkunId,
    personName: karkun?.name ?? karkunId,
    action: 'archive',
    field: 'archivedAt',
    newValue: karkun?.archivedAt,
    updatedBy: archivedBy,
  })

  return { success: true }
}

/**
 * Controlled delete — irreversible soft-archive (admin_delete).
 * True Firestore document removal requires a repository API (not in scope).
 * Caller must await persistKarkunDurable.
 */
export function deleteKarkunSafely(
  karkunId: string,
  deleteReason: string,
  deletedBy = 'Administrator',
): RegistryMaintenanceResult {
  const reason = deleteReason.trim()
  if (!reason) {
    return { success: false, error: 'Delete reason is required.' }
  }

  const blockers = getKarkunDeleteBlockers(karkunId)
  if (blockers.length > 0) {
    return {
      success: false,
      error: blockers.join(' '),
      blockers,
    }
  }

  const karkun = findKarkun(karkunId)
  if (!karkun) return { success: false, error: 'Karkun not found.' }

  if (!karkun.isArchived) {
    const archived = archiveKarkun(karkunId, deletedBy)
    if (!archived.ok) {
      return { success: false, error: archived.error }
    }
  }

  const refreshed = findKarkun(karkunId)
  if (!refreshed) return { success: false, error: 'Karkun not found after archive.' }

  refreshed.archiveKind = 'admin_delete'
  refreshed.deleteReason = reason
  refreshed.needsReview = false
  refreshed.reviewReason = undefined
  refreshed.reviewNotes = undefined
  refreshed.updatedAt = nowIso()
  refreshed.updatedBy = deletedBy
  refreshed.version = bumpVersion(refreshed.version)

  logPeopleAudit({
    personKind: 'karkun',
    personId: karkunId,
    personName: refreshed.name,
    action: 'delete',
    field: 'deleteReason',
    newValue: reason,
    updatedBy: deletedBy,
  })

  notifyPeopleRegistryUiOnly()
  return { success: true }
}
