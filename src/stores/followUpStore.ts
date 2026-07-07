import type { FollowUpRecord, FollowUpStatus } from '@/types/followUp'
import {
  loadJsonFromStorage,
  removeFromStorage,
  saveJsonToStorage,
} from '@/lib/browserStorage'

const STORAGE_KEY = 'karkun-connect.followups'

const followUpRecords: FollowUpRecord[] = loadJsonFromStorage<FollowUpRecord[]>(STORAGE_KEY, [])

type FollowUpStoreListener = () => void
const listeners = new Set<FollowUpStoreListener>()

function persistFollowUpStore(): void {
  saveJsonToStorage(STORAGE_KEY, followUpRecords)
}

export function subscribeToFollowUpStore(listener: FollowUpStoreListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyFollowUpStoreChange(): void {
  persistFollowUpStore()
  listeners.forEach((listener) => listener())
}

export function getAllFollowUpRecords(): FollowUpRecord[] {
  return [...followUpRecords]
}

export function getPendingFollowUpForAssignment(
  assignmentId: string,
): FollowUpRecord | undefined {
  return followUpRecords.find(
    (record) => record.assignmentId === assignmentId && record.status === 'Pending',
  )
}

export function getActiveFollowUpForKarkun(karkunId: string): FollowUpRecord | undefined {
  return followUpRecords.find(
    (record) => record.karkunId === karkunId && record.status === 'Pending',
  )
}

export function appendFollowUpRecord(record: FollowUpRecord): FollowUpRecord {
  followUpRecords.unshift(record)
  notifyFollowUpStoreChange()
  return record
}

export function updateFollowUpStatus(
  followUpId: string,
  status: FollowUpStatus,
  completedAt?: string,
): FollowUpRecord | undefined {
  const record = followUpRecords.find((item) => item.followUpId === followUpId)
  if (!record) {
    return undefined
  }

  record.status = status
  if (completedAt) {
    record.completedAt = completedAt
  }

  notifyFollowUpStoreChange()
  return record
}

export function completePendingFollowUpsForAssignment(assignmentId: string): FollowUpRecord[] {
  const timestamp = new Date().toISOString()
  const completed = followUpRecords.filter(
    (record) => record.assignmentId === assignmentId && record.status === 'Pending',
  )

  for (const record of completed) {
    record.status = 'Completed'
    record.completedAt = timestamp
  }

  if (completed.length > 0) {
    notifyFollowUpStoreChange()
  }

  return completed
}

export function reloadFollowUpStoreFromPersistence(): void {
  const loaded = loadJsonFromStorage<FollowUpRecord[]>(STORAGE_KEY, [])
  followUpRecords.length = 0
  followUpRecords.push(...loaded)
  notifyFollowUpStoreChange()
}

export function clearFollowUpStore(): void {
  followUpRecords.length = 0
  removeFromStorage(STORAGE_KEY)
  notifyFollowUpStoreChange()
}
