/**
 * Rukn Home Assistant — presentation mapping (KC-006 Sprint 6.3).
 *
 * Maps DigitalRafeeqService responses into Home display copy.
 * Does not import runtime engines, repositories, or Firestore.
 */

import type { DigitalRafeeqResponse } from '@/runtime/service'
import type {
  RuknAssistantRecommendationItem,
  RuknAssistantViewModel,
  RuknConnectQueueView,
  RuknPersonalProgressView,
} from './RuknAssistantTypes'
import {
  EMPTY_CONNECT_QUEUE,
  EMPTY_PERSONAL_PROGRESS,
} from './RuknAssistantTypes'

const LOCALIZATION_COPY: Readonly<Record<string, string>> = {
  'guidance.greeting.open': 'Begin today’s campaign connections with clarity and calm focus.',
  'guidance.clarification.request': 'Clarify the next Karkun step before you continue.',
  'guidance.confirmation.request': 'Confirm today’s planned connection before you proceed.',
  'guidance.reminder.deferred': 'A follow-up is due — reconnect with the pending Karkun.',
  'guidance.preparation.meeting': 'A meeting is due — prepare your talking points and intent.',
  'guidance.suggestion.next_step': 'Take the next campaign action on your connect queue.',
  'guidance.encouragement.milestone': 'Good progress today — keep your connection rhythm.',
  'guidance.completion.close': 'Mark completed work and close the loop for today.',
  'guidance.recovery.resume': 'Resume your interrupted daily execution plan.',
}

type GuidanceLike = {
  id: string
  category: string
  localizationKey: string
  suggestedActionType: string
  priority: string
}

type MessageLike = {
  recommendationId: string
  localizationKey: string
  variables?: Readonly<Record<string, string | number | boolean>>
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
  const base =
    LOCALIZATION_COPY[localizationKey] ?? localizationKey.replaceAll('.', ' ')
  return formatWithVariables(base, variables)
}

function isMeetingDue(item: GuidanceLike): boolean {
  return (
    item.category === 'preparation' ||
    item.suggestedActionType === 'offer_preparation' ||
    item.localizationKey.includes('meeting')
  )
}

function isFollowUpDue(item: GuidanceLike): boolean {
  return (
    item.category === 'reminder' ||
    item.suggestedActionType === 'offer_reminder' ||
    item.localizationKey.includes('deferred')
  )
}

function buildConnectQueue(
  response: DigitalRafeeqResponse,
  recommendations: readonly GuidanceLike[],
): RuknConnectQueueView {
  const knowledge = response.knowledgeSummary
  const karkunReady = knowledge?.availableDomains.includes('karkun') === true
  const meetingDueCount = recommendations.filter(isMeetingDue).length
  const followUpDueCount = recommendations.filter(isFollowUpDue).length

  return {
    connectedKarkuns: karkunReady
      ? 'Connected Karkun context is ready for today’s work.'
      : knowledge?.requestedDomains.includes('karkun')
        ? 'Connected Karkun context is limited right now.'
        : EMPTY_CONNECT_QUEUE.connectedKarkuns,
    pendingVisits:
      followUpDueCount > 0
        ? `${followUpDueCount} follow-up / visit priorit${followUpDueCount === 1 ? 'y' : 'ies'} flagged.`
        : EMPTY_CONNECT_QUEUE.pendingVisits,
    pendingMeetings:
      meetingDueCount > 0
        ? `${meetingDueCount} meeting priorit${meetingDueCount === 1 ? 'y' : 'ies'} flagged.`
        : EMPTY_CONNECT_QUEUE.pendingMeetings,
  }
}

