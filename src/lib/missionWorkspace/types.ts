/**
 * KC-0121 — Mission Workspace types.
 */

import type {
  PriorityRecommendedAction,
  PrioritySeverity,
} from '@/lib/priorityIntelligence'
import type { CommunicationContextId } from '@/lib/communication/contextAware'

export type WorkItemStatus = 'Pending' | 'Reviewed'

export type WorkQueueItem = {
  id: string
  priorityId: string
  severity: PrioritySeverity
  title: string
  context: string
  contextLabel: string
  reason: string
  responsiblePersonLabel: string
  responsibleRuknIds?: string[]
  recommendedAction: PriorityRecommendedAction
  status: WorkItemStatus
  /** ISO timestamp — oldest first within severity */
  queuedAt: string
  searchText: string
  pendingMatterLabel: string
  openRoute?: string
  communicationContext?: CommunicationContextId
}

export type MissionWorkspaceFilters = {
  priority?: PrioritySeverity | ''
  context?: string
  responsiblePerson?: string
  status?: WorkItemStatus | ''
  search?: string
}

export type MissionWorkspaceSnapshot = {
  generatedAt: string
  items: WorkQueueItem[]
  summary: {
    pending: number
    reviewed: number
    total: number
    critical: number
    high: number
    medium: number
    low: number
  }
}
