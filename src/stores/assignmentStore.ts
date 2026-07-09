import type { AssignmentRecord, AssignmentStatus } from '@/types/assignment'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'

function deriveNextSequenceFromRecords(records: AssignmentRecord[]): number {
  let max = 0
  for (const record of records) {
    const match = record.assignmentNumber.match(/ASN-(\d+)/i)
    if (match) {
      max = Math.max(max, Number.parseInt(match[1], 10))
    }
  }
  return max + 1
}

function loadPersistedAssignmentState(): {
  assignments: AssignmentRecord[]
  nextSequence: number
} {
  return unwrapRepository(
    getRepositories().connection.loadState(),
    { assignments: [], nextSequence: 1 },
  )
}

function persistAssignmentState(records: AssignmentRecord[], nextSequence: number): void {
  getRepositories().connection.saveState({ assignments: records, nextSequence })
}

const persisted = loadPersistedAssignmentState()
const assignments: AssignmentRecord[] = [...persisted.assignments]
let nextAssignmentSequence = persisted.nextSequence

type AssignmentStoreListener = () => void
const listeners = new Set<AssignmentStoreListener>()

export function subscribeToAssignmentStore(listener: AssignmentStoreListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyAssignmentStoreChange(): void {
  listeners.forEach((listener) => listener())
}

function saveAssignments(): void {
  persistAssignmentState(assignments, nextAssignmentSequence)
}

/** Re-read assignments from repository (simulates page reload). */
export function reloadAssignmentStoreFromPersistence(): void {
  const loaded = loadPersistedAssignmentState()
  assignments.length = 0
  assignments.push(...loaded.assignments)
  nextAssignmentSequence = loaded.nextSequence
  notifyAssignmentStoreChange()
}

export function generateAssignmentNumber(): string {
  const number = nextAssignmentSequence
  nextAssignmentSequence += 1
  saveAssignments()
  return `ASN-${String(number).padStart(6, '0')}`
}

export function getAllAssignments(): AssignmentRecord[] {
  return [...assignments]
}

export function getAssignmentById(assignmentId: string): AssignmentRecord | undefined {
  return assignments.find((record) => record.assignmentId === assignmentId)
}

export function getAssignmentByNumber(assignmentNumber: string): AssignmentRecord | undefined {
  return assignments.find(
    (record) => record.assignmentNumber.toLowerCase() === assignmentNumber.toLowerCase(),
  )
}

export function getActiveAssignmentForRukn(ruknId: string): AssignmentRecord | undefined {
  return assignments.find((record) => record.ruknId === ruknId && record.status === 'Active')
}

/**
 * All active assignments for a Rukn. A single Rukn may support many active Karkuns,
 * so this returns every Active record rather than just the first match.
 */
export function getActiveAssignmentsForRukn(ruknId: string): AssignmentRecord[] {
  return assignments.filter((record) => record.ruknId === ruknId && record.status === 'Active')
}

export function getSuspendedAssignmentForRukn(ruknId: string): AssignmentRecord | undefined {
  return assignments.find((record) => record.ruknId === ruknId && record.status === 'Suspended')
}

export function getBlockingAssignmentForRukn(ruknId: string): AssignmentRecord | undefined {
  return assignments.find(
    (record) =>
      record.ruknId === ruknId && (record.status === 'Active' || record.status === 'Suspended'),
  )
}

export function getActiveAssignmentsForKarkun(karkunId: string): AssignmentRecord[] {
  return assignments.filter(
    (record) => record.karkunId === karkunId && record.status === 'Active',
  )
}

export function getAssignmentHistoryForRukn(ruknId: string): AssignmentRecord[] {
  return assignments
    .filter((record) => record.ruknId === ruknId)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
}

export function getAssignmentHistoryForKarkun(karkunId: string): AssignmentRecord[] {
  return assignments
    .filter((record) => record.karkunId === karkunId)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
}

export function appendAssignment(record: AssignmentRecord): AssignmentRecord {
  assignments.unshift(record)
  saveAssignments()
  notifyAssignmentStoreChange()
  return record
}

export function updateAssignmentStatus(
  assignmentId: string,
  status: AssignmentStatus,
  updates: Partial<
    Pick<
      AssignmentRecord,
      'replacementReason' | 'removalReason' | 'remarks' | 'endedDate' | 'updatedAt'
    >
  >,
): AssignmentRecord | undefined {
  const record = assignments.find((item) => item.assignmentId === assignmentId)
  if (!record) {
    return undefined
  }

  record.status = status
  if (updates.replacementReason !== undefined) record.replacementReason = updates.replacementReason
  if (updates.removalReason !== undefined) record.removalReason = updates.removalReason
  if (updates.remarks !== undefined) record.remarks = updates.remarks
  if (updates.endedDate !== undefined) record.endedDate = updates.endedDate
  record.updatedAt = updates.updatedAt ?? new Date().toISOString()

  saveAssignments()
  notifyAssignmentStoreChange()
  return record
}

export function countAssignmentChanges(): number {
  return assignments.filter((record) => record.status !== 'Active').length
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfWeek(date: Date): Date {
  const day = date.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(date)
  monday.setDate(date.getDate() - diff)
  return startOfDay(monday)
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function countAssignmentsCreatedSince(since: Date): number {
  const sinceMs = since.getTime()
  return assignments.filter((record) => new Date(record.createdAt).getTime() >= sinceMs).length
}

export function getAssignmentPeriodCounts(): {
  assignmentsToday: number
  assignmentsThisWeek: number
  assignmentsThisMonth: number
} {
  const now = new Date()
  return {
    assignmentsToday: countAssignmentsCreatedSince(startOfDay(now)),
    assignmentsThisWeek: countAssignmentsCreatedSince(startOfWeek(now)),
    assignmentsThisMonth: countAssignmentsCreatedSince(startOfMonth(now)),
  }
}

export function searchAssignments(query: string): AssignmentRecord[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return getAllAssignments()
  }
  return assignments.filter((record) =>
    record.assignmentNumber.toLowerCase().includes(normalized),
  )
}

export function clearAssignmentStore(): void {
  assignments.length = 0
  nextAssignmentSequence = 1
  getRepositories().connection.clear()
  notifyAssignmentStoreChange()
}

export type AssignmentStoreSnapshot = {
  assignments: AssignmentRecord[]
  nextSequence: number
}

export function snapshotAssignmentStore(): AssignmentStoreSnapshot {
  return {
    assignments: [...assignments],
    nextSequence: nextAssignmentSequence,
  }
}

/** Migration support — replace all assignments atomically. */
export function replaceAllAssignments(
  records: AssignmentRecord[],
  nextSequence?: number,
): AssignmentStoreSnapshot {
  const previous = snapshotAssignmentStore()

  assignments.length = 0
  assignments.push(...records)

  nextAssignmentSequence =
    nextSequence ??
    Math.max(previous.nextSequence, deriveNextSequenceFromRecords(records))

  saveAssignments()
  notifyAssignmentStoreChange()
  return previous
}
