/**
 * Deterministic guidance policies (KC-004 Sprint 1.3).
 *
 * Purpose: Pure functions that emit structured recommendations from conversation posture.
 * Ownership: Each policy owns one category; no data retrieval or message formatting.
 * Extension points: Register additional policies via GuidanceRegistry at bootstrap.
 * Future integrations: Knowledge-derived signals inform confidence only — never business rules.
 */

import { createGuidanceRecommendation } from './GuidanceRecommendation'
import type { GuidancePolicy } from './GuidanceRegistry'

const DEFAULT_TTL_MS = 5 * 60 * 1000

function expirationFromNow(ttlMs: number = DEFAULT_TTL_MS): number {
  return Date.now() + ttlMs
}

export const GreetingPolicy: GuidancePolicy = {
  policyId: 'greeting',
  order: 10,
  evaluate(context) {
    if (context.conversationState !== 'greeting') return null
    return createGuidanceRecommendation({
      category: 'greeting',
      priority: 'high',
      reason: 'lifecycle_greeting',
      confidence: 'high',
      requiredContext: ['sessionMetadata'],
      expiresAt: expirationFromNow(),
      blocking: false,
      suggestedActionType: 'present_greeting',
      localizationKey: 'guidance.greeting.open',
    })
  },
}

export const ConfirmationPolicy: GuidancePolicy = {
  policyId: 'confirmation',
  order: 20,
  evaluate(context) {
    if (context.conversationState !== 'confirmation' && !context.hasPendingConfirmation) {
      return null
    }
    return createGuidanceRecommendation({
      category: 'confirmation',
      priority: 'critical',
      reason: 'pending_confirmation',
      confidence: context.hasPendingConfirmation ? 'high' : 'medium',
      requiredContext: ['pendingConfirmation'],
      expiresAt: null,
      blocking: true,
      suggestedActionType: 'request_confirmation',
      localizationKey: 'guidance.confirmation.request',
      metadata: {
        confirmationId: context.pendingConfirmation?.id,
      },
    })
  },
}

export const ClarificationPolicy: GuidancePolicy = {
  policyId: 'clarification',
  order: 30,
  evaluate(context) {
    const needsLifecycleClarification = context.conversationState === 'clarification'
    const needsKnowledgeClarification =
      context.knowledgePartial || context.knowledgeUnavailable
    const needsKarkunClarification =
      context.currentObjective !== 'none' && !context.hasKarkunFocus

    if (!needsLifecycleClarification && !needsKnowledgeClarification && !needsKarkunClarification) {
      return null
    }

    return createGuidanceRecommendation({
      category: 'clarification',
      priority: needsLifecycleClarification ? 'high' : 'normal',
      reason: needsLifecycleClarification
        ? 'lifecycle_clarification'
        : needsKarkunClarification
          ? 'missing_karkun_focus'
          : 'knowledge_gap',
      confidence: needsKnowledgeClarification ? 'low' : 'medium',
      requiredContext: needsKarkunClarification
        ? ['currentKarkun']
        : ['conversationState'],
      expiresAt: expirationFromNow(),
      blocking: needsLifecycleClarification,
      suggestedActionType: 'request_clarification',
      localizationKey: 'guidance.clarification.request',
    })
  },
}

export const RecoveryPolicy: GuidancePolicy = {
  policyId: 'recovery',
  order: 40,
  evaluate(context) {
    if (context.conversationState !== 'recovery' && !context.interrupted) return null
    return createGuidanceRecommendation({
      category: 'recovery',
      priority: 'high',
      reason: context.interrupted ? 'session_interrupted' : 'lifecycle_recovery',
      confidence: 'medium',
      requiredContext: ['sessionMetadata'],
      expiresAt: expirationFromNow(10 * 60 * 1000),
      blocking: false,
      suggestedActionType: 'initiate_recovery',
      localizationKey: 'guidance.recovery.resume',
    })
  },
}

