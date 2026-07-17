/**
 * Report repository adapter contract (KC-004 Sprint 1.5).
 *
 * Purpose: Translate dashboard / progress metrics into conversation-safe summaries.
 * Dependencies: Implementations may wrap campaign, execution, and reporting reads.
 * Capabilities: Read and optional batch for report channel composition.
 * Supported operations: dashboard summaries, execution summaries, progress metrics.
 * Future extensions: Aggregate metrics for administrator reporting channels.
 */

import type { RepositoryAdapter } from './AdapterCapabilities'
import type { AdapterResult, AdapterScope } from './AdapterTypes'

export type AdapterDashboardMetric = {
  key: string
  value: number | string
  unit?: string
  labelKey?: string
}

export type AdapterDashboardSummary = {
  campaignId?: string
  metrics: readonly AdapterDashboardMetric[]
  generatedAt?: number
}

export type AdapterExecutionSummary = {
  campaignId?: string
  meetingsCompleted?: number
  meetingsPending?: number
  followUpsDue?: number
  metrics: readonly AdapterDashboardMetric[]
}

export type AdapterProgressSummary = {
  campaignId?: string
  completionRatio?: number
  connectedCount?: number
  pendingCount?: number
  metrics: readonly AdapterDashboardMetric[]
}

/**
 * ReportAdapter — dashboard summaries, execution summaries, progress metrics.
 */
export interface ReportAdapter extends RepositoryAdapter {
  readonly adapterId: 'report'
  readDashboardSummaries(scope?: AdapterScope): AdapterResult<AdapterDashboardSummary>
  readExecutionSummaries(scope?: AdapterScope): AdapterResult<AdapterExecutionSummary>
  readProgressMetrics(scope?: AdapterScope): AdapterResult<AdapterProgressSummary>
}
