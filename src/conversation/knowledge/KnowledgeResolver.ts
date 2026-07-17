/**
 * Knowledge resolution — aggregation, normalization, availability, confidence (KC-004 Sprint 1.2).
 *
 * Purpose: Merge provider contributions into immutable domain and bundle snapshots.
 * Ownership: Stateless resolver; Knowledge Manager invokes on each request.
 * Future implementations: Repository provider contributions merged at highest priority.
 * Extension points: Domain-specific merge strategies when payload schemas stabilize.
 */

import {
  KnowledgeBundleSnapshot,
} from './KnowledgeSnapshot'
import type { KnowledgeBundleSnapshotData, KnowledgeSnapshotData } from './KnowledgeSnapshot'
import type {
  KnowledgeAvailability,
  KnowledgeAvailabilityReport,
  KnowledgeConfidenceLevel,
  KnowledgeConfidenceReport,
  KnowledgeConflictRecord,
  KnowledgeDomain,
  KnowledgeProviderContribution,
  KnowledgeProviderId,
  KnowledgeRequest,
  DomainKnowledgePayload,
} from './KnowledgeTypes'

export type KnowledgeResolutionInput = {
  request: KnowledgeRequest
  contributions: readonly KnowledgeProviderContribution[]
  requestId: string
  snapshotVersion: number
}

export type KnowledgeResolutionResult = {
  bundle: KnowledgeBundleSnapshot
  availability: KnowledgeAvailabilityReport
  confidence: KnowledgeConfidenceReport
  conflicts: readonly KnowledgeConflictRecord[]
}

const CONFIDENCE_RANK: Record<KnowledgeConfidenceLevel, number> = {
  high: 4,
  medium: 3,
  low: 2,
  none: 1,
}

const AVAILABILITY_RANK: Record<KnowledgeAvailability, number> = {
  available: 4,
  partial: 3,
  deferred: 2,
  unavailable: 1,
}

function sortContributions(
  contributions: readonly KnowledgeProviderContribution[],
): KnowledgeProviderContribution[] {
  return [...contributions].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    return b.timestamp - a.timestamp
  })
}

function pickLowerConfidence(
  current: KnowledgeConfidenceLevel,
  next: KnowledgeConfidenceLevel,
): KnowledgeConfidenceLevel {
  return CONFIDENCE_RANK[next] < CONFIDENCE_RANK[current] ? next : current
}

function pickLowerAvailability(
  current: KnowledgeAvailability,
  next: KnowledgeAvailability,
): KnowledgeAvailability {
  return AVAILABILITY_RANK[next] < AVAILABILITY_RANK[current] ? next : current
}

function mergePayload(
  winner: DomainKnowledgePayload,
  loser: DomainKnowledgePayload,
  fieldPath: string,
  domain: KnowledgeDomain,
  winnerId: KnowledgeProviderId,
  loserId: KnowledgeProviderId,
  conflicts: KnowledgeConflictRecord[],
): DomainKnowledgePayload {
  const overlappingKeys = Object.keys(loser).filter((key) => key in winner)
  if (overlappingKeys.length > 0) {
    conflicts.push({
      domain,
      fieldPath: fieldPath || overlappingKeys.join(','),
      winnerProviderId: winnerId,
      loserProviderIds: [loserId],
    })
  }
  return { ...loser, ...winner }
}

function aggregateConfidence(
  byDomain: Readonly<Partial<Record<KnowledgeDomain, KnowledgeConfidenceLevel>>>,
  requestedDomains: readonly KnowledgeDomain[],
): KnowledgeConfidenceLevel {
  const levels = requestedDomains
    .map((domain) => byDomain[domain] ?? 'none')
  if (levels.length === 0) return 'none'
  return levels.reduce((aggregate, level) => pickLowerConfidence(aggregate, level))
}

