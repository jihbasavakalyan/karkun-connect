/**
 * Rukn Home Assistant — presentation mapping (KC-006 Sprint 6.3).
 *
 * Maps DigitalRafeeqService responses into Home display copy.
 * Does not import runtime engines, repositories, or Firestore.
 */

import type { DigitalRafeeqResponse } from '@/runtime/service'
import { buildBaitulMaalGuidanceReminders } from '@/services/baitulMaalService'
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
  'guidance.greeting.open':
    'آئیے آج کے روابط کو سکون اور توجہ کے ساتھ آگے بڑھائیں۔',
  'guidance.clarification.request':
    'آگے بڑھنے سے پہلے اگلا قدم واضح کر لیجیے۔',
  'guidance.confirmation.request':
    'اگر مناسب سمجھیں تو طے شدہ رابطہ تصدیق کر کے شروع کیجیے۔',
  'guidance.reminder.deferred':
    'ایک فالو اپ باقی ہے — مناسب وقت پر دوبارہ رابطہ مفید ہوگا۔',
  'guidance.preparation.meeting':
    'ملاقات قریب ہے — چند باتیں ذہن میں رکھ لیں تاکہ گفتگو نرم رہے۔',
  'guidance.suggestion.next_step':
    'اگر ممکن ہو تو اب اگلا رابطہ کر لیجیے۔',
  'guidance.encouragement.milestone':
    'الحمد للہ، آج کی کوشش اچھی رہی۔ اسی روانی کو برقرار رکھیے۔',
  'guidance.completion.close':
    'مکمل شدہ کام محفوظ کر لیں تاکہ آج کا کام اطمینان سے مکمل ہو۔',
  'guidance.recovery.resume':
    'جہاں کام رک گیا تھا وہیں سے دوبارہ شروع کر سکتے ہیں — میں آپ کے ساتھ ہوں۔',
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
      ? 'مربوط کارکنان کا سیاق آج کے کام کے لیے تیار ہے۔'
      : knowledge?.requestedDomains.includes('karkun')
        ? 'مربوط کارکنان کا سیاق اس وقت محدود ہے۔'
        : EMPTY_CONNECT_QUEUE.connectedKarkuns,
    pendingVisits:
      followUpDueCount > 0
        ? `${followUpDueCount} فالو اپ / ملاقات توجہ مانگتی ہے۔`
        : EMPTY_CONNECT_QUEUE.pendingVisits,
    pendingMeetings:
      meetingDueCount > 0
        ? `${meetingDueCount} ملاقات قریب ہے۔`
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

  const baitulReminders = buildBaitulMaalGuidanceReminders('rukn')

  return {
    connectionsCompleted:
      completionCount + encouragementCount > 0
        ? 'آج رابطوں کی پیش رفت نظر آ رہی ہے۔'
        : knowledge?.availableDomains.includes('campaign') === true
          ? 'مہم کی پیش رفت کا سیاق دستیاب ہے۔'
          : EMPTY_PERSONAL_PROGRESS.connectionsCompleted,
    meetingsCompleted:
      completionCount > 0
        ? 'ملاقاتوں کی تکمیل کے اشارے موجود ہیں۔'
        : EMPTY_PERSONAL_PROGRESS.meetingsCompleted,
    complianceReminders:
      baitulReminders[0] ??
      (complianceDue > 0 || knowledge?.availableDomains.includes('compliance')
        ? 'آج تعمیل کی یاد دہانیاں توجہ مانگتی ہیں۔'
        : EMPTY_PERSONAL_PROGRESS.complianceReminders),
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
