import type { IjtemaAttendanceRecord } from '@/types/ijtemaAttendance'
import { normalizeIjtemaAttendanceStatus } from '@/types/ijtemaAttendance'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'

function hydrateRecord(raw: IjtemaAttendanceRecord): IjtemaAttendanceRecord {
  const status = normalizeIjtemaAttendanceStatus(raw.status) ?? 'Absent'
  return { ...raw, status }
}

const records = new Map<string, IjtemaAttendanceRecord>()
for (const record of unwrapRepository(getRepositories().compliance.loadIjtema(), [])) {
  const hydrated = hydrateRecord(record as IjtemaAttendanceRecord)
  records.set(`${hydrated.karkunId}:${hydrated.weekEndingDate}`, hydrated)
}

type IjtemaAttendanceStoreListener = () => void
const listeners = new Set<IjtemaAttendanceStoreListener>()

function persistIjtemaAttendanceStore(): void {
  getRepositories().compliance.saveIjtema([...records.values()])
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

export function reloadIjtemaAttendanceStoreFromPersistence(): void {
  records.clear()
  for (const record of unwrapRepository(getRepositories().compliance.loadIjtema(), [])) {
    const hydrated = hydrateRecord(record as IjtemaAttendanceRecord)
    records.set(recordKey(hydrated.karkunId, hydrated.weekEndingDate), hydrated)
  }
  listeners.forEach((listener) => listener())
}

export function clearIjtemaAttendanceStore(): void {
  records.clear()
  getRepositories().compliance.clearIjtema()
  notifyIjtemaAttendanceStoreChange()
}
