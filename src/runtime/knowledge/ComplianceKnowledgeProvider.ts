/**
 * Live ComplianceKnowledgeProvider (KC-005 Sprint 2.2).
 */

import type { ComplianceAdapter } from '@/conversation/adapters'
import type {
  ComplianceKnowledgeProvider as ComplianceKnowledgeProviderContract,
  KnowledgeProviderContribution,
  KnowledgeRequest,
} from '@/conversation/knowledge'
import { contributionFromAdapterResults, scopeFromRequest } from './knowledgeProviderHelpers'

export class ComplianceKnowledgeProvider implements ComplianceKnowledgeProviderContract {
  readonly providerId = 'compliance' as const
  readonly supportedDomains = ['compliance'] as const
  readonly priority = 90

  private readonly complianceAdapter: ComplianceAdapter

  constructor(complianceAdapter: ComplianceAdapter) {
    this.complianceAdapter = complianceAdapter
  }

  provide(request: KnowledgeRequest): KnowledgeProviderContribution {
    const scope = scopeFromRequest(request)
    const summaries = this.complianceAdapter.readComplianceSummaries(scope)
    const trackers = this.complianceAdapter.readTrackerStatus(scope)
    const outstanding = this.complianceAdapter.readOutstandingItems(scope)

    return contributionFromAdapterResults(
      this.providerId,
      'compliance',
      this.priority,
      'adapter:compliance',
      [summaries, trackers, outstanding],
      () => ({
        complianceSummaries: summaries.ok ? summaries.data : [],
        trackerStatus: trackers.ok ? trackers.data : [],
        outstandingItems: outstanding.ok ? outstanding.data : [],
        errors: [summaries, trackers, outstanding]
          .filter((result) => !result.ok)
          .map((result) => result.error.code),
      }),
    )
  }
}
