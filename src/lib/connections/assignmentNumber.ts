/**
 * KC-002 — Assignment number formatting, collision detection, and repair planning.
 * Identity of a connection is assignmentId. assignmentNumber is a display sequence.
 */

import type { AssignmentRecord } from '@/types/assignment'

export const ASN_PREFIX = 'ASN-'
export const ASN_REPAIR_VERSION = 1

export type AssignmentNumberCollision = {
  assignmentNumber: string
  assignmentIds: string[]
}

export type AsnRepairChange = {
  assignmentId: string
  previousAssignmentNumber: string
  nextAssignmentNumber: string
  reason: 'duplicate_reassigned'
}

export type AsnRepairReport = {
  scanned: number
  collisionGroups: number
  reassigned: number
  unchanged: number
  nextSequence: number
  changes: AsnRepairChange[]
  collisionsBefore: AssignmentNumberCollision[]
}

export function formatAssignmentNumber(sequence: number): string {
  if (!Number.isFinite(sequence) || sequence < 1) {
    throw new Error(`Invalid assignment sequence: ${sequence}`)
  }
  return `${ASN_PREFIX}${String(Math.trunc(sequence)).padStart(6, '0')}`
}

export function parseAssignmentNumber(assignmentNumber: string): number | null {
  const match = assignmentNumber?.trim().match(/^ASN-(\d+)$/i)
  if (!match) return null
  const value = Number.parseInt(match[1], 10)
  return Number.isFinite(value) ? value : null
}

export function deriveNextSequenceFromRecords(records: readonly AssignmentRecord[]): number {
  let max = 0
  for (const record of records) {
    const value = parseAssignmentNumber(record.assignmentNumber)
    if (value !== null) {
      max = Math.max(max, value)
    }
  }
  return max + 1
}

export function findAssignmentNumberCollisions(
  records: readonly AssignmentRecord[],
): AssignmentNumberCollision[] {
  const byNumber = new Map<string, string[]>()
  for (const record of records) {
    const number = record.assignmentNumber?.trim().toUpperCase()
    if (!number) continue
    const list = byNumber.get(number) ?? []
    list.push(record.assignmentId)
    byNumber.set(number, list)
  }
  return [...byNumber.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([assignmentNumber, assignmentIds]) => ({ assignmentNumber, assignmentIds }))
    .sort((a, b) => a.assignmentNumber.localeCompare(b.assignmentNumber))
}

/** Prefer the earliest created record as the original ASN holder. */
function preferOriginalAsnHolder(a: AssignmentRecord, b: AssignmentRecord): AssignmentRecord {
  const timeA = Date.parse(a.createdAt || a.effectiveFrom || '') || 0
  const timeB = Date.parse(b.createdAt || b.effectiveFrom || '') || 0
  if (timeA !== timeB) return timeA <= timeB ? a : b
  return a.assignmentId.localeCompare(b.assignmentId) <= 0 ? a : b
}

/**
 * Plan a one-time repair: keep the earliest record's ASN in each collision group;
 * assign new monotonic ASNs to the rest. Does not mutate inputs.
 */
export function planAsnCollisionRepair(
  records: readonly AssignmentRecord[],
  minimumNextSequence = 1,
): { records: AssignmentRecord[]; report: AsnRepairReport } {
  const collisionsBefore = findAssignmentNumberCollisions(records)
  const working = records.map((record) => ({ ...record }))
  const byNumber = new Map<string, AssignmentRecord[]>()

  for (const record of working) {
    const number = record.assignmentNumber?.trim().toUpperCase()
    if (!number) continue
    const group = byNumber.get(number) ?? []
    group.push(record)
    byNumber.set(number, group)
  }

  let nextSequence = Math.max(minimumNextSequence, deriveNextSequenceFromRecords(working))
  const changes: AsnRepairChange[] = []

  for (const group of byNumber.values()) {
    if (group.length < 2) continue
    let keeper = group[0]!
    for (let i = 1; i < group.length; i += 1) {
      keeper = preferOriginalAsnHolder(keeper, group[i]!)
    }
    for (const record of group) {
      if (record.assignmentId === keeper.assignmentId) continue
      const previous = record.assignmentNumber
      const next = formatAssignmentNumber(nextSequence)
      nextSequence += 1
      record.assignmentNumber = next
      record.updatedAt = new Date().toISOString()
      changes.push({
        assignmentId: record.assignmentId,
        previousAssignmentNumber: previous,
        nextAssignmentNumber: next,
        reason: 'duplicate_reassigned',
      })
    }
  }

  const report: AsnRepairReport = {
    scanned: records.length,
    collisionGroups: collisionsBefore.length,
    reassigned: changes.length,
    unchanged: records.length - changes.length,
    nextSequence,
    changes,
    collisionsBefore,
  }

  return { records: working, report }
}

export function assertUniqueAssignmentNumbers(records: readonly AssignmentRecord[]): void {
  const collisions = findAssignmentNumberCollisions(records)
  if (collisions.length === 0) return
  const detail = collisions
    .map((item) => `${item.assignmentNumber}=[${item.assignmentIds.join(',')}]`)
    .join('; ')
  throw new Error(`Duplicate assignment numbers detected: ${detail}`)
}
