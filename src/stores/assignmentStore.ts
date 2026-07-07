import type { AssignmentRecord, AssignmentStatus } from '@/types/assignment'

const ASSIGNMENTS_STORAGE_KEY = 'karkun-connect.assignments'
const ASSIGNMENT_SEQUENCE_STORAGE_KEY = 'karkun-connect.assignments.sequence'

const memoryStorage: Record<string, string> = {}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function getAssignmentStorage(): StorageLike {
  if (typeof window !== 'undefined') {
    return localStorage
  }

  return {
    getItem: (key) => memoryStorage[key] ?? null,
    setItem: (key, value) => {
      memoryStorage[key] = value
    },
    removeItem: (key) => {
      delete memoryStorage[key]
    },
  }
}

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
  const storage = getAssignmentStorage()
  try {
    const raw = storage.getItem(ASSIGNMENTS_STORAGE_KEY)
    if (!raw) {
      return { assignments: [], nextSequence: 1 }
    }

    const parsed = JSON.parse(raw) as AssignmentRecord[]
    if (!Array.isArray(parsed)) {
      return { assignments: [], nextSequence: 1 }
    }

    const storedSequence = storage.getItem(ASSIGNMENT_SEQUENCE_STORAGE_KEY)
    const parsedSequence = storedSequence ? Number.parseInt(storedSequence, 10) : Number.NaN
    const derivedSequence = deriveNextSequenceFromRecords(parsed)
    const nextSequence = Number.isFinite(parsedSequence)
      ? Math.max(parsedSequence, derivedSequence)
      : derivedSequence

    return { assignments: parsed, nextSequence }
  } catch {
    return { assignments: [], nextSequence: 1 }
  }
}

function persistAssignmentState(
  records: AssignmentRecord[],
  nextSequence: number,
): void {
  const storage = getAssignmentStorage()
  storage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(records))
  storage.setItem(ASSIGNMENT_SEQUENCE_STORAGE_KEY, String(nextSequence))
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

/** Re-read assignments from browser storage (simulates page reload). */
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
  const storage = getAssignmentStorage()
  storage.removeItem(ASSIGNMENTS_STORAGE_KEY)
  storage.removeItem(ASSIGNMENT_SEQUENCE_STORAGE_KEY)
  notifyAssignmentStoreChange()
}
