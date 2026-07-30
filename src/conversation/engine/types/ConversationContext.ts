/**
 * KC-035A — Canonical ConversationContext model.
 * Strongly typed operational slots only — no long-term AI memory.
 */

import type { ClarificationRequest } from './Clarification'
import type { ConversationEngineState } from './ConversationState'

export type ConversationPersonKind = 'karkun' | 'muttafiq' | 'rukn'

export type ConversationPersonRef = {
  readonly personId: string
  readonly displayName: string
  readonly kind: ConversationPersonKind
  /** Optional disambiguator shown in clarification (e.g. ward). */
  readonly disambiguator?: string
}

export type ConversationHistoryEntry = {
  readonly id: string
  readonly at: number
  readonly role: 'user' | 'rafeeq' | 'system'
  readonly text: string
}

export type ConversationUserRole = 'administrator' | 'rukn'

/**
 * Canonical conversation context for Digital Rafeeq Voice OS foundation.
 */
export type ConversationContext = {
  readonly activeUserId: string | null
  readonly activeUserRole: ConversationUserRole | null
  readonly activePerson: ConversationPersonRef | null
  readonly activeCampaignId: string | null
  readonly activeCampaignName: string | null
  readonly activeReportId: string | null
  readonly activeReportLabel: string | null
  /** Opaque intent code — resolved by future Intent Engine (KC-035B). */
  readonly currentIntent: string | null
  readonly pendingQuestion: string | null
  readonly conversationState: ConversationEngineState
  readonly currentWorkflowId: string | null
  readonly lastExecutedAction: string | null
  readonly lastResponse: string | null
  readonly nextSuggestedAction: string | null
  readonly pendingClarification: ClarificationRequest | null
}

export function createEmptyConversationContext(
  patch?: Partial<ConversationContext>,
): ConversationContext {
  return {
    activeUserId: patch?.activeUserId ?? null,
    activeUserRole: patch?.activeUserRole ?? null,
    activePerson: patch?.activePerson ?? null,
    activeCampaignId: patch?.activeCampaignId ?? null,
    activeCampaignName: patch?.activeCampaignName ?? null,
    activeReportId: patch?.activeReportId ?? null,
    activeReportLabel: patch?.activeReportLabel ?? null,
    currentIntent: patch?.currentIntent ?? null,
    pendingQuestion: patch?.pendingQuestion ?? null,
    conversationState: patch?.conversationState ?? 'idle',
    currentWorkflowId: patch?.currentWorkflowId ?? null,
    lastExecutedAction: patch?.lastExecutedAction ?? null,
    lastResponse: patch?.lastResponse ?? null,
    nextSuggestedAction: patch?.nextSuggestedAction ?? null,
    pendingClarification: patch?.pendingClarification ?? null,
  }
}
