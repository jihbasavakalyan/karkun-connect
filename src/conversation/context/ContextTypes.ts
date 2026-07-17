/**
 * Context Manager type definitions (KC-004 Sprint 1.1).
 *
 * Purpose: Extended context slots beyond ConversationContext — navigation, pending actions, transients.
 * Ownership: Context Manager owns assembly of these values; providers supply partial contributions.
 * Future provider examples: NavigationContextProvider (React router adapter), DeepLinkContextProvider.
 * Extension notes: Add channel-specific metadata without changing ConversationContext shape.
 */

import type { ConversationContext, ConversationFutureExtensions } from '../ConversationContext'
import type {
  ConversationObjective,
  PendingConfirmation,
} from '../ConversationTypes'

/** In-app surface the Rukn is viewing — not authoritative routing state. */
export type NavigationView =
  | 'dashboard'
  | 'campaign'
  | 'meetings'
  | 'karkun'
  | 'guidance'
  | 'connection_journey'
  | 'settings'
  | 'unknown'

/**
 * Navigation context for conversation continuity across views.
 *
 * Purpose: Tell Digital Rafeeq where the user is without coupling to React Router.
 * Ownership: Context Manager; NavigationContextProvider supplies values in Phase 2.
 */
export type NavigationContext = {
  currentView: NavigationView
  routePath?: string
  routeParams?: Readonly<Record<string, string>>
  previousView?: NavigationView
}

/** Non-authoritative pending action posture for the current segment. */
export type PendingActionKind =
  | 'none'
  | 'confirmation'
  | 'clarification'
  | 'navigation'
  | 'deferred_topic'

export type PendingActionContext = {
  kind: PendingActionKind
  label?: string
  confirmationId?: string
  metadata?: Readonly<Record<string, unknown>>
}

/** Ephemeral key-value session scratch space — never persisted. */
export type TransientSessionValues = Readonly<Record<string, unknown>>

/** Identifiers for registered context providers. */
export type ContextProviderId =
  | 'user'
  | 'campaign'
  | 'meeting'
  | 'navigation'
  | 'conversation'
  | 'repository'
  | 'ai'
  | 'notification'
  | 'voice'
  | 'deep_link'
  | 'offline'

/** Partial contribution a provider may supply — never a full authoritative snapshot. */
export type ContextProviderPartial = {
  conversation?: Partial<ConversationContext>
  navigation?: Partial<NavigationContext>
  objective?: ConversationObjective
  pendingAction?: PendingActionContext | null
  pendingConfirmation?: PendingConfirmation | null
  transient?: TransientSessionValues
  extensions?: ConversationFutureExtensions
}

export type ContextProviderContribution = {
  providerId: ContextProviderId
  /** Higher priority wins conflicts for the same field path. */
  priority: number
  partial: ContextProviderPartial
  timestamp: number
  /** Optional confidence hint for AI or inferred providers — not used for business decisions. */
  confidence?: number
}

/** Record of a resolved field conflict for observability. */
export type ContextConflictRecord = {
  fieldPath: string
  winnerProviderId: ContextProviderId
  loserProviderIds: readonly ContextProviderId[]
}

/** Structural completeness report — slot presence only, no business validation. */
export type ContextCompletenessReport = {
  score: number
  filledSlots: readonly string[]
  missingSlots: readonly string[]
  warnings: readonly string[]
}

export type ContextManagerMetadata = {
  resolvedAt: number
  providerCount: number
  completeness: ContextCompletenessReport
  conflicts: readonly ContextConflictRecord[]
}

/** Minimum consumer surface for pushing resolved context into Conversation Engine. */
export type ConversationContextConsumer = {
  getContext(): ConversationContext | null
  updateContext(patch: Partial<ConversationContext>): ConversationContext | null
  getPendingConfirmation(): PendingConfirmation | null
}
