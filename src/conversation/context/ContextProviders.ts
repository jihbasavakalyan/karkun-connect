/**
 * Context provider contracts (KC-004 Sprint 1.1).
 *
 * Purpose: Define how external adapters supply partial context without repository coupling here.
 * Ownership: Each provider owns its slice; Context Manager orchestrates merge via ContextResolver.
 * Future provider examples: RepositoryContextProvider, AiContextProvider, VoiceContextProvider.
 * Extension notes: Implement providers in integration layers — never inside Context Manager core.
 */

import type {
  ContextProviderContribution,
  ContextProviderId,
  ContextProviderPartial,
} from './ContextTypes'

/**
 * Base contract for all context providers.
 *
 * Purpose: Supply partial, non-authoritative context fragments.
 * Typical usage: Registered on ContextManager at app bootstrap.
 */
export interface ContextProvider {
  readonly providerId: ContextProviderId
  readonly priority: number
  provide(): ContextProviderContribution | Promise<ContextProviderContribution>
}

/** Supplies authenticated user identity and role scope. */
export interface UserContextProvider extends ContextProvider {
  readonly providerId: 'user'
}

/** Supplies active campaign day and campaign identity labels. */
export interface CampaignContextProvider extends ContextProvider {
  readonly providerId: 'campaign'
}

/** Supplies meeting or visit focus for the current segment. */
export interface MeetingContextProvider extends ContextProvider {
  readonly providerId: 'meeting'
}

/** Supplies current UI view and route parameters. */
export interface NavigationContextProvider extends ContextProvider {
  readonly providerId: 'navigation'
}

/** Supplies conversation-engine-local posture — objective, deferrals, confirmation hints. */
export interface ConversationContextProvider extends ContextProvider {
  readonly providerId: 'conversation'
}

/** Reserved: repository-backed facts via Knowledge Manager path (Phase 2). */
export interface RepositoryContextProvider extends ContextProvider {
  readonly providerId: 'repository'
}

/** Reserved: AI-inferred hints that never override repository truth. */
export interface AiContextProvider extends ContextProvider {
  readonly providerId: 'ai'
}

/** Reserved: notification-driven conversation entry context. */
export interface NotificationContextProvider extends ContextProvider {
  readonly providerId: 'notification'
}

/** Reserved: voice channel session metadata. */
export interface VoiceContextProvider extends ContextProvider {
  readonly providerId: 'voice'
}

/** Reserved: deep-link entry parameters. */
export interface DeepLinkContextProvider extends ContextProvider {
  readonly providerId: 'deep_link'
}

/** Reserved: offline cache posture indicators. */
export interface OfflineContextProvider extends ContextProvider {
  readonly providerId: 'offline'
}

export function createContextProviderContribution(
  providerId: ContextProviderId,
  priority: number,
  partial: ContextProviderPartial,
  confidence?: number,
): ContextProviderContribution {
  return {
    providerId,
    priority,
    partial,
    timestamp: Date.now(),
    confidence,
  }
}
