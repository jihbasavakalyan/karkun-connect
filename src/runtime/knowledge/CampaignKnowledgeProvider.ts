/**
 * Live CampaignKnowledgeProvider (KC-005 Sprint 2.2).
 *
 * Receives CampaignAdapter → maps live campaign data → KnowledgeProviderContribution.
 */

import type {
  CampaignKnowledgeProvider as CampaignKnowledgeProviderContract,
  KnowledgeProviderContribution,
  KnowledgeRequest,
} from '@/conversation/knowledge'
import type { CampaignAdapter } from '@/conversation/adapters'
import { contributionFromAdapterResults, scopeFromRequest } from './knowledgeProviderHelpers'

export class CampaignKnowledgeProvider implements CampaignKnowledgeProviderContract {
  readonly providerId = 'campaign' as const
  readonly supportedDomains = ['campaign'] as const
  readonly priority = 100

  private readonly campaignAdapter: CampaignAdapter

  constructor(campaignAdapter: CampaignAdapter) {
    this.campaignAdapter = campaignAdapter
  }

  provide(request: KnowledgeRequest): KnowledgeProviderContribution {
    const scope = scopeFromRequest(request)
    const current = this.campaignAdapter.readCurrentCampaign(scope)
    const status = this.campaignAdapter.readCampaignStatus(scope)
    const programme = this.campaignAdapter.readTodaysProgramme(scope)
    const summary = this.campaignAdapter.readCampaignSummary(scope)

    return contributionFromAdapterResults(
      this.providerId,
      'campaign',
      this.priority,
      'adapter:campaign',
      [current, status, programme, summary],
      () => ({
        currentCampaign: current.ok ? current.data : null,
        campaignStatus: status.ok ? status.data : null,
        todaysProgramme: programme.ok ? programme.data : null,
        campaignSummary: summary.ok ? summary.data : null,
        errors: [current, status, programme, summary]
          .filter((result) => !result.ok)
          .map((result) => result.error.code),
      }),
    )
  }
}
