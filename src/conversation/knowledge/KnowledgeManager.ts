/**
 * Knowledge Manager — orchestrate knowledge retrieval abstraction (KC-004 Sprint 1.2).
 *
 * Purpose: Answer "what information is available for this conversation?"
 * Ownership: Knowledge requests, aggregation, snapshots, availability — not persistence.
 * Future implementations: RepositoryKnowledgeProvider registered at app bootstrap.
 * Extension points: Context Manager forwards requests; Engine never sees provider origins.
 */

import type { ConversationContext } from '../ConversationContext'
import type { CommunicationPlan, CommunicationRequest } from '../communication'
import type { GuidanceBundle, GuidanceEngineBridge, GuidanceRequest } from '../guidance'
import type { KnowledgeProvider } from './KnowledgeProviders'
import { KnowledgeResolver, createKnowledgeResolver } from './KnowledgeResolver'
import type { KnowledgeResolutionResult } from './KnowledgeResolver'
import { KnowledgeBundleSnapshot } from './KnowledgeSnapshot'
import type {
  KnowledgeDomain,
  KnowledgeProviderContribution,
  KnowledgeProviderId,
  KnowledgeRequest,
} from './KnowledgeTypes'

export type KnowledgeManagerOptions = {
  resolver?: KnowledgeResolver
  /** Injected guidance assembly — Knowledge Manager forwards; Engine never sees policies. */
  guidanceManager?: GuidanceEngineBridge
}

/**
 * Bridge consumed by Context Manager — Conversation Engine never accesses providers.
 */
export interface KnowledgeManagerBridge {
  requestKnowledge(request: KnowledgeRequest): KnowledgeBundleSnapshot
  requestGuidance?(request: GuidanceRequest): GuidanceBundle | null
  composeCommunication?(request: CommunicationRequest): CommunicationPlan | null
  getLatestBundle?(): KnowledgeBundleSnapshot | null
}

let requestCounter = 0

function createRequestId(): string {
  requestCounter += 1
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `know_${crypto.randomUUID()}`
  }
  return `know_${Date.now()}_${requestCounter}`
}

export class KnowledgeManager implements KnowledgeManagerBridge {
  private readonly resolver: KnowledgeResolver
  private readonly guidanceManager?: GuidanceEngineBridge
  private readonly providers = new Map<KnowledgeProviderId, KnowledgeProvider>()
  private snapshotVersion = 1
  private latestBundle: KnowledgeBundleSnapshot | null = null

  constructor(options: KnowledgeManagerOptions = {}) {
    this.resolver = options.resolver ?? createKnowledgeResolver()
    this.guidanceManager = options.guidanceManager
  }

  hasGuidanceManager(): boolean {
    return this.guidanceManager !== undefined
  }

  registerProvider(provider: KnowledgeProvider): () => void {
    this.providers.set(provider.providerId, provider)
    return () => {
      this.providers.delete(provider.providerId)
    }
  }

  unregisterProvider(providerId: KnowledgeProviderId): void {
    this.providers.delete(providerId)
  }

  getRegisteredProviderIds(): readonly KnowledgeProviderId[] {
    return [...this.providers.keys()]
  }

  getLatestBundle(): KnowledgeBundleSnapshot | null {
    return this.latestBundle
  }

  getLastResolution(): KnowledgeResolutionResult | null {
    if (!this.latestBundle) return null
    return {
      bundle: this.latestBundle,
      availability: this.latestBundle.getAvailability(),
      confidence: this.latestBundle.getConfidence(),
      conflicts: this.latestBundle.getConflicts(),
    }
  }

  requestKnowledge(request: KnowledgeRequest): KnowledgeBundleSnapshot {
    const contributions = [...this.providers.values()]
      .filter((provider) =>
        provider.supportedDomains.some((domain) => request.domains.includes(domain)),
      )
      .map((provider) => {
        const result = provider.provide(request)
        if (result instanceof Promise) {
          throw new Error(
            `Knowledge provider "${provider.providerId}" returned a Promise. Use requestKnowledgeAsync instead.`,
          )
        }
        return result
      })

    return this.resolveFromContributions(request, contributions)
  }

  async requestKnowledgeAsync(request: KnowledgeRequest): Promise<KnowledgeBundleSnapshot> {
    const matchingProviders = [...this.providers.values()].filter((provider) =>
      provider.supportedDomains.some((domain) => request.domains.includes(domain)),
    )

    const contributions = await Promise.all(
      matchingProviders.map((provider) => provider.provide(request)),
    )

    return this.resolveFromContributions(request, contributions)
  }

  requestKnowledgeForContext(
    domains: readonly KnowledgeDomain[],
    conversationContext: ConversationContext,
    sessionId?: string,
  ): KnowledgeBundleSnapshot {
    return this.requestKnowledge({
      domains,
      conversationContext,
      sessionId,
    })
  }

  requestGuidance(request: GuidanceRequest): GuidanceBundle | null {
    if (!this.guidanceManager) return null
    return this.guidanceManager.generateGuidance(request)
  }

  composeCommunication(request: CommunicationRequest): CommunicationPlan | null {
    if (!this.guidanceManager?.composeCommunication) return null
    return this.guidanceManager.composeCommunication(request)
  }

  private resolveFromContributions(
    request: KnowledgeRequest,
    contributions: KnowledgeProviderContribution[],
  ): KnowledgeBundleSnapshot {
    this.snapshotVersion += 1

    const result = this.resolver.resolve({
      request,
      contributions,
      requestId: createRequestId(),
      snapshotVersion: this.snapshotVersion,
    })

    this.latestBundle = result.bundle
    return result.bundle
  }
}

export function createKnowledgeManager(options?: KnowledgeManagerOptions): KnowledgeManager {
  return new KnowledgeManager(options)
}
