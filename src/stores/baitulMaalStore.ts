import type { BaitulMaalRecord } from '@/types/baitulMaal'
import { loadMapFromStorage, removeFromStorage, saveMapToStorage } from '@/lib/browserStorage'

const STORAGE_KEY = 'karkun-connect.baitul-maal'

const records = loadMapFromStorage<string, BaitulMaalRecord>(STORAGE_KEY)

type BaitulMaalStoreListener = () => void
const listeners = new Set<BaitulMaalStoreListener>()

function persistBaitulMaalStore(): void {
  saveMapToStorage(STORAGE_KEY, records)
}

export function subscribeToBaitulMaalStore(listener: BaitulMaalStoreListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyBaitulMaalStoreChange(): void {
  persistBaitulMaalStore()
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

export function clearBaitulMaalStore(): void {
  records.clear()
  removeFromStorage(STORAGE_KEY)
  notifyBaitulMaalStoreChange()
}
