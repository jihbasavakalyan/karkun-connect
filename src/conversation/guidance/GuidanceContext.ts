/**
 * Guidance input assembly (KC-004 Sprint 1.3).
 *
 * Purpose: Normalize inputs from Context Manager, Knowledge Manager, and Conversation Engine.
 * Ownership: GuidanceContext is a read-only view for policy evaluation.
 * Extension points: Add derived flags as policies grow without changing engine core.
 * Future integrations: Knowledge availability flags inform clarification policies only.
 */

import type { ConversationContext } from '../ConversationContext'
import type {
  ConversationLifecycleState,
  PendingConfirmation,
} from '../ConversationTypes'
import type { KnowledgeBundleSnapshot } from '../knowledge'
import type { GuidanceRequest } from './GuidanceTypes'

export type GuidanceContext = {
  conversationContext: ConversationContext
  conversationState: ConversationLifecycleState
  pendingConfirmation: PendingConfirmation | null
  knowledgeBundle: KnowledgeBundleSnapshot | null
  sessionId?: string
  sessionMetadata: ConversationContext['sessionMetadata']
  currentObjective: ConversationContext['currentObjective']
  hasKarkunFocus: boolean
  hasCampaignContext: boolean
  hasPendingConfirmation: boolean
  knowledgePartial: boolean
  knowledgeUnavailable: boolean
  interrupted: boolean
}

export function createGuidanceContext(request: GuidanceRequest): GuidanceContext {
  const { conversationContext, knowledgeBundle } = request
  const availability = knowledgeBundle?.getAvailability()

  return {
    conversationContext,
    conversationState: request.conversationState,
    pendingConfirmation: request.pendingConfirmation ?? null,
    knowledgeBundle: knowledgeBundle ?? null,
    sessionId: request.sessionId,
    sessionMetadata: conversationContext.sessionMetadata,
    currentObjective: conversationContext.currentObjective,
    hasKarkunFocus: Boolean(conversationContext.currentKarkun?.karkunId),
    hasCampaignContext: Boolean(conversationContext.currentCampaign?.campaignId),
    hasPendingConfirmation: Boolean(request.pendingConfirmation),
    knowledgePartial: (availability?.partialDomains.length ?? 0) > 0,
    knowledgeUnavailable: (availability?.unavailableDomains.length ?? 0) > 0,
    interrupted: Boolean(conversationContext.sessionMetadata.interruptedAt),
  }
}
