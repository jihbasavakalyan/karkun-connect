/**
 * Context Manager — assemble, maintain, and expose conversation context (KC-004 Sprint 1.1).
 *
 * Purpose: Own ephemeral contextual information required for Digital Rafeeq conversations.
 * Ownership: Context slots listed in KC-003 §6 — not conversation lifecycle state.
 * Future provider examples: CampaignContextProvider, RepositoryContextProvider (via Knowledge Manager).
 * Extension notes: Register providers at bootstrap; engine receives context via DI only.
 */

import type { ConversationContext } from '../ConversationContext'
import { createEmptyConversationContext } from '../ConversationContext'
import type {
  CommunicationChannel,
  CommunicationPlan,
  LocalizationPreferences,
} from '../communication'
import type {
  KnowledgeBundleSnapshot,
  KnowledgeDomain,
  KnowledgeManagerBridge,
  KnowledgeRequest,
} from '../knowledge'
import type { GuidanceBundle, GuidanceCategory } from '../guidance'
import type { PendingConfirmation } from '../ConversationTypes'
import type { ConversationLifecycleState } from '../ConversationTypes'
import type { ContextProvider } from './ContextProviders'
import { ContextResolver, createContextResolver } from './ContextResolver'
import type { ContextResolutionResult } from './ContextResolver'
import { ContextSnapshot } from './ContextSnapshot'
import type {
  ConversationContextConsumer,
  ContextProviderContribution,
  ContextProviderId,
  NavigationContext,
  PendingActionContext,
  TransientSessionValues,
} from './ContextTypes'

export type ContextManagerOptions = {
  resolver?: ContextResolver
  initialNavigation?: NavigationContext
  initialConversation?: Partial<ConversationContext>
  /** Injected knowledge assembly — Context Manager forwards; Engine never sees providers. */
  knowledgeManager?: KnowledgeManagerBridge
}

/**
 * Bridge interface consumed by ConversationEngine — engine never sees providers.
 */
export interface ContextManagerBridge {
  provideContextFor(consumer: ConversationContextConsumer): ContextSnapshot
  requestKnowledge?(request: KnowledgeRequest): KnowledgeBundleSnapshot | null
  requestGuidance?(request: GuidanceOrchestrationRequest): GuidanceBundle | null
  requestCommunication?(request: CommunicationOrchestrationRequest): CommunicationPlan | null
}

/** Orchestration request assembled by Context Manager for the guidance chain. */
export type GuidanceOrchestrationRequest = {
  conversationState: ConversationLifecycleState
  pendingConfirmation?: PendingConfirmation | null
  knowledgeBundle?: KnowledgeBundleSnapshot | null
  knowledgeDomains?: readonly KnowledgeDomain[]
  suppressedCategories?: readonly GuidanceCategory[]
  sessionId?: string
}

/** Orchestration request for the full communication composition chain. */
export type CommunicationOrchestrationRequest = GuidanceOrchestrationRequest & {
  channel: CommunicationChannel
  localization?: LocalizationPreferences
  guidanceBundle?: GuidanceBundle | null
}

export class ContextManager implements ContextManagerBridge {
  private readonly resolver: ContextResolver
  private readonly knowledgeManager?: KnowledgeManagerBridge
  private readonly providers = new Map<ContextProviderId, ContextProvider>()
  private navigation: NavigationContext
  private baseConversation: ConversationContext
  private pendingAction: PendingActionContext | null = null
  private pendingConfirmation: PendingConfirmation | null = null
  private readonly transient = new Map<string, unknown>()
  private readonly extensions: Record<string, unknown> = {}
  private latestSnapshot: ContextSnapshot | null = null

  constructor(options: ContextManagerOptions = {}) {
    this.resolver = options.resolver ?? createContextResolver()
    this.knowledgeManager = options.knowledgeManager
    this.navigation = options.initialNavigation ?? { currentView: 'unknown' }
    this.baseConversation = createEmptyConversationContext(options.initialConversation)
  }

