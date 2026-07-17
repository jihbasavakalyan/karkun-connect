/**
 * Concrete ComplianceRepository adapter (KC-005 Sprint 2.1).
 *
 * Purpose: Bridge ComplianceRepository to ComplianceAdapter contract.
 * Returns summaries only — never raw compliance entities.
 */

import {
  BaseRepositoryAdapter,
  DEFAULT_READ_CAPABILITIES,
  adapterOk,
  mapRepositoryFailureResult,
  type AdapterComplianceDomain,
  type AdapterComplianceSummary,
  type AdapterOutstandingItem,
  type AdapterResult,
  type AdapterScope,
  type AdapterTrackerSummary,
  type ComplianceAdapter,
} from '@/conversation/adapters'
import type { ComplianceRepository } from '@/repositories/interfaces'
import { resolveAdapterAvailability } from './adapterResult'

function trackerStatus(
  completed: number,
  pending: number,
  overdue: number,
): AdapterComplianceSummary['status'] {
  if (overdue > 0) return 'overdue'
  if (pending > 0) return 'pending'
  if (completed > 0) return 'complete'
  return 'unknown'
}

export class ComplianceRepositoryAdapter
  extends BaseRepositoryAdapter
  implements ComplianceAdapter
{
  readonly adapterId = 'compliance' as const

  private readonly complianceRepository: ComplianceRepository

  constructor(complianceRepository: ComplianceRepository) {
    super()
    this.complianceRepository = complianceRepository
    this.setCapabilities({
      ...DEFAULT_READ_CAPABILITIES,
      supportsOffline: true,
      supportsBatch: true,
    })
    this.setAvailability(resolveAdapterAvailability())
  }

  readComplianceSummaries(
    scope: AdapterScope,
  ): AdapterResult<readonly AdapterComplianceSummary[]> {
    return this.buildSummaries(scope)
  }

  readTrackerStatus(scope: AdapterScope): AdapterResult<readonly AdapterTrackerSummary[]> {
    const availability = resolveAdapterAvailability()
    if (availability === 'offline') {
      return mapRepositoryFailureResult(this.adapterId, 'Offline', 'Repository is offline.', 'offline')
    }

    const summariesResult = this.buildSummaries(scope)
    if (!summariesResult.ok) return summariesResult

    const trackers: AdapterTrackerSummary[] = summariesResult.data.map((summary) => ({
      domain: summary.domain,
      completedCount: Number(summary.metadata?.completedCount ?? 0),
      pendingCount: Number(summary.metadata?.pendingCount ?? 0),
      overdueCount: Number(summary.metadata?.overdueCount ?? 0),
    }))

    return adapterOk(trackers, availability)
  }

  readOutstandingItems(scope: AdapterScope): AdapterResult<readonly AdapterOutstandingItem[]> {
    const availability = resolveAdapterAvailability()
    if (availability === 'offline') {
      return mapRepositoryFailureResult(this.adapterId, 'Offline', 'Repository is offline.', 'offline')
    }

    const items: AdapterOutstandingItem[] = []

    const baitul = this.complianceRepository.loadBaitulMaal()
    if (!baitul.ok) {
      return mapRepositoryFailureResult(this.adapterId, baitul.error.code, baitul.error.message)
    }
    for (const record of baitul.data) {
      if (scope.karkunId && record.karkunId !== scope.karkunId) continue
      if (record.status === 'Pending') {
        items.push({
          domain: 'baitul_maal',
          itemKey: `${record.karkunId}:${record.monthKey}`,
          status: 'pending',
          karkunId: record.karkunId,
        })
      }
    }

    const ijtema = this.complianceRepository.loadIjtema()
    if (!ijtema.ok) {
      return mapRepositoryFailureResult(this.adapterId, ijtema.error.code, ijtema.error.message)
    }
    for (const record of ijtema.data) {
      if (scope.karkunId && record.karkunId !== scope.karkunId) continue
      if (record.status !== 'Present') {
        items.push({
          domain: 'ijtema',
          itemKey: `${record.karkunId}:${record.weekEndingDate}`,
          status: 'pending',
          karkunId: record.karkunId,
        })
      }
    }

    const portal = this.complianceRepository.loadJihPortal()
    if (!portal.ok) {
      return mapRepositoryFailureResult(this.adapterId, portal.error.code, portal.error.message)
    }
    for (const [karkunId, registration] of Object.entries(portal.data.registrations)) {
      if (scope.karkunId && karkunId !== scope.karkunId) continue
      if (registration.status !== 'Registered') {
        items.push({
          domain: 'jih_portal',
          itemKey: karkunId,
          status: 'pending',
          karkunId,
        })
      }
    }

    return adapterOk(items, availability)
  }

  private buildSummaries(
    scope: AdapterScope,
  ): AdapterResult<readonly AdapterComplianceSummary[]> {
    const availability = resolveAdapterAvailability()
    if (availability === 'offline') {
      return mapRepositoryFailureResult(this.adapterId, 'Offline', 'Repository is offline.', 'offline')
    }

    const summaries: AdapterComplianceSummary[] = []

    const baitul = this.complianceRepository.loadBaitulMaal()
    if (!baitul.ok) {
      return mapRepositoryFailureResult(this.adapterId, baitul.error.code, baitul.error.message)
    }
    const baitulScoped = baitul.data.filter(
      (record) => !scope.karkunId || record.karkunId === scope.karkunId,
    )
    const baitulPaid = baitulScoped.filter((record) => record.status === 'Paid').length
    const baitulPending = baitulScoped.filter((record) => record.status === 'Pending').length
    summaries.push({
      domain: 'baitul_maal' satisfies AdapterComplianceDomain,
      status: trackerStatus(baitulPaid, baitulPending, 0),
      metadata: {
        completedCount: baitulPaid,
        pendingCount: baitulPending,
        overdueCount: 0,
      },
    })

    const ijtema = this.complianceRepository.loadIjtema()
    if (!ijtema.ok) {
      return mapRepositoryFailureResult(this.adapterId, ijtema.error.code, ijtema.error.message)
    }
    const ijtemaScoped = ijtema.data.filter(
      (record) => !scope.karkunId || record.karkunId === scope.karkunId,
    )
    const ijtemaPresent = ijtemaScoped.filter((record) => record.status === 'Present').length
    const ijtemaPending = ijtemaScoped.length - ijtemaPresent
    summaries.push({
      domain: 'ijtema',
      status: trackerStatus(ijtemaPresent, ijtemaPending, 0),
      metadata: {
        completedCount: ijtemaPresent,
        pendingCount: ijtemaPending,
        overdueCount: 0,
      },
    })

    const portal = this.complianceRepository.loadJihPortal()
    if (!portal.ok) {
      return mapRepositoryFailureResult(this.adapterId, portal.error.code, portal.error.message)
    }
    const registrations = Object.entries(portal.data.registrations).filter(
      ([karkunId]) => !scope.karkunId || karkunId === scope.karkunId,
    )
    const registeredCount = registrations.filter(
      ([, registration]) => registration.status === 'Registered',
    ).length
    const pendingPortal = Math.max(registrations.length - registeredCount, 0)
    summaries.push({
      domain: 'jih_portal',
      status: trackerStatus(registeredCount, pendingPortal, 0),
      metadata: {
        completedCount: registeredCount,
        pendingCount: pendingPortal,
        overdueCount: 0,
      },
    })

    return adapterOk(summaries, availability)
  }
}
