/**
 * KnowledgeProviderFactory (KC-005 Sprint 2.2).
 *
 * Creates live knowledge providers, injects repository adapters, registers with KnowledgeManager.
 */

import type { KnowledgeManager } from '@/conversation/knowledge'
import type { RepositoryAdapterSet } from '@/runtime/adapters'
import { CampaignKnowledgeProvider } from './CampaignKnowledgeProvider'
import { ComplianceKnowledgeProvider } from './ComplianceKnowledgeProvider'
import { KarkunKnowledgeProvider } from './KarkunKnowledgeProvider'
import { MeetingKnowledgeProvider } from './MeetingKnowledgeProvider'
import { ReportKnowledgeProvider } from './ReportKnowledgeProvider'

export type LiveKnowledgeProviderSet = {
  campaign: CampaignKnowledgeProvider
  karkun: KarkunKnowledgeProvider
  meeting: MeetingKnowledgeProvider
  compliance: ComplianceKnowledgeProvider
  report: ReportKnowledgeProvider
}

export function createKnowledgeProviders(
  adapters: RepositoryAdapterSet,
): LiveKnowledgeProviderSet {
  return {
    campaign: new CampaignKnowledgeProvider(adapters.campaign),
    karkun: new KarkunKnowledgeProvider(adapters.karkun),
    meeting: new MeetingKnowledgeProvider(adapters.meeting),
    compliance: new ComplianceKnowledgeProvider(adapters.compliance),
    report: new ReportKnowledgeProvider(adapters.report),
  }
}

export function registerKnowledgeProviders(
  knowledgeManager: KnowledgeManager,
  adapters: RepositoryAdapterSet,
): LiveKnowledgeProviderSet {
  const providers = createKnowledgeProviders(adapters)

  knowledgeManager.registerProvider(providers.campaign)
  knowledgeManager.registerProvider(providers.karkun)
  knowledgeManager.registerProvider(providers.meeting)
  knowledgeManager.registerProvider(providers.compliance)
  knowledgeManager.registerProvider(providers.report)

  return providers
}

export class KnowledgeProviderFactory {
  private readonly adapters: RepositoryAdapterSet

  constructor(adapters: RepositoryAdapterSet) {
    this.adapters = adapters
  }

  createProviders(): LiveKnowledgeProviderSet {
    return createKnowledgeProviders(this.adapters)
  }

  registerAll(knowledgeManager: KnowledgeManager): LiveKnowledgeProviderSet {
    return registerKnowledgeProviders(knowledgeManager, this.adapters)
  }
}

export function createKnowledgeProviderFactory(
  adapters: RepositoryAdapterSet,
): KnowledgeProviderFactory {
  return new KnowledgeProviderFactory(adapters)
}
