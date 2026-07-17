/**
 * Compliance repository adapter contract (KC-004 Sprint 1.5).
 *
 * Purpose: Translate compliance repository reads into conversation-safe summaries.
 * Dependencies: Implementations wrap ComplianceRepository.
 * Capabilities: Read-focused; compliance writes remain in existing Rukn workflows.
 * Supported operations: compliance summaries, tracker status, outstanding items.
 * Future extensions: Tracker summaries may feed reminder policies via Knowledge snapshots.
 */

import type { RepositoryAdapter } from './AdapterCapabilities'
import type { AdapterResult, AdapterScope } from './AdapterTypes'

export type AdapterComplianceDomain =
  | 'jih_portal'
  | 'ijtema'
  | 'baitul_maal'
  | 'unknown'

export type AdapterComplianceSummary = {
  domain: AdapterComplianceDomain
  status: 'complete' | 'pending' | 'overdue' | 'unknown'
  lastUpdatedAt?: number
  metadata?: Readonly<Record<string, unknown>>
}

export type AdapterTrackerSummary = {
  domain: AdapterComplianceDomain
  completedCount: number
  pendingCount: number
  overdueCount: number
}

export type AdapterOutstandingItem = {
  domain: AdapterComplianceDomain
  itemKey: string
  status: 'pending' | 'overdue'
  dueAt?: string
  karkunId?: string
}

/**
 * ComplianceAdapter — summaries, tracker status, and outstanding items.
 */
export interface ComplianceAdapter extends RepositoryAdapter {
  readonly adapterId: 'compliance'
  readComplianceSummaries(
    scope: AdapterScope,
  ): AdapterResult<readonly AdapterComplianceSummary[]>
  readTrackerStatus(scope: AdapterScope): AdapterResult<readonly AdapterTrackerSummary[]>
  readOutstandingItems(scope: AdapterScope): AdapterResult<readonly AdapterOutstandingItem[]>
}
