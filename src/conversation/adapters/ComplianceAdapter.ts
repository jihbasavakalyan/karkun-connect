/**
 * Compliance repository adapter contract (KC-004 Sprint 1.5).
 *
 * Purpose: Translate compliance repository reads into conversation-safe summaries.
 * Repository dependency: Implementations wrap ComplianceRepository.
 * Future extensions: Tracker summaries may feed reminder policies via Knowledge snapshots.
 * Capability support: Read-focused; compliance writes remain in existing Rukn workflows.
 * Error mapping: PermissionDenied for out-of-scope Rukn reads.
 */

import type { RepositoryAdapter } from './RepositoryAdapter'
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

/**
 * ComplianceAdapter — read compliance posture and tracker summaries.
 */
export interface ComplianceAdapter extends RepositoryAdapter {
  readonly adapterId: 'compliance'
  readCompliance(scope: AdapterScope): AdapterResult<readonly AdapterComplianceSummary[]>
  readTrackerSummaries(scope: AdapterScope): AdapterResult<readonly AdapterTrackerSummary[]>
}