export const ReminderPolicy: GuidancePolicy = {
  policyId: 'reminder',
  order: 50,
  evaluate(context) {
    const deferredTopics = context.sessionMetadata.deferredTopics ?? []
    const objectiveReminder =
      context.currentObjective === 'next_contact' ||
      context.currentObjective === 'todays_programme'

    if (!objectiveReminder && deferredTopics.length === 0) return null

    return createGuidanceRecommendation({
      category: 'reminder',
      priority: 'normal',
      reason: deferredTopics.length > 0 ? 'deferred_topic' : 'objective_reminder',
      confidence: 'medium',
      requiredContext: ['currentObjective'],
      expiresAt: expirationFromNow(15 * 60 * 1000),
      blocking: false,
      suggestedActionType: 'offer_reminder',
      localizationKey: 'guidance.reminder.deferred',
      metadata: {
        deferredTopicCount: deferredTopics.length,
      },
    })
  },
}

export const CompletionPolicy: GuidancePolicy = {
  policyId: 'completion',
  order: 60,
  evaluate(context) {
    if (
      context.conversationState !== 'completion' &&
      context.conversationState !== 'closing'
    ) {
      return null
    }
    return createGuidanceRecommendation({
      category: 'completion',
      priority: 'normal',
      reason: 'lifecycle_completion',
      confidence: 'high',
      requiredContext: ['conversationState'],
      expiresAt: expirationFromNow(),
      blocking: false,
      suggestedActionType: 'signal_completion',
      localizationKey: 'guidance.completion.close',
    })
  },
}

export const PreparationPolicy: GuidancePolicy = {
  policyId: 'preparation',
  order: 70,
  evaluate(context) {
    if (context.currentObjective !== 'meeting_preparation') return null
    return createGuidanceRecommendation({
      category: 'preparation',
      priority: 'high',
      reason: 'objective_meeting_preparation',
      confidence: context.hasKarkunFocus ? 'high' : 'medium',
      requiredContext: ['currentObjective', 'currentKarkun'],
      expiresAt: expirationFromNow(20 * 60 * 1000),
      blocking: false,
      suggestedActionType: 'offer_preparation',
      localizationKey: 'guidance.preparation.meeting',
    })
  },
}

export const SuggestionPolicy: GuidancePolicy = {
  policyId: 'suggestion',
  order: 80,
  evaluate(context) {
    if (context.conversationState !== 'guidance' && context.conversationState !== 'understanding') {
      return null
    }
    if (context.currentObjective === 'none' || context.currentObjective === 'unknown') {
      return null
    }
    return createGuidanceRecommendation({
      category: 'suggestion',
      priority: 'normal',
      reason: 'objective_guidance',
      confidence: context.hasCampaignContext ? 'medium' : 'low',
      requiredContext: ['currentObjective'],
      expiresAt: expirationFromNow(),
      blocking: false,
      suggestedActionType: 'offer_suggestion',
      localizationKey: 'guidance.suggestion.next_step',
    })
  },
}

export const EncouragementPolicy: GuidancePolicy = {
  policyId: 'encouragement',
  order: 90,
  evaluate(context) {
    if (context.conversationState !== 'guidance' && context.conversationState !== 'completion') {
      return null
    }
    if (!context.hasCampaignContext) return null
    return createGuidanceRecommendation({
      category: 'encouragement',
      priority: 'low',
      reason: 'campaign_progress_acknowledgment',
      confidence: 'medium',
      requiredContext: ['currentCampaign'],
      expiresAt: expirationFromNow(30 * 60 * 1000),
      blocking: false,
      suggestedActionType: 'offer_encouragement',
      localizationKey: 'guidance.encouragement.milestone',
    })
  },
}

export const DEFAULT_GUIDANCE_POLICIES: readonly GuidancePolicy[] = [
  GreetingPolicy,
  ConfirmationPolicy,
  ClarificationPolicy,
  RecoveryPolicy,
  ReminderPolicy,
  CompletionPolicy,
  PreparationPolicy,
  SuggestionPolicy,
  EncouragementPolicy,
]

export function registerDefaultGuidancePolicies(
  registry: { register: (policy: GuidancePolicy) => () => void },
): void {
  for (const policy of DEFAULT_GUIDANCE_POLICIES) {
    registry.register(policy)
  }
}
