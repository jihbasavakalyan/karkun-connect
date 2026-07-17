/**
 * Development assessment store (PART 13).
 * Local assessment checklists — does not touch Compliance financial records.
 */

import {
  createEmptyDevelopmentIndicators,
  type DevelopmentAssessmentRecord,
} from '@/types/developmentAssessment'

const STORAGE_KEY = 'karkun-connect.development-assessment'

const records = new Map<string, DevelopmentAssessmentRecord>()

type Listener = () => void
const listeners = new Set<Listener>()

function loadFromStorage(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as DevelopmentAssessmentRecord[]
    records.clear()
    for (const record of parsed) {
      records.set(record.karkunId, {
        ...record,
        indicators: {
          ...createEmptyDevelopmentIndicators(),
          ...record.indicators,
        },
      })
    }
  } catch {
    // ignore corrupt storage
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...records.values()]))
  } catch {
    // ignore
  }
}

function notify(): void {
  persist()
  listeners.forEach((listener) => listener())
}

loadFromStorage()

export function subscribeToDevelopmentAssessmentStore(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getDevelopmentAssessment(
  karkunId: string,
): DevelopmentAssessmentRecord | undefined {
  return records.get(karkunId)
}

export function upsertDevelopmentAssessment(
  record: DevelopmentAssessmentRecord,
): DevelopmentAssessmentRecord {
  const next: DevelopmentAssessmentRecord = {
    ...record,
    indicators: {
      ...createEmptyDevelopmentIndicators(),
      ...record.indicators,
    },
  }
  records.set(record.karkunId, next)
  notify()
  return next
}

export function clearDevelopmentAssessmentStore(): void {
  records.clear()
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener())
}
