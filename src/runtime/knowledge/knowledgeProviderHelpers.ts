/**
 * Shared helpers for live knowledge providers (KC-005 Sprint 2.2).
 */

import type {
  AdapterAvailability,
  AdapterResult,
  AdapterScope,
} from '@/conversation/adapters'
import {
  createKnowledgeProviderContribution,
  type DomainKnowledgePayload,
  type KnowledgeAvailability,
  type KnowledgeConfidenceLevel,
  type KnowledgeDomain,
  type KnowledgeProviderContribution,
  type KnowledgeProviderId,
  type KnowledgeRequest,
} from '@/conversation/knowledge'

export function scopeFromRequest(request: KnowledgeRequest): AdapterScope {
  const filters = request.filters ?? {}
  const context = request.conversationContext

  return {
    sessionId: request.sessionId,
    campaignId:
      (typeof filters.campaignId === 'string' ? filters.campaignId : undefined) ??
      context?.currentCampaign?.campaignId,
    karkunId:
      (typeof filters.karkunId === 'string' ? filters.karkunId : undefined) ??
      context?.currentKarkun?.karkunId,
    ruknId:
      (typeof filters.ruknId === 'string' ? filters.ruknId : undefined) ??
      (context?.currentRole === 'rukn' ? context.currentUser?.id : undefined),
  }
}

export function mapAdapterAvailability(
  availability: AdapterAvailability,
): KnowledgeAvailability {
  switch (availability) {
    case 'available':
    case 'readonly':
      return 'available'
    case 'degraded':
      return 'partial'
    case 'offline':
      return 'deferred'
    case 'unavailable':
    default:
      return 'unavailable'
  }
}

export function confidenceForAvailability(
  availability: KnowledgeAvailability,
): KnowledgeConfidenceLevel {
  switch (availability) {
    case 'available':
      return 'high'
    case 'partial':
      return 'medium'
    case 'deferred':
      return 'low'
    case 'unavailable':
    default:
      return 'none'
  }
}

function freezePayload(payload: DomainKnowledgePayload): DomainKnowledgePayload {
  return Object.freeze({ ...payload })
}

export function contributionFromAdapterResults(
  providerId: KnowledgeProviderId,
  domain: KnowledgeDomain,
  priority: number,
  sourceIdentifier: string,
  results: readonly AdapterResult<unknown>[],
  buildPayload: () => DomainKnowledgePayload,
): KnowledgeProviderContribution {
  const failed = results.filter((result) => !result.ok)
  const succeeded = results.filter((result) => result.ok)

  let knowledgeAvailability: KnowledgeAvailability
  if (succeeded.length === 0) {
    knowledgeAvailability = mapAdapterAvailability(
      failed[0]?.availability ?? 'unavailable',
    )
    if (knowledgeAvailability === 'available') {
      knowledgeAvailability = 'unavailable'
    }
  } else if (failed.length > 0) {
    knowledgeAvailability = 'partial'
  } else {
    knowledgeAvailability = mapAdapterAvailability(succeeded[0]?.availability ?? 'available')
  }

  return createKnowledgeProviderContribution(
    providerId,
    domain,
    priority,
    knowledgeAvailability,
    confidenceForAvailability(knowledgeAvailability),
    sourceIdentifier,
    freezePayload(buildPayload()),
  )
}
