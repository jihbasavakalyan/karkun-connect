/**
 * KC-003 — One Active connection per Karkun (campaign-wide).
 *
 * Historical rows are preserved: older duplicate Active records become Replaced.
 * Does not delete documents.
 */

import type { AssignmentRecord } from '@/types/assignment'

export const ACTIVE_INTEGRITY_VERSION = 1

export type ActiveIntegrityChange = {
  assignmentId: string
  assignmentNumber: string
  karkunId: string
  ruknId: string
  previousStatus: 'Active'
  nextStatus: 'Replaced'
  keptAssignmentId: string
  keptAssignmentNumber: string
  reason: 'duplicate_active_karkun'
}

export type ActiveIntegrityReport = {
  scanned: number
  activeBefore: number
  groupsRepaired: number
  superseded: number
  changes: ActiveIntegrityChange[]
}

/** Prefer the newest Active record as the survivor. */
export function preferNewestActive(a: AssignmentRecord, b: AssignmentRecord): AssignmentRecord {
  const createdA = Date.parse(a.createdAt || a.effectiveFrom || '') || 0
  const createdB = Date.parse(b.createdAt || b.effectiveFrom || '') || 0
  if (createdA !== createdB) return createdA >= createdB ? a : b
  const updatedA = Date.parse(a.updatedAt || '') || 0
  const updatedB = Date.parse(b.updatedAt || '') || 0
  if (updatedA !== updatedB) return updatedA >= updatedB ? a : b
  return a.assignmentId.localeCompare(b.assignmentId) >= 0 ? a : b
}

function supersedeDuplicate(
  record: AssignmentRecord,
  kept: AssignmentRecord,
): AssignmentRecord {
  const endedAt = new Date().toISOString()
  return {
    ...record,
    status: 'Replaced',
    replacementReason: 'Other',
    removalReason: 'Duplicate',
    remarks: record.remarks?.trim()
      ? `${record.remarks} | KC-003: superseded duplicate Active (kept ${kept.assignmentNumber})`
      : `KC-003: superseded duplicate Active (kept ${kept.assignmentNumber})`,
    endedDate: endedAt.slice(0, 10),
    updatedAt: endedAt,
  }
}

/**
 * Plan Active integrity repair. Keeps newest Active per karkunId; marks others Replaced.
 * Does not mutate inputs.
 */
export function planActiveConnectionIntegrity(records: readonly AssignmentRecord[]): {
  records: AssignmentRecord[]
  report: ActiveIntegrityReport
  needsWrite: boolean
} {
  const working = records.map((record) => ({ ...record }))
  const activeByKarkun = new Map<string, AssignmentRecord[]>()

  for (const record of working) {
    if (record.status !== 'Active') continue
    const key = record.karkunId?.trim()
    if (!key) continue
    const group = activeByKarkun.get(key) ?? []
    group.push(record)
    activeByKarkun.set(key, group)
  }

  const changes: ActiveIntegrityChange[] = []
  let groupsRepaired = 0

  for (const [, group] of activeByKarkun) {
    if (group.length < 2) continue
    groupsRepaired += 1
    let keeper = group[0]!
    for (let i = 1; i < group.length; i += 1) {
      keeper = preferNewestActive(keeper, group[i]!)
    }
    for (const record of group) {
      if (record.assignmentId === keeper.assignmentId) continue
      const previousNumber = record.assignmentNumber
      Object.assign(record, supersedeDuplicate(record, keeper))
      changes.push({
        assignmentId: record.assignmentId,
        assignmentNumber: previousNumber,
        karkunId: record.karkunId,
        ruknId: record.ruknId,
        previousStatus: 'Active',
        nextStatus: 'Replaced',
        keptAssignmentId: keeper.assignmentId,
        keptAssignmentNumber: keeper.assignmentNumber,
        reason: 'duplicate_active_karkun',
      })
    }
  }

  const report: ActiveIntegrityReport = {
    scanned: records.length,
    activeBefore: [...activeByKarkun.values()].reduce((sum, group) => sum + group.length, 0),
    groupsRepaired,
    superseded: changes.length,
    changes,
  }

  return {
    records: working,
    report,
    needsWrite: changes.length > 0,
  }
}

export function assertAtMostOneActivePerKarkun(records: readonly AssignmentRecord[]): void {
  const activeByKarkun = new Map<string, string[]>()
  for (const record of records) {
    if (record.status !== 'Active') continue
    const key = record.karkunId?.trim()
    if (!key) continue
    const list = activeByKarkun.get(key) ?? []
    list.push(record.assignmentId)
    activeByKarkun.set(key, list)
  }
  const offenders = [...activeByKarkun.entries()].filter(([, ids]) => ids.length > 1)
  if (offenders.length === 0) return
  const detail = offenders
    .map(([karkunId, ids]) => `${karkunId}=[${ids.join(',')}]`)
    .join('; ')
  throw new Error(`Multiple Active connections for Karkun: ${detail}`)
}
