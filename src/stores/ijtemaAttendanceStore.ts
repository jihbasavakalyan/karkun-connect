import type { IjtemaAttendanceRecord } from '@/types/ijtemaAttendance'

const records = new Map<string, IjtemaAttendanceRecord>()

type IjtemaAttendanceStoreListener = () => void
const listeners = new Set<IjtemaAttendanceStoreListener>()

export function subscribeToIjtemaAttendanceStore(
  listener: IjtemaAttendanceStoreListener,
): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyIjtemaAttendanceStoreChange(): void {
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
