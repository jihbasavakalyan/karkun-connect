import type { IjtemaAttendanceRecord } from '@/types/ijtemaAttendance'
import { loadMapFromStorage, removeFromStorage, saveMapToStorage } from '@/lib/browserStorage'

const STORAGE_KEY = 'karkun-connect.ijtema'

const records = loadMapFromStorage<string, IjtemaAttendanceRecord>(STORAGE_KEY)

type IjtemaAttendanceStoreListener = () => void
const listeners = new Set<IjtemaAttendanceStoreListener>()

function persistIjtemaAttendanceStore(): void {
  saveMapToStorage(STORAGE_KEY, records)
}

export function subscribeToIjtemaAttendanceStore(
  listener: IjtemaAttendanceStoreListener,
): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyIjtemaAttendanceStoreChange(): void {
  persistIjtemaAttendanceStore()
  listeners.forEach((listener) => listener())
}

function recordKey(karkunId: string, weekEndingDate: string): string {
  return `${karkunId}:${weekEndingDate}`
}

export function getIjtemaAttendanceRecord(
  karkunId: string,
  weekEndingDate: string,
): IjtemaAttendanceRecord | undefined {
  return records.get(recordKey(karkunId, weekEndingDate))
}

export function upsertIjtemaAttendanceRecord(
  record: IjtemaAttendanceRecord,
): IjtemaAttendanceRecord {
  records.set(recordKey(record.karkunId, record.weekEndingDate), record)
  notifyIjtemaAttendanceStoreChange()
  return record
}

export function getAllIjtemaAttendanceRecords(): IjtemaAttendanceRecord[] {
  return [...records.values()]
}

export function clearIjtemaAttendanceStore(): void {
  records.clear()
  removeFromStorage(STORAGE_KEY)
  notifyIjtemaAttendanceStoreChange()
}
