/**
 * Live KarkunKnowledgeProvider (KC-005 Sprint 2.2).
 *
 * Implements WorkerKnowledgeProvider contract (providerId: worker, domain: karkun).
 */

import type { KarkunAdapter } from '@/conversation/adapters'
import type {
  KnowledgeProviderContribution,
  KnowledgeRequest,
  WorkerKnowledgeProvider,
} from '@/conversation/knowledge'
import { contributionFromAdapterResults, scopeFromRequest } from './knowledgeProviderHelpers'

export class KarkunKnowledgeProvider implements WorkerKnowledgeProvider {
  readonly providerId = 'worker' as const
  readonly supportedDomains = ['karkun'] as const
  readonly priority = 100

  private readonly karkunAdapter: KarkunAdapter

  constructor(karkunAdapter: KarkunAdapter) {
    this.karkunAdapter = karkunAdapter
  }

  provide(request: KnowledgeRequest): KnowledgeProviderContribution {
    const scope = scopeFromRequest(request)
    const karkunId = scope.karkunId

    const assigned = this.karkunAdapter.lookupAssignedKarkuns(scope)
    const profile = karkunId
      ? this.karkunAdapter.lookupKarkun(karkunId, scope)
      : null
    const journey = karkunId
      ? this.karkunAdapter.lookupJourneyStatus(karkunId, scope)
      : null
    const connection = karkunId
      ? this.karkunAdapter.lookupConnectionInfo(karkunId, scope)
      : null

    const results = [
      assigned,
      ...(profile ? [profile] : []),
      ...(journey ? [journey] : []),
      ...(connection ? [connection] : []),
    ]

    return contributionFromAdapterResults(
      this.providerId,
      'karkun',
      this.priority,
      'adapter:karkun',
      results,
      () => ({
        assignedKarkuns: assigned.ok ? assigned.data : [],
        karkunProfile: profile?.ok ? profile.data : null,
        journeyStatus: journey?.ok ? journey.data : null,
        connectionInfo: connection?.ok ? connection.data : null,
        errors: results
          .filter((result) => !result.ok)
          .map((result) => result.error.code),
      }),
    )
  }
}
