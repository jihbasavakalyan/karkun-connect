/**
 * Digital Rafeeq v2 — shared product types.
 * Presentation metadata only; business values come from existing KC services.
 */

import type { RafeeqAction } from '../types'

export type ExplainReason = {
  readonly id: string
  readonly label: string
  readonly sourceField: string
}

export type WorkQueueTaskPriority =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6

export type WorkQueueTask = {
  readonly id: string
  readonly priority: WorkQueueTaskPriority
  readonly title: string
  readonly reason: string
  readonly why: readonly ExplainReason[]
  readonly openRoute: string
  readonly quickAction?: RafeeqAction
  readonly context: string
}

export type BriefingSection = {
  readonly id: string
  readonly title: string
  readonly lines: readonly string[]
  readonly actions: readonly RafeeqAction[]
}

export type ProactiveItem = {
  readonly id: string
  readonly urgency: number
  readonly text: string
  readonly why: readonly ExplainReason[]
  readonly action?: RafeeqAction
}

export type EntityCard = {
  readonly id: string
  readonly entityType: string
  readonly title: string
  readonly summary: string
  readonly status: string
  readonly why: readonly ExplainReason[]
  readonly actions: readonly RafeeqAction[]
}

export type NotificationItem = {
  readonly id: string
  readonly text: string
  readonly kind: string
  readonly openRoute?: string
  readonly dismissible: boolean
  readonly remindLaterLabel?: string
}

export type TimelineEntry = {
  readonly id: string
  readonly bucket: 'today' | 'yesterday' | 'this_week' | 'recent'
  readonly title: string
  readonly detail: string
  readonly at: string
  readonly category: string
}

export type InsightItem = {
  readonly id: string
  readonly text: string
  readonly source: string
  readonly why: readonly ExplainReason[]
}

export type RecommendationItem = {
  readonly id: string
  readonly text: string
  readonly why: readonly ExplainReason[]
  readonly actions: readonly RafeeqAction[]
}

export type PersonalDashboardSnapshot = {
  readonly todaysWork: number
  readonly completedToday: number
  readonly pending: number
  readonly completionPct: number
  readonly visitsPending: number
  readonly followUpsPending: number
  readonly attendanceHeadline: string
  readonly messagesHeadline: string
  readonly campaignHeadline: string
  readonly why: readonly ExplainReason[]
  readonly actions: readonly RafeeqAction[]
}

export type GuidedStep = {
  readonly id: string
  readonly label: string
  readonly action?: RafeeqAction
}

export type ConversationHistorySnapshot = {
  readonly recentUtterances: readonly string[]
  readonly recentSearches: readonly string[]
  readonly recentActions: readonly RafeeqAction[]
  readonly pinned: readonly string[]
  readonly suggestedFollowUps: readonly string[]
}
