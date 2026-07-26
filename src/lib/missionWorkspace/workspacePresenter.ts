/**
 * KC-0121 — WorkspacePresenter
 * Filters / search over sorted work queue (presentation helpers).
 */

import type { MissionWorkspaceFilters, WorkQueueItem } from './types'

export function presentWorkQueue(
  items: WorkQueueItem[],
  filters: MissionWorkspaceFilters = {},
): WorkQueueItem[] {
  let out = items

  if (filters.priority) {
    out = out.filter((item) => item.severity === filters.priority)
  }
  if (filters.context) {
    const needle = filters.context.trim().toLowerCase()
    out = out.filter(
      (item) =>
        item.context.toLowerCase() === needle ||
        item.contextLabel.toLowerCase() === needle,
    )
  }
  if (filters.responsiblePerson) {
    const needle = filters.responsiblePerson.trim().toLowerCase()
    out = out.filter((item) => item.responsiblePersonLabel.toLowerCase().includes(needle))
  }
  if (filters.status) {
    out = out.filter((item) => item.status === filters.status)
  }
  if (filters.search?.trim()) {
    const needle = filters.search.trim().toLowerCase()
    out = out.filter((item) => item.searchText.includes(needle))
  }

  return out
}

export function listWorkQueueContexts(items: WorkQueueItem[]): string[] {
  return [...new Set(items.map((item) => item.contextLabel))].sort((a, b) =>
    a.localeCompare(b),
  )
}

export function listWorkQueueResponsiblePeople(items: WorkQueueItem[]): string[] {
  return [...new Set(items.map((item) => item.responsiblePersonLabel))].sort((a, b) =>
    a.localeCompare(b),
  )
}
