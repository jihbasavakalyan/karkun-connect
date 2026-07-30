/**
 * KC-035A — Operational conversation memory helpers (short-term only).
 */

import type { ClarificationRequest } from '../types/Clarification'
import type {
  ConversationContext,
  ConversationPersonRef,
} from '../types/ConversationContext'
import { createEmptyConversationContext } from '../types/ConversationContext'

export function rememberActivePerson(
  context: ConversationContext,
  person: ConversationPersonRef,
): ConversationContext {
  return { ...context, activePerson: person }
}

export function rememberCampaign(
  context: ConversationContext,
  campaignId: string,
  campaignName?: string | null,
): ConversationContext {
  return {
    ...context,
    activeCampaignId: campaignId,
    activeCampaignName: campaignName ?? context.activeCampaignName,
  }
}

export function rememberReport(
  context: ConversationContext,
  reportId: string,
  reportLabel?: string | null,
): ConversationContext {
  return {
    ...context,
    activeReportId: reportId,
    activeReportLabel: reportLabel ?? context.activeReportLabel,
  }
}

export function rememberWorkflow(
  context: ConversationContext,
  workflowId: string,
): ConversationContext {
  return { ...context, currentWorkflowId: workflowId }
}

export function rememberLastAction(
  context: ConversationContext,
  action: string,
): ConversationContext {
  return { ...context, lastExecutedAction: action }
}

export function rememberLastResponse(
  context: ConversationContext,
  response: string,
): ConversationContext {
  return { ...context, lastResponse: response }
}

export function rememberSuggestedAction(
  context: ConversationContext,
  suggestion: string | null,
): ConversationContext {
  return { ...context, nextSuggestedAction: suggestion }
}

export function rememberPendingClarification(
  context: ConversationContext,
  clarification: ClarificationRequest | null,
): ConversationContext {
  return { ...context, pendingClarification: clarification }
}

export function rememberIntent(
  context: ConversationContext,
  intent: string | null,
): ConversationContext {
  return { ...context, currentIntent: intent }
}

/** Forget completed workflow slots while keeping active person / campaign. */
export function forgetCompletedWorkflow(context: ConversationContext): ConversationContext {
  return {
    ...context,
    currentWorkflowId: null,
    currentIntent: null,
    pendingQuestion: null,
    pendingClarification: null,
    lastExecutedAction: null,
    nextSuggestedAction: null,
  }
}

/** Clear person-scoped operational context (keeps user identity). */
export function clearPersonContext(context: ConversationContext): ConversationContext {
  return {
    ...context,
    activePerson: null,
    pendingClarification: null,
    pendingQuestion: null,
    currentIntent: null,
    currentWorkflowId: null,
    lastExecutedAction: null,
    nextSuggestedAction: null,
  }
}

export function resetOperationalMemory(
  context: ConversationContext,
): ConversationContext {
  return createEmptyConversationContext({
    activeUserId: context.activeUserId,
    activeUserRole: context.activeUserRole,
    conversationState: 'idle',
  })
}
