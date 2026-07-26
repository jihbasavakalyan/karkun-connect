/**
 * KC-0121 — QueueBuilder
 * Builds unified work queue items from Priority Intelligence (no duplicated rules).
 */

import { getRuknById } from '@/data/ruknMaster'
import { ROUTES } from '@/constants/routes'
import { getPendingFollowUps } from '@/services/followUpService'
import { getRecentActivity } from '@/stores/activityLogStore'
import type { PriorityItem, PriorityIntelligenceSnapshot } from '@/lib/priorityIntelligence'
import { isWorkItemReviewed } from './reviewStore'
import type { WorkQueueItem } from './types'

const CONTEXT_LABELS: Record<string, string> = {
  'pending-visits': 'Pending Visits',
  'pending-weekly-ijtema': 'Pending Weekly Ijtema',
  'pending-jih-registration': 'Pending Registration',
  'pending-baitul-maal': 'Pending Baitul Maal',
  'follow-up-pending': 'Follow-up Pending',
  'no-activity': 'Inactive Rukns',
  'new-assignment': 'New Assignments',
  'karkun-intake': 'New Karkun Requests',
}

export function buildWorkQueue(snapshot: PriorityIntelligenceSnapshot): WorkQueueItem[] {
  return snapshot.priorities.map((priority) => toWorkItem(priority, snapshot.generatedAt))
}

function toWorkItem(priority: PriorityItem, generatedAt: string): WorkQueueItem {
  const contextLabel = CONTEXT_LABELS[priority.context] ?? priority.context
  const title = contextLabel
  const pendingMatterLabel = priority.reason
  const openRoute =
    priority.recommendedAction.route ??
    (priority.context === 'no-activity' ? ROUTES.ADMIN_RUKN : undefined)

  const ruknNames = (priority.responsibleRuknIds ?? [])
    .map((id) => getRuknById(id)?.name)
    .filter((name): name is string => Boolean(name))

  const followUpKarkunNames =
    priority.context === 'follow-up-pending'
      ? getPendingFollowUps().map((item) => item.karkunName).filter(Boolean)
      : []

  const searchText = [
    title,
    priority.reason,
    priority.responsiblePersonLabel,
    priority.affectedPeopleLabel,
    contextLabel,
    priority.context,
    priority.recommendedAction.recommendation,
    pendingMatterLabel,
    ...ruknNames,
    ...followUpKarkunNames,
  ]
    .join(' ')
    .toLowerCase()

  return {
    id: `work-${priority.id}`,
    priorityId: priority.id,
    severity: priority.severity,
    title,
    context: priority.context,
    contextLabel,
    reason: priority.reason,
    responsiblePersonLabel: priority.responsiblePersonLabel,
    responsibleRuknIds: priority.responsibleRuknIds,
    recommendedAction: priority.recommendedAction,
    status: isWorkItemReviewed(`work-${priority.id}`) ? 'Reviewed' : 'Pending',
    queuedAt: resolveQueuedAt(priority, generatedAt),
    searchText,
    pendingMatterLabel,
    openRoute,
    communicationContext: priority.recommendedAction.communicationContext,
  }
}

function resolveQueuedAt(priority: PriorityItem, generatedAt: string): string {
  if (priority.context === 'follow-up-pending') {
    const dates = getPendingFollowUps()
      .map((item) => item.followUpDate)
      .filter(Boolean)
      .sort()
    if (dates[0]) return `${dates[0]}T00:00:00.000Z`
  }

  if (priority.context === 'new-assignment') {
    const stamps = getRecentActivity(300)
      .filter((entry) => entry.type === 'assign' && entry.ruknId)
      .map((entry) => Date.parse(entry.timestamp))
      .filter((ts) => Number.isFinite(ts))
      .sort((a, b) => a - b)
    if (stamps[0] != null) return new Date(stamps[0]).toISOString()
  }

  // Stable ordering within severity: larger backlog treated as older pending work.
  const base = Date.parse(generatedAt)
  if (!Number.isFinite(base)) return generatedAt
  const offsetMs = Math.min(priority.affectedCount, 365) * 60_000
  return new Date(base - offsetMs).toISOString()
}
