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
import type { PendingConfirmation } from '../ConversationTypes'
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
}

/**
 * Bridge interface consumed by ConversationEngine — engine never sees providers.
 */
export interface ContextManagerBridge {
  provideContextFor(consumer: ConversationContextConsumer): ContextSnapshot
}

export class ContextManager implements ContextManagerBridge {
  private readonly resolver: ContextResolver
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
    this.navigation = options.initialNavigation ?? { currentView: 'unknown' }
    this.baseConversation = createEmptyConversationContext(options.initialConversation)
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
