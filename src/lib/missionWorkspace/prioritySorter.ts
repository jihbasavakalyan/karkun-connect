/**
 * KC-0121 — PrioritySorter
 * Critical → High → Medium → Low; within each, oldest first.
 */

import type { PrioritySeverity } from '@/lib/priorityIntelligence'
import type { WorkQueueItem } from './types'

const SEVERITY_ORDER: Record<PrioritySeverity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
}

export function sortWorkQueue(items: WorkQueueItem[]): WorkQueueItem[] {
  return [...items].sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    if (bySeverity !== 0) return bySeverity
    const aTime = Date.parse(a.queuedAt)
    const bTime = Date.parse(b.queuedAt)
    if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
      return aTime - bTime
    }
    return a.id.localeCompare(b.id)
  })
}
