import type { BaitulMaalRecord } from '@/types/baitulMaal'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'

const records = new Map<string, BaitulMaalRecord>()
for (const record of unwrapRepository(getRepositories().compliance.loadBaitulMaal(), [])) {
  records.set(`${record.karkunId}:${record.monthKey}`, record)
}

type BaitulMaalStoreListener = () => void
const listeners = new Set<BaitulMaalStoreListener>()

function persistBaitulMaalStore(): void {
  getRepositories().compliance.saveBaitulMaal([...records.values()])
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
  getRepositories().compliance.clearBaitulMaal()
  notifyBaitulMaalStoreChange()
}
