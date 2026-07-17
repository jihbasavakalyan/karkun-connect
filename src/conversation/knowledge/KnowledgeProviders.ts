/**
 * Knowledge provider contracts (KC-004 Sprint 1.2).
 *
 * Purpose: Define how adapters supply domain knowledge without embedding repository logic here.
 * Ownership: Each provider owns retrieval for its slice; Knowledge Manager orchestrates only.
 * Future implementations: RepositoryKnowledgeProvider wraps campaign and connection repositories.
 * Extension points: Add domain-specific providers without changing KnowledgeManager core.
 */

import type {
  KnowledgeDomain,
  KnowledgeProviderContribution,
  KnowledgeProviderId,
  KnowledgeRequest,
} from './KnowledgeTypes'

/**
 * Base contract for all knowledge providers.
 *
 * Purpose: Return partial domain knowledge with availability and confidence metadata.
 * Typical usage: Registered on KnowledgeManager at application bootstrap.
 */
export interface KnowledgeProvider {
  readonly providerId: KnowledgeProviderId
  readonly supportedDomains: readonly KnowledgeDomain[]
  readonly priority: number
  provide(request: KnowledgeRequest): KnowledgeProviderContribution | Promise<KnowledgeProviderContribution>
}

/** Supplies campaign domain knowledge — active campaign identity and day context. */
export interface CampaignKnowledgeProvider extends KnowledgeProvider {
  readonly providerId: 'campaign'
  readonly supportedDomains: readonly ['campaign']
}

/** Supplies meeting domain knowledge — schedule and visit focus. */
export interface MeetingKnowledgeProvider extends KnowledgeProvider {
  readonly providerId: 'meeting'
  readonly supportedDomains: readonly ['meeting']
}

/**
 * Supplies karkun domain knowledge — registry posture for Connected Karkuns.
 * Named WorkerKnowledgeProvider per KC-004 sprint contract; domain is `karkun`.
 */
export interface WorkerKnowledgeProvider extends KnowledgeProvider {
  readonly providerId: 'worker'
  readonly supportedDomains: readonly ['karkun']
}

/**
 * Reserved: multi-domain repository-backed knowledge (Phase 2).
 * May supply campaign, connection, execution, compliance, and related domains.
 */
export interface RepositoryKnowledgeProvider extends KnowledgeProvider {
  readonly providerId: 'repository'
}

/** Supplies communication domain knowledge — templates and channel posture. */
export interface CommunicationKnowledgeProvider extends KnowledgeProvider {
  readonly providerId: 'communication'
  readonly supportedDomains: readonly ['communication']
}

/** Reserved: AI-inferred context that never overrides repository truth. */
export interface FutureAIKnowledgeProvider extends KnowledgeProvider {
  readonly providerId: 'future_ai'
  readonly supportedDomains: readonly ['future_ai']
}

/** Supplies compliance domain knowledge — summaries and outstanding items. */
export interface ComplianceKnowledgeProvider extends KnowledgeProvider {
  readonly providerId: 'compliance'
  readonly supportedDomains: readonly ['compliance']
}

/** Supplies reports domain knowledge — dashboard and progress metrics. */
export interface ReportKnowledgeProvider extends KnowledgeProvider {
  readonly providerId: 'report'
  readonly supportedDomains: readonly ['reports']
}

export function createKnowledgeProviderContribution(
  providerId: KnowledgeProviderId,
  domain: KnowledgeDomain,
  priority: number,
  availability: KnowledgeProviderContribution['availability'],
  confidence: KnowledgeProviderContribution['confidence'],
  sourceIdentifier: string,
  payload: KnowledgeProviderContribution['payload'],
): KnowledgeProviderContribution {
  return {
    providerId,
    domain,
    priority,
    availability,
    confidence,
    sourceIdentifier,
    payload,
    timestamp: Date.now(),
  }
}
