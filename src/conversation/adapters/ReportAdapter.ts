/**
 * Report repository adapter contract (KC-004 Sprint 1.5).
 *
 * Purpose: Translate dashboard / progress metrics into conversation-safe summaries.
 * Repository dependency: Implementations may wrap campaign, execution, and reporting reads.
 * Future extensions: Aggregate metrics for administrator reporting channels.
 * Capability support: Read and optional batch for report channel composition.
 * Error mapping: RepositoryUnavailable when metrics sources are offline.
 */

import type { RepositoryAdapter } from './RepositoryAdapter'
import type { AdapterResult, AdapterScope } from './AdapterTypes'

export type AdapterDashboardMetric = {
  key: string
  value: number | string
  unit?: string
  labelKey?: string
}

export type AdapterProgressSummary = {
  campaignId?: string
  completionRatio?: number
  connectedCount?: number
  pendingCount?: number
  metrics: readonly AdapterDashboardMetric[]
}

/**
 * ReportAdapter — read dashboard metrics and progress summaries.
 */
export interface ReportAdapter extends RepositoryAdapter {
  readonly adapterId: 'report'
  readDashboardMetrics(scope?: AdapterScope): AdapterResult<readonly AdapterDashboardMetric[]>
  readProgressSummaries(scope?: AdapterScope): AdapterResult<AdapterProgressSummary>
}
