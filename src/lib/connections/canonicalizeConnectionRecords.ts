/**
 * KC-002 / KC-028A — Canonical connection record integrity.
 *
 * Identity is assignmentId only. Duplicate assignmentNumbers must never discard
 * valid connections (KC-001 / KC-002). ASN collisions are reported separately
 * via findAssignmentNumberCollisions / repair planning.
 */

import type { AssignmentRecord, AssignmentStatus } from '@/types/assignment'
import { findAssignmentNumberCollisions } from '@/lib/connections/assignmentNumber'

export type ConnectionDuplicateReport = {
  kind: 'assignmentId'
  key: string
  keptAssignmentId: string
  droppedAssignmentId: string
  keptStatus: AssignmentStatus
  droppedStatus: AssignmentStatus
}

const STATUS_RANK: Record<AssignmentStatus, number> = {
  Active: 50,
  Suspended: 40,
  Completed: 30,
  Replaced: 20,
  Unassigned: 10,
}

function preferRecord(a: AssignmentRecord, b: AssignmentRecord): AssignmentRecord {
  const rankDiff = (STATUS_RANK[a.status] ?? 0) - (STATUS_RANK[b.status] ?? 0)
  if (rankDiff !== 0) return rankDiff > 0 ? a : b
  const timeA = Date.parse(a.updatedAt || a.effectiveFrom || '') || 0
  const timeB = Date.parse(b.updatedAt || b.effectiveFrom || '') || 0
  if (timeA !== timeB) return timeA >= timeB ? a : b
  return a.assignmentId.localeCompare(b.assignmentId) <= 0 ? a : b
}

export function canonicalizeConnectionRecords(records: AssignmentRecord[]): {
  records: AssignmentRecord[]
  duplicates: ConnectionDuplicateReport[]
} {
  const duplicates: ConnectionDuplicateReport[] = []
  const byId = new Map<string, AssignmentRecord>()

  for (const record of records) {
    const id = record.assignmentId?.trim()
    if (!id) continue
    const existing = byId.get(id)
    if (!existing) {
      byId.set(id, record)
      continue
    }
    const kept = preferRecord(existing, record)
    const dropped = kept === existing ? record : existing
    duplicates.push({
      kind: 'assignmentId',
      key: id,
      keptAssignmentId: kept.assignmentId,
      droppedAssignmentId: dropped.assignmentId,
      keptStatus: kept.status,
      droppedStatus: dropped.status,
    })
    byId.set(id, kept)
  }

  const canonical = [...byId.values()].sort((a, b) =>
    (b.effectiveFrom || '').localeCompare(a.effectiveFrom || ''),
  )

  return { records: canonical, duplicates }
}

/** Identity duplicates only (assignmentId). ASN collisions are not identity failures. */
export function assertNoConnectionDuplicates(records: AssignmentRecord[]): void {
  const { duplicates } = canonicalizeConnectionRecords(records)
  if (duplicates.length === 0) return
  const detail = duplicates
    .map(
      (item) =>
        `${item.kind}=${item.key} kept=${item.keptAssignmentId} dropped=${item.droppedAssignmentId}`,
    )
    .join('; ')
  throw new Error(`Connection duplicates detected: ${detail}`)
}

/** Observability helper — does not mutate or drop records. */
export function reportAssignmentNumberCollisions(records: AssignmentRecord[]): ReturnType<
  typeof findAssignmentNumberCollisions
> {
  return findAssignmentNumberCollisions(records)
}
