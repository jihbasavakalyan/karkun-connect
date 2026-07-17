/**
 * RepositoryAdapterFactory (KC-005 Sprint 2.1).
 *
 * Purpose: Construct concrete adapters, inject repositories, register with AdapterRegistry.
 * Ownership: Runtime bootstrap only — no business logic.
 */

import {
  createAdapterRegistry,
  type AdapterRegistry,
} from '@/conversation/adapters'
import type { RepositoryBundle } from '@/repositories'
import { CampaignRepositoryAdapter } from './CampaignRepositoryAdapter'
import { ComplianceRepositoryAdapter } from './ComplianceRepositoryAdapter'
import { KarkunRepositoryAdapter } from './KarkunRepositoryAdapter'
import { MeetingRepositoryAdapter } from './MeetingRepositoryAdapter'
import { ReportRepositoryAdapter } from './ReportRepositoryAdapter'

export type RepositoryAdapterSet = {
  campaign: CampaignRepositoryAdapter
  karkun: KarkunRepositoryAdapter
  meeting: MeetingRepositoryAdapter
  compliance: ComplianceRepositoryAdapter
  report: ReportRepositoryAdapter
}

/**
 * Construct concrete adapters from an existing repository bundle.
 */
export function createRepositoryAdapters(
  repositories: RepositoryBundle,
): RepositoryAdapterSet {
  return {
    campaign: new CampaignRepositoryAdapter(repositories.campaign),
    karkun: new KarkunRepositoryAdapter(
      repositories.karkun,
      repositories.connection,
      repositories.execution,
    ),
    meeting: new MeetingRepositoryAdapter(repositories.execution),
    compliance: new ComplianceRepositoryAdapter(repositories.compliance),
    report: new ReportRepositoryAdapter(
      repositories.campaign,
      repositories.connection,
      repositories.execution,
    ),
  }
}

/**
 * Register concrete adapters on the given registry (or a new one).
 */
export function registerRepositoryAdapters(
  repositories: RepositoryBundle,
  registry: AdapterRegistry = createAdapterRegistry(),
): { registry: AdapterRegistry; adapters: RepositoryAdapterSet } {
  const adapters = createRepositoryAdapters(repositories)

  registry.register(adapters.campaign)
  registry.register(adapters.karkun)
  registry.register(adapters.meeting)
  registry.register(adapters.compliance)
  registry.register(adapters.report)

  return { registry, adapters }
}

export class RepositoryAdapterFactory {
  private readonly repositories: RepositoryBundle

  constructor(repositories: RepositoryBundle) {
    this.repositories = repositories
  }

  createAdapters(): RepositoryAdapterSet {
    return createRepositoryAdapters(this.repositories)
  }

  registerAll(registry: AdapterRegistry = createAdapterRegistry()): AdapterRegistry {
    return registerRepositoryAdapters(this.repositories, registry).registry
  }
}

export function createRepositoryAdapterFactory(
  repositories: RepositoryBundle,
): RepositoryAdapterFactory {
  return new RepositoryAdapterFactory(repositories)
}
