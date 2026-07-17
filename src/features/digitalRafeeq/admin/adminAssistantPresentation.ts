/**
 * Administrator Dashboard Assistant — presentation mapping (KC-006 Sprint 6.2).
 *
 * Maps DigitalRafeeqService response structures into dashboard display copy.
 * Does not import runtime engines, repositories, or Firestore.
 */

import type { DigitalRafeeqResponse } from '@/runtime/service'
import type {
  AdminAssistantHealthLabel,
  AdminAssistantRecommendationItem,
  AdminAssistantViewModel,
} from './AdminAssistantTypes'

const LOCALIZATION_COPY: Readonly<Record<string, string>> = {
  'guidance.greeting.open': 'Review today’s campaign posture and open priorities.',
  'guidance.clarification.request': 'Clarify outstanding programme details before proceeding.',
  'guidance.confirmation.request': 'Confirm the next programme step with your team.',
  'guidance.reminder.deferred': 'Follow up on deferred campaign topics.',
  'guidance.preparation.meeting': 'Prepare for the next Karkun meeting.',
  'guidance.suggestion.next_step': 'Advance the next programme objective.',
  'guidance.encouragement.milestone': 'Campaign momentum is building — keep the pace.',
  'guidance.completion.close': 'Close out completed programme items.',
  'guidance.recovery.resume': 'Resume the interrupted guidance flow.',
}

function formatWithVariables(
  template: string,
  variables: Readonly<Record<string, string | number | boolean>> | undefined,
): string {
  if (!variables) return template
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{${key}}`, String(value))
  }
  return result
}

function resolveLocalizationKey(
  localizationKey: string,
  variables?: Readonly<Record<string, string | number | boolean>>,
): string {
  const base = LOCALIZATION_COPY[localizationKey] ?? localizationKey.replaceAll('.', ' ')
  return formatWithVariables(base, variables)
}

function mapHealthLabel(response: DigitalRafeeqResponse): AdminAssistantHealthLabel {
  if (response.health === 'healthy') return 'Healthy'
  if (response.health === 'degraded') return 'Degraded'
  if (response.runtimeStatus === 'Unavailable' || response.runtimeStatus === 'Failed') {
    return 'Unavailable'
  }
  if (response.health === 'unavailable' || response.health === 'failed') {
    return 'Unavailable'
  }
  return 'Degraded'
}

/**
 * Build a dashboard view model from a DigitalRafeeqService response.
 * Returns hidden visibility when the response is not usable.
 */
export function buildAdminAssistantViewModel(
  response: DigitalRafeeqResponse | null,
  options?: { enabled: boolean },
): AdminAssistantViewModel {
  if (!options?.enabled) {
    return {
      visibility: 'hidden',
      healthLabel: 'Disabled',
      primaryPriority: null,
      recommendations: [],
      campaignSummary: null,
      outstandingActions: [],
    }
  }

  if (!response || !response.success) {
    return {
      visibility: 'hidden',
      healthLabel: 'Unavailable',
      healthDetail: response?.error?.message,
      primaryPriority: null,
      recommendations: [],
      campaignSummary: null,
      outstandingActions: [],
    }
  }

  if (
    response.runtimeStatus === 'Unavailable' ||
    response.runtimeStatus === 'Failed' ||
    response.runtimeStatus === 'NotInitialized'
  ) {
    return {
      visibility: 'hidden',
      healthLabel: 'Unavailable',
      healthDetail: response.error?.message,
      primaryPriority: null,
      recommendations: [],
      campaignSummary: null,
      outstandingActions: [],
    }
  }

  const messages = response.communicationPlan?.getMessages() ?? []
  const recommendations = response.guidancePlan?.getRecommendations() ?? []
  const primaryMessage = response.communicationPlan?.getPrimaryMessage() ?? null
  const primaryRecommendation = response.guidancePlan?.getPrimaryRecommendation() ?? null

  const primaryPriority = primaryMessage
    ? resolveLocalizationKey(primaryMessage.localizationKey, primaryMessage.variables)
    : primaryRecommendation
      ? resolveLocalizationKey(primaryRecommendation.localizationKey)
      : null

  const recommendationItems: AdminAssistantRecommendationItem[] = recommendations
    .slice(0, 3)
    .map((item) => {
      const matchingMessage = messages.find(
        (message) => message.recommendationId === item.id,
      )
      return {
        id: item.id,
        title: resolveLocalizationKey(
          matchingMessage?.localizationKey ?? item.localizationKey,
          matchingMessage?.variables,
        ),
        detail: item.suggestedActionType
          ? `Action: ${item.suggestedActionType.replaceAll('_', ' ')}`
          : undefined,
      }
    })

  const knowledge = response.knowledgeSummary
  const campaignSummary = knowledge
    ? knowledge.availableDomains.length > 0
      ? `Campaign knowledge ready across ${knowledge.availableDomains.join(', ')} (${knowledge.aggregateConfidence} confidence).`
      : knowledge.unavailableDomains.length > 0
        ? `Campaign knowledge limited — unavailable: ${knowledge.unavailableDomains.join(', ')}.`
        : 'Campaign knowledge summary is available.'
    : null

  const outstandingActions = recommendations
    .filter((item) => item.blocking || item.priority === 'critical' || item.priority === 'high')
    .slice(0, 3)
    .map((item) => resolveLocalizationKey(item.localizationKey))

  const hasContent =
    primaryPriority !== null ||
    recommendationItems.length > 0 ||
    campaignSummary !== null ||
    outstandingActions.length > 0

  return {
    visibility: hasContent ? 'ready' : 'empty',
    healthLabel: mapHealthLabel(response),
    healthDetail: response.error?.message,
    primaryPriority,
    recommendations: recommendationItems,
    campaignSummary,
    outstandingActions,
  }
}