function buildPersonalProgress(
  response: DigitalRafeeqResponse,
  recommendations: readonly GuidanceLike[],
): RuknPersonalProgressView {
  const knowledge = response.knowledgeSummary
  const completionCount = recommendations.filter(
    (item) =>
      item.category === 'completion' ||
      item.suggestedActionType === 'signal_completion',
  ).length
  const encouragementCount = recommendations.filter(
    (item) => item.category === 'encouragement',
  ).length
  const complianceDue = recommendations.filter(
    (item) =>
      item.localizationKey.includes('compliance') ||
      knowledge?.availableDomains.includes('compliance') === true ||
      knowledge?.requestedDomains.includes('compliance') === true,
  ).length

  return {
    connectionsCompleted:
      completionCount + encouragementCount > 0
        ? 'Connection progress signals are available for today.'
        : knowledge?.availableDomains.includes('campaign') === true
          ? 'Campaign progress context is available.'
          : EMPTY_PERSONAL_PROGRESS.connectionsCompleted,
    meetingsCompleted:
      completionCount > 0
        ? 'Meeting completion signals are present.'
        : EMPTY_PERSONAL_PROGRESS.meetingsCompleted,
    complianceReminders:
      complianceDue > 0 || knowledge?.availableDomains.includes('compliance')
        ? 'Compliance reminders are in scope for today.'
        : EMPTY_PERSONAL_PROGRESS.complianceReminders,
  }
}

/**
 * Build a Rukn Home view model from a DigitalRafeeqService response.
 */
export function buildRuknAssistantViewModel(
  response: DigitalRafeeqResponse | null,
  options?: { enabled: boolean },
): RuknAssistantViewModel {
  if (!options?.enabled) {
    return {
      visibility: 'hidden',
      todaysMission: null,
      connectQueue: EMPTY_CONNECT_QUEUE,
      recommendations: [],
      personalProgress: EMPTY_PERSONAL_PROGRESS,
      signals: { meetingDue: false, followUpDue: false },
    }
  }

  if (!response || !response.success) {
    return {
      visibility: 'hidden',
      todaysMission: null,
      connectQueue: EMPTY_CONNECT_QUEUE,
      recommendations: [],
      personalProgress: EMPTY_PERSONAL_PROGRESS,
      signals: { meetingDue: false, followUpDue: false },
    }
  }

  if (
    response.runtimeStatus === 'Unavailable' ||
    response.runtimeStatus === 'Failed' ||
    response.runtimeStatus === 'NotInitialized'
  ) {
    return {
      visibility: 'hidden',
      todaysMission: null,
      connectQueue: EMPTY_CONNECT_QUEUE,
      recommendations: [],
      personalProgress: EMPTY_PERSONAL_PROGRESS,
      signals: { meetingDue: false, followUpDue: false },
    }
  }

  const messages = (response.communicationPlan?.getMessages() ??
    []) as readonly MessageLike[]
  const recommendations = (response.guidancePlan?.getRecommendations() ??
    []) as readonly GuidanceLike[]
  const primaryMessage = response.communicationPlan?.getPrimaryMessage() as
    | MessageLike
    | null
    | undefined
  const primaryRecommendation =
    response.guidancePlan?.getPrimaryRecommendation() as GuidanceLike | null

  const todaysMission = primaryMessage
    ? resolveLocalizationKey(
        primaryMessage.localizationKey,
        primaryMessage.variables,
      )
    : primaryRecommendation
      ? resolveLocalizationKey(primaryRecommendation.localizationKey)
      : null

  const recommendationItems: RuknAssistantRecommendationItem[] = recommendations
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

  const connectQueue = buildConnectQueue(response, recommendations)
  const personalProgress = buildPersonalProgress(response, recommendations)
  const meetingDue = recommendations.some(isMeetingDue)
  const followUpDue = recommendations.some(isFollowUpDue)

  const hasContent =
    todaysMission !== null ||
    recommendationItems.length > 0 ||
    meetingDue ||
    followUpDue ||
    response.knowledgeSummary !== null

  return {
    visibility: hasContent ? 'ready' : 'empty',
    todaysMission,
    connectQueue,
    recommendations: recommendationItems,
    personalProgress,
    signals: { meetingDue, followUpDue },
  }
}
