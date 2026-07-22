import type { BaitulMaalRecord } from '@/types/baitulMaal'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'

const records = new Map<string, BaitulMaalRecord>()
for (const record of unwrapRepository(getRepositories().compliance.loadBaitulMaal(), [])) {
  records.set(`${record.karkunId}:${record.monthKey}`, record)
}

type BaitulMaalStoreListener = () => void
const listeners = new Set<BaitulMaalStoreListener>()

function notifyListeners(): void {
  listeners.forEach((listener) => listener())
}

/** KC-0084 — persist only dirty records (avoids batch permission failure on foreign docs). */
function persistDirty(dirty: BaitulMaalRecord[]): void {
  console.info('[KC-0084] Execution Update Requested', {
    kind: 'baitulMaal',
    count: dirty.length,
  })
  getRepositories().compliance.saveBaitulMaal(dirty)
}

export function subscribeToBaitulMaalStore(listener: BaitulMaalStoreListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
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
  persistDirty([record])
  notifyListeners()
  return record
}

export function getAllBaitulMaalRecords(): BaitulMaalRecord[] {
  return [...records.values()]
}

export function reloadBaitulMaalStoreFromPersistence(): void {
  records.clear()
  for (const record of unwrapRepository(getRepositories().compliance.loadBaitulMaal(), [])) {
    records.set(recordKey(record.karkunId, record.monthKey), record)
  }
  notifyListeners()
}

export function clearBaitulMaalStore(): void {
  records.clear()
  getRepositories().compliance.clearBaitulMaal()
  notifyListeners()
}