  hasKnowledgeManager(): boolean {
    return this.knowledgeManager !== undefined
  }

  registerProvider(provider: ContextProvider): () => void {
    this.providers.set(provider.providerId, provider)
    return () => {
      this.providers.delete(provider.providerId)
    }
  }

  unregisterProvider(providerId: ContextProviderId): void {
    this.providers.delete(providerId)
  }

  getRegisteredProviderIds(): readonly ContextProviderId[] {
    return [...this.providers.keys()]
  }

  setNavigation(navigation: NavigationContext): ContextSnapshot {
    this.navigation = navigation
    return this.resolveSnapshot()
  }

  getNavigation(): NavigationContext {
    return this.navigation
  }

  setObjective(objective: ConversationContext['currentObjective']): ContextSnapshot {
    this.baseConversation = {
      ...this.baseConversation,
      currentObjective: objective,
    }
    return this.resolveSnapshot()
  }

  setPendingAction(action: PendingActionContext | null): ContextSnapshot {
    this.pendingAction = action
    return this.resolveSnapshot()
  }

  setPendingConfirmation(confirmation: PendingConfirmation | null): ContextSnapshot {
    this.pendingConfirmation = confirmation
    return this.resolveSnapshot()
  }

  setTransient(key: string, value: unknown): ContextSnapshot {
    this.transient.set(key, value)
    return this.resolveSnapshot()
  }

  clearTransient(key?: string): ContextSnapshot {
    if (key === undefined) {
      this.transient.clear()
    } else {
      this.transient.delete(key)
    }
    return this.resolveSnapshot()
  }

  setExtension(key: string, value: unknown): ContextSnapshot {
    this.extensions[key] = value
    return this.resolveSnapshot()
  }

  updateBaseConversation(patch: Partial<ConversationContext>): ContextSnapshot {
    this.baseConversation = {
      ...this.baseConversation,
      ...patch,
      sessionMetadata: {
        ...this.baseConversation.sessionMetadata,
        ...patch.sessionMetadata,
        lastActivityAt: Date.now(),
      },
      extensions: {
        ...this.baseConversation.extensions,
        ...patch.extensions,
      },
    }
    return this.resolveSnapshot()
  }

  getLatestSnapshot(): ContextSnapshot | null {
    return this.latestSnapshot
  }

  async collectContributions(): Promise<ContextProviderContribution[]> {
    const contributions: ContextProviderContribution[] = []
    for (const provider of this.providers.values()) {
      const result = await provider.provide()
      contributions.push(result)
    }
    return contributions
  }

  resolveSnapshot(consumer?: ConversationContextConsumer): ContextSnapshot {
    const contributions = [...this.providers.values()].map((provider) => {
      const result = provider.provide()
      if (result instanceof Promise) {
        throw new Error(
          `Provider "${provider.providerId}" returned a Promise. Use resolveSnapshotAsync instead.`,
        )
      }
      return result
    })

    return this.resolveFromContributions(contributions, consumer)
  }

  async resolveSnapshotAsync(
    consumer?: ConversationContextConsumer,
  ): Promise<ContextSnapshot> {
    const contributions = await this.collectContributions()
    return this.resolveFromContributions(contributions, consumer)
  }

  provideContextFor(consumer: ConversationContextConsumer): ContextSnapshot {
    return this.syncToConsumer(consumer)
  }

  requestKnowledge(request: KnowledgeRequest): KnowledgeBundleSnapshot | null {
    if (!this.knowledgeManager) return null

    const contextSnapshot = this.latestSnapshot ?? this.resolveSnapshot()
    const conversationContext =
      request.conversationContext ?? contextSnapshot.getConversation()

    return this.knowledgeManager.requestKnowledge({
      ...request,
      conversationContext,
    })
  }

