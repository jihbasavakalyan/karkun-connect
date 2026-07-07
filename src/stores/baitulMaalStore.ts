import type { BaitulMaalRecord } from '@/types/baitulMaal'

const records = new Map<string, BaitulMaalRecord>()

type BaitulMaalStoreListener = () => void
const listeners = new Set<BaitulMaalStoreListener>()

export function subscribeToBaitulMaalStore(listener: BaitulMaalStoreListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyBaitulMaalStoreChange(): void {
  listeners.forEach((listener) => listener())
}

function recordKey(karkunId: string, monthKey: string): string {
  return `${karkunId}:${monthKey}`
}

export function getBaitulMaalRecord(
  karkunId: string,
  monthKey: string,
): BaitulMaalRecord | undefined {
  return records.get(recordKey(karkunId, monthKey))
}

export function upsertBaitulMaalRecord(record: BaitulMaalRecord): BaitulMaalRecord {
  records.set(recordKey(record.karkunId, record.monthKey), record)
  notifyBaitulMaalStoreChange()
  return record
}

export function getAllBaitulMaalRecords(): BaitulMaalRecord[] {
  return [...records.values()]
}
