/**
 * KC-0058 — Soft-archive / restore for operational entities.
 * Does not hard-delete. No UI — service foundation only.
 */

import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { getRuknById, ruknMaster } from '@/data/ruknMaster'
import { buildArchivePatch, buildRestorePatch, bumpVersion } from '@/lib/preservation/softDelete'
import { notifyPeopleRegistryChange } from '@/lib/peopleStore'
import { appendConnectionLedgerEntry } from '@/services/connectionLedgerService'
import { logActivity } from '@/stores/activityLogStore'
import { getAssignmentById, patchAssignmentRecord } from '@/stores/assignmentStore'
import { getKarkunRequestById, updateKarkunRequest } from '@/stores/karkunRequestStore'
import type { ArchiveResult } from '@/types/preservation.types'

function nowIso(): string {
  return new Date().toISOString()
}

export function archiveKarkun(karkunId: string, archivedBy = 'Administrator'): ArchiveResult {
  const karkun = MOCK_KARKUN_REGISTRY.find((k) => k.id === karkunId)
  if (!karkun) return { ok: false, error: 'Karkun not found.' }
  if (karkun.isArchived) return { ok: false, error: 'Karkun is already archived.' }

  const patch = buildArchivePatch(archivedBy)
  Object.assign(karkun, patch, {
    updatedAt: nowIso(),
    updatedBy: archivedBy,
    version: bumpVersion(karkun.version),
  })
  notifyPeopleRegistryChange()

  appendConnectionLedgerEntry({
    eventType: 'ARCHIVED',
    performedBy: archivedBy,
    karkunId,
    metadata: { entity: 'karkun' },
  })
  logActivity({
    type: 'complete',
    message: `Archived Karkun ${karkun.name} (${karkunId}).`,
    karkunId,
    actor: archivedBy,
  })

  return { ok: true, id: karkunId, kind: 'karkun' }
}

export function unarchiveKarkun(karkunId: string, restoredBy = 'Administrator'): ArchiveResult {
  const karkun = MOCK_KARKUN_REGISTRY.find((k) => k.id === karkunId)
  if (!karkun) return { ok: false, error: 'Karkun not found.' }
  if (!karkun.isArchived) return { ok: false, error: 'Karkun is not archived.' }

  const patch = buildRestorePatch(restoredBy)
  Object.assign(karkun, patch, {
    updatedAt: nowIso(),
    updatedBy: restoredBy,
    version: bumpVersion(karkun.version),
  })
  notifyPeopleRegistryChange()

  appendConnectionLedgerEntry({
    eventType: 'UNARCHIVED',
    performedBy: restoredBy,
    karkunId,
    metadata: { entity: 'karkun' },
  })
  logActivity({
    type: 'restore',
    message: `Restored Karkun ${karkun.name} (${karkunId}) from archive.`,
    karkunId,
    actor: restoredBy,
  })

  return { ok: true, id: karkunId, kind: 'karkun' }
}

export function archiveRukn(ruknId: string, archivedBy = 'Administrator'): ArchiveResult {
  const rukn = getRuknById(ruknId)
  if (!rukn) return { ok: false, error: 'Rukn not found.' }
  if (rukn.isArchived) return { ok: false, error: 'Rukn is already archived.' }

  const patch = buildArchivePatch(archivedBy)
  Object.assign(rukn, patch, {
    status: 'inactive',
    updatedAt: nowIso(),
    updatedBy: archivedBy,
    version: bumpVersion(rukn.version),
  })
  // Persist via people registry path (rukn master save).
  notifyPeopleRegistryChange()

  logActivity({
    type: 'complete',
    message: `Archived Rukn ${rukn.name} (${ruknId}).`,
    ruknId,
    actor: archivedBy,
  })

  return { ok: true, id: ruknId, kind: 'rukn' }
}

export function unarchiveRukn(ruknId: string, restoredBy = 'Administrator'): ArchiveResult {
  const rukn = getRuknById(ruknId)
  if (!rukn) return { ok: false, error: 'Rukn not found.' }
  if (!rukn.isArchived) return { ok: false, error: 'Rukn is not archived.' }

  const patch = buildRestorePatch(restoredBy)
  Object.assign(rukn, patch, {
    status: 'active',
    updatedAt: nowIso(),
    updatedBy: restoredBy,
    version: bumpVersion(rukn.version),
  })
  notifyPeopleRegistryChange()

  logActivity({
    type: 'restore',
    message: `Restored Rukn ${rukn.name} (${ruknId}) from archive.`,
    ruknId,
    actor: restoredBy,
  })

  return { ok: true, id: ruknId, kind: 'rukn' }
}

export function archiveAssignment(
  assignmentId: string,
  archivedBy = 'Administrator',
): ArchiveResult {
  const assignment = getAssignmentById(assignmentId)
  if (!assignment) return { ok: false, error: 'Assignment not found.' }
  if (assignment.isArchived) return { ok: false, error: 'Assignment is already archived.' }
  if (assignment.status === 'Active') {
    return {
      ok: false,
      error: 'Cannot archive an Active assignment. Disconnect/remove it first, then archive.',
    }
  }

  const patch = buildArchivePatch(archivedBy)
  const updated = patchAssignmentRecord(assignmentId, {
    ...patch,
    updatedAt: nowIso(),
    version: bumpVersion(assignment.version),
  })
  if (!updated) return { ok: false, error: 'Could not archive assignment.' }

  appendConnectionLedgerEntry({
    eventType: 'ARCHIVED',
    performedBy: archivedBy,
    assignmentId,
    connectionId: assignmentId,
    ruknId: assignment.ruknId,
    karkunId: assignment.karkunId,
    metadata: { entity: 'assignment', priorStatus: assignment.status },
  })
  logActivity({
    type: 'complete',
    message: `Archived assignment ${assignmentId}.`,
    assignmentId,
    ruknId: assignment.ruknId,
    karkunId: assignment.karkunId,
    actor: archivedBy,
  })

  return { ok: true, id: assignmentId, kind: 'assignment' }
}

export function archiveKarkunRequest(
  requestId: string,
  archivedBy = 'Administrator',
): ArchiveResult {
  const request = getKarkunRequestById(requestId)
  if (!request) return { ok: false, error: 'Request not found.' }
  if (request.isArchived) return { ok: false, error: 'Request is already archived.' }

  const patch = buildArchivePatch(archivedBy)
  const updated = updateKarkunRequest(requestId, {
    ...patch,
    version: bumpVersion(request.version),
  })
  if (!updated) return { ok: false, error: 'Could not archive request.' }

  logActivity({
    type: 'complete',
    message: `Archived Karkun request for ${request.fullName}.`,
    ruknId: request.requestingRuknId,
    actor: archivedBy,
  })

  return { ok: true, id: requestId, kind: 'request' }
}

/** Count of non-archived rukns (helper for scanners / tests). */
export function countActiveRukns(): number {
  return ruknMaster.filter((r) => !r.isArchived && r.status === 'active').length
}