  requestGuidance(request: GuidanceOrchestrationRequest): GuidanceBundle | null {
    if (!this.knowledgeManager?.requestGuidance) return null

    const contextSnapshot = this.latestSnapshot ?? this.resolveSnapshot()
    const conversationContext = contextSnapshot.getConversation()

    const knowledgeBundle =
      request.knowledgeBundle ??
      (request.knowledgeDomains && request.knowledgeDomains.length > 0
        ? this.requestKnowledge({
            domains: request.knowledgeDomains,
            conversationContext,
            sessionId: request.sessionId,
          })
        : this.knowledgeManager.getLatestBundle?.() ?? null)

    return this.knowledgeManager.requestGuidance({
      conversationContext,
      conversationState: request.conversationState,
      pendingConfirmation: request.pendingConfirmation,
      knowledgeBundle: knowledgeBundle ?? undefined,
      sessionId: request.sessionId,
      suppressedCategories: request.suppressedCategories,
    })
  }

  requestCommunication(
    request: CommunicationOrchestrationRequest,
  ): CommunicationPlan | null {
    if (!this.knowledgeManager?.composeCommunication) return null

    const contextSnapshot = this.latestSnapshot ?? this.resolveSnapshot()
    const conversationContext = contextSnapshot.getConversation()

    const guidanceBundle =
      request.guidanceBundle ??
      this.requestGuidance({
        conversationState: request.conversationState,
        pendingConfirmation: request.pendingConfirmation,
        knowledgeBundle: request.knowledgeBundle,
        knowledgeDomains: request.knowledgeDomains,
        suppressedCategories: request.suppressedCategories,
        sessionId: request.sessionId,
      })

    if (!guidanceBundle) return null

    const localization: LocalizationPreferences = request.localization ?? {
      locale: conversationContext.sessionMetadata.locale ?? 'ur',
      fallbackLocale: 'en',
      script: 'arabic',
      formality: 'formal',
    }

    return this.knowledgeManager.composeCommunication({
      guidanceBundle,
      conversationContext,
      channel: request.channel,
      localization,
      sessionId: request.sessionId,
    })
  }

  syncToConsumer(consumer: ConversationContextConsumer): ContextSnapshot {
    const snapshot = this.resolveSnapshot(consumer)
    consumer.updateContext(snapshot.getConversation())
    return snapshot
  }

  async syncToConsumerAsync(
    consumer: ConversationContextConsumer,
  ): Promise<ContextSnapshot> {
    const snapshot = await this.resolveSnapshotAsync(consumer)
    consumer.updateContext(snapshot.getConversation())
    return snapshot
  }

  getLastResolution(): ContextResolutionResult | null {
    if (!this.latestSnapshot) return null
    return {
      snapshot: this.latestSnapshot,
      conversation: this.latestSnapshot.getConversation(),
      completeness: this.latestSnapshot.getMetadata().completeness,
      conflicts: this.latestSnapshot.getMetadata().conflicts,
    }
  }

  private resolveFromContributions(
    contributions: ContextProviderContribution[],
    consumer?: ConversationContextConsumer,
  ): ContextSnapshot {
    const engineConfirmation = consumer?.getPendingConfirmation() ?? null
    const engineContext = consumer?.getContext()

    const result = this.resolver.resolve({
      contributions,
      baseConversation: engineContext ?? this.baseConversation,
      navigation: this.navigation,
      transient: this.getTransientValues(),
      pendingConfirmation: this.pendingConfirmation ?? engineConfirmation,
      pendingAction: this.pendingAction,
      extensions: this.extensions,
    })

    this.latestSnapshot = result.snapshot
    this.baseConversation = result.conversation
    this.pendingConfirmation = result.snapshot.getPendingConfirmation()
    this.pendingAction = result.snapshot.getPendingAction()

    return result.snapshot
  }

  private getTransientValues(): TransientSessionValues {
    return Object.fromEntries(this.transient.entries())
  }
}

export function createContextManager(options?: ContextManagerOptions): ContextManager {
  return new ContextManager(options)
}
