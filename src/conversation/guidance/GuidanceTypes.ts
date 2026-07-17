/**
 * Guidance Engine type definitions (KC-004 Sprint 1.3).
 *
 * Purpose: Typed recommendations, priorities, and request/response contracts.
 * Ownership: Guidance Engine owns recommendation structure — not message wording.
 * Extension points: Communication Engine maps localizationKey to DRCS-compliant text.
 * Future integrations: Repository-backed urgency signals arrive via Knowledge snapshots only.
 */

import type { ConversationContext } from '../ConversationContext'
import type {
  ConversationLifecycleState,
  PendingConfirmation,
} from '../ConversationTypes'
import type { KnowledgeBundleSnapshot } from '../knowledge'

/** Recommendation categories — structured intent, never rendered text. */
export type GuidanceCategory =
  | 'greeting'
  | 'clarification'
  | 'confirmation'
  | 'reminder'
  | 'preparation'
  | 'suggestion'
  | 'encouragement'
  | 'completion'
  | 'recovery'

/** Ordering tiers — conversational sequencing only, not business priority. */
export type GuidancePriority = 'critical' | 'high' | 'normal' | 'low' | 'background'

export type GuidanceConfidenceLevel = 'high' | 'medium' | 'low' | 'none'

/** Structural action hint for Conversation Engine — not a business decision. */
export type SuggestedActionType =
  | 'present_greeting'
  | 'request_clarification'
  | 'request_confirmation'
  | 'offer_reminder'
  | 'offer_preparation'
  | 'offer_suggestion'
  | 'offer_encouragement'
  | 'signal_completion'
  | 'initiate_recovery'
  | 'none'

export type GuidanceLifecyclePhase =
  | 'generated'
  | 'filtered'
  | 'ordered'
  | 'suppressed'
  | 'delivered'

export const GUIDANCE_PRIORITY_RANK: Readonly<Record<GuidancePriority, number>> = {
  critical: 5,
  high: 4,
  normal: 3,
  low: 2,
  background: 1,
}

/**
 * Request for guidance generation.
 *
 * Purpose: Supply conversation posture and knowledge availability to policies.
 * Typical usage: Context Manager assembles inputs; Engine never calls policies directly.
 */
export type GuidanceRequest = {
  conversationContext: ConversationContext
  conversationState: ConversationLifecycleState
  pendingConfirmation?: PendingConfirmation | null
  knowledgeBundle?: KnowledgeBundleSnapshot | null
  sessionId?: string
  suppressedCategories?: readonly GuidanceCategory[]
}

export type GuidanceSuppressionRule = {
  category: GuidanceCategory
  reason: string
  expiresAt?: number
}

export type GuidanceBundleMetadata = {
  requestId: string
  generatedAt: number
  lifecyclePhase: GuidanceLifecyclePhase
  policyCount: number
  recommendationCount: number
  suppressedCount: number
  sessionId?: string
}