function buildAvailabilityReport(
  byDomain: Readonly<Partial<Record<KnowledgeDomain, KnowledgeAvailability>>>,
  requestedDomains: readonly KnowledgeDomain[],
): KnowledgeAvailabilityReport {
  const unavailableDomains = requestedDomains.filter(
    (domain) => (byDomain[domain] ?? 'unavailable') === 'unavailable',
  )
  const partialDomains = requestedDomains.filter(
    (domain) => byDomain[domain] === 'partial',
  )
  return {
    byDomain,
    unavailableDomains,
    partialDomains,
  }
}

function normalizeContribution(
  contribution: KnowledgeProviderContribution,
  snapshotVersion: number,
): KnowledgeSnapshotData {
  return {
    domain: contribution.domain,
    timestamp: contribution.timestamp,
    availability: contribution.availability,
    confidence: contribution.confidence,
    sourceIdentifier: contribution.sourceIdentifier,
    snapshotVersion,
    payload: { ...contribution.payload },
  }
}

export class KnowledgeResolver {
  resolve(input: KnowledgeResolutionInput): KnowledgeResolutionResult {
    const requestedDomains = [...new Set(input.request.domains)]
    const relevant = sortContributions(
      input.contributions.filter((contribution) =>
        requestedDomains.includes(contribution.domain),
      ),
    )

    const conflicts: KnowledgeConflictRecord[] = []
    const domainWinners = new Map<
      KnowledgeDomain,
      { snapshot: KnowledgeSnapshotData; providerId: KnowledgeProviderId }
    >()
    const availabilityByDomain: Partial<Record<KnowledgeDomain, KnowledgeAvailability>> = {}
    const confidenceByDomain: Partial<Record<KnowledgeDomain, KnowledgeConfidenceLevel>> = {}

    for (const domain of requestedDomains) {
      availabilityByDomain[domain] = 'unavailable'
      confidenceByDomain[domain] = 'none'
    }

    for (const contribution of relevant) {
      const domain = contribution.domain
      const existing = domainWinners.get(domain)

      if (!existing) {
        domainWinners.set(domain, {
          snapshot: normalizeContribution(contribution, input.snapshotVersion),
          providerId: contribution.providerId,
        })
        availabilityByDomain[domain] = contribution.availability
        confidenceByDomain[domain] = contribution.confidence
        continue
      }

      const mergedPayload = mergePayload(
        contribution.payload,
        existing.snapshot.payload,
        domain,
        domain,
        contribution.providerId,
        existing.providerId,
        conflicts,
      )

      domainWinners.set(domain, {
        snapshot: {
          ...normalizeContribution(contribution, input.snapshotVersion),
          payload: mergedPayload,
          availability: pickLowerAvailability(
            existing.snapshot.availability,
            contribution.availability,
          ),
          confidence: pickLowerConfidence(
            existing.snapshot.confidence,
            contribution.confidence,
          ),
          sourceIdentifier: contribution.sourceIdentifier,
        },
        providerId: contribution.providerId,
      })

      availabilityByDomain[domain] = pickLowerAvailability(
        availabilityByDomain[domain] ?? 'unavailable',
        contribution.availability,
      )
      confidenceByDomain[domain] = pickLowerConfidence(
        confidenceByDomain[domain] ?? 'none',
        contribution.confidence,
      )
    }

    const snapshots = requestedDomains
      .map((domain) => domainWinners.get(domain)?.snapshot)
      .filter((snapshot): snapshot is KnowledgeSnapshotData => snapshot !== undefined)

    const availability = buildAvailabilityReport(availabilityByDomain, requestedDomains)
    const confidence: KnowledgeConfidenceReport = {
      byDomain: confidenceByDomain,
      aggregate: aggregateConfidence(confidenceByDomain, requestedDomains),
    }

    const bundleData: KnowledgeBundleSnapshotData = {
      metadata: {
        requestId: input.requestId,
        resolvedAt: Date.now(),
        snapshotVersion: input.snapshotVersion,
        providerCount: relevant.length,
        requestedDomains,
        availability,
        confidence,
        conflicts,
      },
      snapshots,
    }

    return {
      bundle: KnowledgeBundleSnapshot.create(bundleData),
      availability,
      confidence,
      conflicts,
    }
  }
}

export function createKnowledgeResolver(): KnowledgeResolver {
  return new KnowledgeResolver()
}
