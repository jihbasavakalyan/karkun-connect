/**
 * Adapter registry (KC-004 Sprint 1.5).
 *
 * Purpose: Register and discover repository adapters without Conversation Engine coupling.
 * Repository dependency: None — holds adapter contracts only.
 * Future extensions: Bootstrap registers concrete adapters from an integration module.
 * Capability support: Aggregate availability/capability reports for Knowledge Manager.
 * Error mapping: Unavailable adapters reported via AdapterAvailability, not exceptions.
 */

import type { CampaignAdapter } from './CampaignAdapter'
import type { ComplianceAdapter } from './ComplianceAdapter'
import type { KarkunAdapter } from './KarkunAdapter'
import type { MeetingAdapter } from './MeetingAdapter'
import type { ReportAdapter } from './ReportAdapter'
import type { RepositoryAdapter } from './RepositoryAdapter'
import type {
  AdapterAvailability,
  AdapterCapabilities,
  AdapterId,
} from './AdapterTypes'

export type RegisteredDomainAdapter =
  | CampaignAdapter
  | KarkunAdapter
  | MeetingAdapter
  | ComplianceAdapter
  | ReportAdapter
  | RepositoryAdapter

export type AdapterAvailabilityReport = {
  byAdapter: Readonly<Partial<Record<AdapterId, AdapterAvailability>>>
  unavailableAdapters: readonly AdapterId[]
  degradedAdapters: readonly AdapterId[]
}

export type AdapterCapabilityReport = {
  byAdapter: Readonly<Partial<Record<AdapterId, AdapterCapabilities>>>
}

/**
 * AdapterRegistry — discover adapters for Knowledge Manager orchestration.
 *
 * Conversation Engine never accesses adapters directly.
 */
export class AdapterRegistry {
  private readonly adapters = new Map<AdapterId, RepositoryAdapter>()

  register(adapter: RepositoryAdapter): () => void {
    this.adapters.set(adapter.adapterId, adapter)
    return () => {
      this.adapters.delete(adapter.adapterId)
    }
  }

  unregister(adapterId: AdapterId): void {
    this.adapters.delete(adapterId)
  }

  get(adapterId: AdapterId): RepositoryAdapter | undefined {
    return this.adapters.get(adapterId)
  }

  getCampaignAdapter(): CampaignAdapter | undefined {
    const adapter = this.adapters.get('campaign')
    return adapter?.adapterId === 'campaign' ? (adapter as CampaignAdapter) : undefined
  }

  getKarkunAdapter(): KarkunAdapter | undefined {
    const adapter = this.adapters.get('karkun')
    return adapter?.adapterId === 'karkun' ? (adapter as KarkunAdapter) : undefined
  }

  getMeetingAdapter(): MeetingAdapter | undefined {
    const adapter = this.adapters.get('meeting')
    return adapter?.adapterId === 'meeting' ? (adapter as MeetingAdapter) : undefined
  }

  getComplianceAdapter(): ComplianceAdapter | undefined {
    const adapter = this.adapters.get('compliance')
    return adapter?.adapterId === 'compliance'
      ? (adapter as ComplianceAdapter)
      : undefined
  }

  getReportAdapter(): ReportAdapter | undefined {
    const adapter = this.adapters.get('report')
    return adapter?.adapterId === 'report' ? (adapter as ReportAdapter) : undefined
  }

  getRegisteredAdapterIds(): readonly AdapterId[] {
    return [...this.adapters.keys()]
  }

  getAll(): readonly RepositoryAdapter[] {
    return [...this.adapters.values()]
  }

  reportAvailability(): AdapterAvailabilityReport {
    const byAdapter: Partial<Record<AdapterId, AdapterAvailability>> = {}
    const unavailableAdapters: AdapterId[] = []
    const degradedAdapters: AdapterId[] = []

    for (const adapter of this.adapters.values()) {
      const availability = adapter.getAvailability()
      byAdapter[adapter.adapterId] = availability
      if (availability === 'unavailable' || availability === 'offline') {
        unavailableAdapters.push(adapter.adapterId)
      }
      if (availability === 'degraded' || availability === 'readonly') {
        degradedAdapters.push(adapter.adapterId)
      }
    }

    return { byAdapter, unavailableAdapters, degradedAdapters }
  }

  reportCapabilities(): AdapterCapabilityReport {
    const byAdapter: Partial<Record<AdapterId, AdapterCapabilities>> = {}
    for (const adapter of this.adapters.values()) {
      byAdapter[adapter.adapterId] = adapter.getCapabilities()
    }
    return { byAdapter }
  }
}

export function createAdapterRegistry(): AdapterRegistry {
  return new AdapterRegistry()
}

/**
 * Bridge surface for Knowledge Manager — engine never sees individual adapters.
 */
export interface AdapterRegistryBridge {
  getCampaignAdapter(): CampaignAdapter | undefined
  getKarkunAdapter(): KarkunAdapter | undefined
  getMeetingAdapter(): MeetingAdapter | undefined
  getComplianceAdapter(): ComplianceAdapter | undefined
  getReportAdapter(): ReportAdapter | undefined
  reportAvailability(): AdapterAvailabilityReport
  reportCapabilities(): AdapterCapabilityReport
  getRegisteredAdapterIds(): readonly AdapterId[]
}
