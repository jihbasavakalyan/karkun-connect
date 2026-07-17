/**
 * Knowledge Manager type definitions (KC-004 Sprint 1.2).
 *
 * Purpose: Typed knowledge domains, requests, and provider contributions.
 * Ownership: Knowledge Manager owns aggregation metadata — not authoritative domain data.
 * Future implementations: RepositoryKnowledgeProvider reads campaign, karkun, execution records.
 * Extension points: Add domain-specific payload schemas as Phase 2 typed bundles.
 */

import type { ConversationContext } from '../ConversationContext'

/** Independent knowledge domains per KC-003 Knowledge Model §2. */
export type KnowledgeDomain =
  | 'campaign'
  | 'rukn'
  | 'karkun'
  | 'connection'
  | 'meeting'
  | 'execution'
  | 'compliance'
  | 'reports'
  | 'communication'
  | 'administrator'
  | 'future_ai'

/** Whether knowledge for a domain can be supplied right now. */
export type KnowledgeAvailability = 'available' | 'partial' | 'unavailable' | 'deferred'

/** Confidence posture per KC-003 — never used to invent facts. */
export type KnowledgeConfidenceLevel = 'high' | 'medium' | 'low' | 'none'

export type KnowledgeProviderId =
  | 'campaign'
  | 'meeting'
  | 'worker'
  | 'repository'
  | 'communication'
  | 'future_ai'

/**
 * Request for knowledge aggregation — answers "what is known?" not "what is valid?"
 *
 * Purpose: Scope provider orchestration to relevant domains for the current conversation.
 * Typical usage: Context Manager passes conversation context when forwarding from Engine.
 */
export type KnowledgeRequest = {
  domains: readonly KnowledgeDomain[]
  sessionId?: string
  conversationContext?: ConversationContext
  filters?: Readonly<Record<string, unknown>>
}

/** Opaque per-domain payload — providers supply structure; resolver does not interpret business meaning. */
export type DomainKnowledgePayload = Readonly<Record<string, unknown>>

export type KnowledgeProviderContribution = {
  providerId: KnowledgeProviderId
  domain: KnowledgeDomain
  priority: number
  availability: KnowledgeAvailability
  confidence: KnowledgeConfidenceLevel
  sourceIdentifier: string
  payload: DomainKnowledgePayload
  timestamp: number
}

export type KnowledgeConflictRecord = {
  domain: KnowledgeDomain
  fieldPath: string
  winnerProviderId: KnowledgeProviderId
  loserProviderIds: readonly KnowledgeProviderId[]
}

export type KnowledgeAvailabilityReport = {
  byDomain: Readonly<Partial<Record<KnowledgeDomain, KnowledgeAvailability>>>
  unavailableDomains: readonly KnowledgeDomain[]
  partialDomains: readonly KnowledgeDomain[]
}

export type KnowledgeConfidenceReport = {
  byDomain: Readonly<Partial<Record<KnowledgeDomain, KnowledgeConfidenceLevel>>>
  aggregate: KnowledgeConfidenceLevel
}

export type KnowledgeBundleMetadata = {
  requestId: string
  resolvedAt: number
  snapshotVersion: number
  providerCount: number
  requestedDomains: readonly KnowledgeDomain[]
  availability: KnowledgeAvailabilityReport
  confidence: KnowledgeConfidenceReport
  conflicts: readonly KnowledgeConflictRecord[]
}
