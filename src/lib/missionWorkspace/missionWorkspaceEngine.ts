/**
 * KC-0121 — MissionWorkspaceEngine
 * PriorityEngine → QueueBuilder → PrioritySorter → WorkspacePresenter
 */

import { runPriorityEngine } from '@/lib/priorityIntelligence'
import { buildWorkQueue } from './queueBuilder'
import { sortWorkQueue } from './prioritySorter'
import {
  listWorkQueueContexts,
  listWorkQueueResponsiblePeople,
  presentWorkQueue,
} from './workspacePresenter'
import type { MissionWorkspaceFilters, MissionWorkspaceSnapshot, WorkQueueItem } from './types'

export function runMissionWorkspaceEngine(
  filters: MissionWorkspaceFilters = {},
): MissionWorkspaceSnapshot {
  const prioritySnapshot = runPriorityEngine()
  const built = buildWorkQueue(prioritySnapshot)
  const sorted = sortWorkQueue(built)
  const items = presentWorkQueue(sorted, filters)

  return {
    generatedAt: prioritySnapshot.generatedAt,
    items,
    summary: summarize(sorted),
  }
}

/** Unfiltered sorted queue (for filter option lists). */
export function getMissionWorkspaceQueue(): WorkQueueItem[] {
  const prioritySnapshot = runPriorityEngine()
  return sortWorkQueue(buildWorkQueue(prioritySnapshot))
}

export function getMissionWorkspaceFilterOptions(): {
  contexts: string[]
  responsiblePeople: string[]
} {
  const items = getMissionWorkspaceQueue()
  return {
    contexts: listWorkQueueContexts(items),
    responsiblePeople: listWorkQueueResponsiblePeople(items),
  }
}

function summarize(items: WorkQueueItem[]): MissionWorkspaceSnapshot['summary'] {
  return {
    total: items.length,
    pending: items.filter((item) => item.status === 'Pending').length,
    reviewed: items.filter((item) => item.status === 'Reviewed').length,
    critical: items.filter((item) => item.severity === 'Critical').length,
    high: items.filter((item) => item.severity === 'High').length,
    medium: items.filter((item) => item.severity === 'Medium').length,
    low: items.filter((item) => item.severity === 'Low').length,
  }
}
