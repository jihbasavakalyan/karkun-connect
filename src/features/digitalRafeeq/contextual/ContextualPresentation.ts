/**
 * Contextual guidance presentation (KC-006 Sprint 6.4).
 *
 * Maps DigitalRafeeqService responses into workflow-specific guidance cards.
 */

import type {
  ConversationRole,
  DigitalRafeeqIntent,
  DigitalRafeeqResponse,
} from '@/runtime/service'
import { buildBaitulMaalGuidanceReminders } from '@/services/baitulMaalService'

export type ContextualSurface =
  | 'connect_execution'
  | 'meeting_preparation'
  | 'compliance_review'
  | 'report_review'

export type ContextualVisibility = 'hidden' | 'ready' | 'empty'

export type ContextualLineItem = {
  id: string
  text: string
}

export type ExecutionGuidanceView = {
  visibility: ContextualVisibility
  todaysPriority: string | null
  suggestedNextKarkun: string | null
  pendingFollowUp: string | null
  blockers: readonly string[]
}

export type MeetingGuidanceView = {
  visibility: ContextualVisibility
  agendaReminders: readonly string[]
  previousMeetingSummary: string | null
  pendingActionItems: readonly string[]
}

export type ComplianceGuidanceView = {
  visibility: ContextualVisibility
  outstandingSubmissions: readonly string[]
  upcomingDeadlines: readonly string[]
  missingRecords: readonly string[]
}

export type ReportGuidanceView = {
  visibility: ContextualVisibility
  campaignProgressSummary: string | null
  missingReporting: readonly string[]
  suggestedReviewActions: readonly string[]
}

export type ContextualGuidanceRequest = {
  surface: ContextualSurface
  intent: DigitalRafeeqIntent
  route: string
  role: ConversationRole
  payload?: Readonly<Record<string, unknown>>
}

const LOCALIZATION_COPY: Readonly<Record<string, string>> = {
  'guidance.greeting.open': 'Begin with today’s highest-priority connection.',
  'guidance.clarification.request': 'Clarify the next step before continuing.',
  'guidance.confirmation.request': 'Confirm the planned action before proceeding.',
  'guidance.reminder.deferred': 'A follow-up reminder is pending.',
  'guidance.preparation.meeting': 'Prepare the meeting agenda and talking points.',
  'guidance.suggestion.next_step': 'Take the next suggested campaign action.',
  'guidance.encouragement.milestone': 'Progress is on track — keep the rhythm.',
  'guidance.completion.close': 'Close completed items and update records.',
  'guidance.recovery.resume': 'Resume the interrupted guidance flow.',
}

type GuidanceLike = {
  id: string
  category: string
  localizationKey: string
  suggestedActionType: string
  priority: string
  metadata?: Readonly<Record<string, unknown>>
}

type MessageLike = {
  recommendationId: string
  localizationKey: string
  variables?: Readonly<Record<string, string | number | boolean>>
}

function resolveLocalizationKey(
  localizationKey: string,
  variables?: Readonly<Record<string, string | number | boolean>>,
): string {
  let text =
    LOCALIZATION_COPY[localizationKey] ?? localizationKey.replaceAll('.', ' ')
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      text = text.replaceAll(`{${key}}`, String(value))
    }
  }
  return text
}

function isUnusable(response: DigitalRafeeqResponse | null): boolean {
  if (!response || !response.success) return true
  return (
    response.runtimeStatus === 'Unavailable' ||
    response.runtimeStatus === 'Failed' ||
    response.runtimeStatus === 'NotInitialized'
  )
}

function getGuidance(response: DigitalRafeeqResponse): readonly GuidanceLike[] {
  return (response.guidancePlan?.getRecommendations() ?? []) as readonly GuidanceLike[]
}

function getMessages(response: DigitalRafeeqResponse): readonly MessageLike[] {
  return (response.communicationPlan?.getMessages() ?? []) as readonly MessageLike[]
}

function resolveItemText(
  item: GuidanceLike,
  messages: readonly MessageLike[],
): string {
  const matching = messages.find((message) => message.recommendationId === item.id)
  return resolveLocalizationKey(
    matching?.localizationKey ?? item.localizationKey,
    matching?.variables,
  )
}

function emptyExecution(): ExecutionGuidanceView {
  return {
    visibility: 'hidden',
    todaysPriority: null,
    suggestedNextKarkun: null,
    pendingFollowUp: null,
    blockers: [],
  }
}

function emptyMeeting(): MeetingGuidanceView {
  return {
    visibility: 'hidden',
    agendaReminders: [],
    previousMeetingSummary: null,
    pendingActionItems: [],
  }
}

function emptyCompliance(): ComplianceGuidanceView {
  return {
    visibility: 'hidden',
    outstandingSubmissions: [],
    upcomingDeadlines: [],
    missingRecords: [],
  }
}

function emptyReport(): ReportGuidanceView {
  return {
    visibility: 'hidden',
    campaignProgressSummary: null,
    missingReporting: [],
    suggestedReviewActions: [],
  }
}

export function buildExecutionGuidanceView(
  response: DigitalRafeeqResponse | null,
  enabled: boolean,
): ExecutionGuidanceView {
  if (!enabled) return emptyExecution()
  if (isUnusable(response) || !response) return emptyExecution()

  const recommendations = getGuidance(response)
  const messages = getMessages(response)
  const primary = response.communicationPlan?.getPrimaryMessage() as
    | MessageLike
    | null
    | undefined
  const primaryRec = response.guidancePlan?.getPrimaryRecommendation() as
    | GuidanceLike
    | null

  const todaysPriority = primary
    ? resolveLocalizationKey(primary.localizationKey, primary.variables)
    : primaryRec
      ? resolveLocalizationKey(primaryRec.localizationKey)
      : null

  const nextKarkunRec = recommendations.find((item) => {
    const name = item.metadata?.karkunName
    return typeof name === 'string' && name.length > 0
  })
  const suggestedNextKarkun = nextKarkunRec
    ? `Suggested next Karkun: ${String(nextKarkunRec.metadata?.karkunName)}`
    : response.knowledgeSummary?.availableDomains.includes('karkun')
      ? 'Suggested next Karkun: review your connected queue.'
      : null

  const followUp = recommendations.find(
    (item) =>
      item.category === 'reminder' ||
      item.suggestedActionType === 'offer_reminder',
  )
  const pendingFollowUp = followUp
    ? resolveItemText(followUp, messages)
    : null

  const blockers = recommendations
    .filter(
      (item) =>
        item.category === 'clarification' ||
        item.priority === 'critical' ||
        item.suggestedActionType === 'request_clarification',
    )
    .slice(0, 3)
    .map((item) => resolveItemText(item, messages))

  const hasContent =
    todaysPriority !== null ||
    suggestedNextKarkun !== null ||
    pendingFollowUp !== null ||
    blockers.length > 0

  return {
    visibility: hasContent ? 'ready' : 'empty',
    todaysPriority,
    suggestedNextKarkun,
    pendingFollowUp,
    blockers,
  }
}

export function buildMeetingGuidanceView(
  response: DigitalRafeeqResponse | null,
  enabled: boolean,
): MeetingGuidanceView {
  if (!enabled) return emptyMeeting()
  if (isUnusable(response) || !response) return emptyMeeting()

  const recommendations = getGuidance(response)
  const messages = getMessages(response)

  const agendaReminders = recommendations
    .filter(
      (item) =>
        item.category === 'preparation' ||
        item.suggestedActionType === 'offer_preparation' ||
        item.localizationKey.includes('meeting'),
    )
    .slice(0, 3)
    .map((item) => resolveItemText(item, messages))

  const previous = recommendations.find(
    (item) =>
      item.category === 'encouragement' ||
      item.category === 'completion' ||
      item.localizationKey.includes('milestone'),
  )
  const previousMeetingSummary = previous
    ? resolveItemText(previous, messages)
    : response.knowledgeSummary?.availableDomains.includes('meeting')
      ? 'Previous meeting context is available for this connection.'
      : null

  const pendingActionItems = recommendations
    .filter(
      (item) =>
        item.category === 'reminder' ||
        item.category === 'suggestion' ||
        item.priority === 'high' ||
        item.priority === 'critical',
    )
    .slice(0, 3)
    .map((item) => resolveItemText(item, messages))

  const hasContent =
    agendaReminders.length > 0 ||
    previousMeetingSummary !== null ||
    pendingActionItems.length > 0

  return {
    visibility: hasContent ? 'ready' : 'empty',
    agendaReminders,
    previousMeetingSummary,
    pendingActionItems,
  }
}

export function buildComplianceGuidanceView(
  response: DigitalRafeeqResponse | null,
  enabled: boolean,
): ComplianceGuidanceView {
  if (!enabled) return emptyCompliance()
  if (isUnusable(response) || !response) return emptyCompliance()

  const recommendations = getGuidance(response)
  const messages = getMessages(response)
  const knowledge = response.knowledgeSummary

  const baitulReminders = buildBaitulMaalGuidanceReminders('administrator')

  const outstandingSubmissions = [
    ...baitulReminders,
    ...recommendations
      .filter(
        (item) =>
          item.category === 'reminder' ||
          item.category === 'suggestion' ||
          item.priority === 'high' ||
          item.priority === 'critical',
      )
      .map((item) => resolveItemText(item, messages)),
  ].slice(0, 5)

  const upcomingDeadlines = [
    ...baitulReminders.filter((line) => line.toLowerCase().includes('month')),
    ...recommendations
      .filter((item) => item.category === 'preparation' || item.category === 'reminder')
      .map((item) => resolveItemText(item, messages)),
  ].slice(0, 3)

  const missingRecords =
    knowledge?.unavailableDomains.includes('compliance')
      ? ['Compliance records are currently unavailable.']
      : knowledge?.partialDomains.includes('compliance')
        ? ['Some compliance records appear incomplete.']
        : recommendations
            .filter((item) => item.category === 'clarification')
            .slice(0, 3)
            .map((item) => resolveItemText(item, messages))

  const hasContent =
    outstandingSubmissions.length > 0 ||
    upcomingDeadlines.length > 0 ||
    missingRecords.length > 0 ||
    baitulReminders.length > 0 ||
    knowledge?.availableDomains.includes('compliance') === true

  return {
    visibility: hasContent ? 'ready' : 'empty',
    outstandingSubmissions:
      outstandingSubmissions.length > 0
        ? outstandingSubmissions
        : knowledge?.availableDomains.includes('compliance')
          ? ['Review outstanding compliance submissions for today.']
          : [],
    upcomingDeadlines,
    missingRecords,
  }
}

export function buildReportGuidanceView(
  response: DigitalRafeeqResponse | null,
  enabled: boolean,
): ReportGuidanceView {
  if (!enabled) return emptyReport()
  if (isUnusable(response) || !response) return emptyReport()

  const recommendations = getGuidance(response)
  const messages = getMessages(response)
  const knowledge = response.knowledgeSummary

  const campaignProgressSummary = knowledge
    ? knowledge.availableDomains.length > 0
      ? `Campaign progress ready across ${knowledge.availableDomains.join(', ')} (${knowledge.aggregateConfidence} confidence).`
      : 'Campaign progress summary is limited right now.'
    : response.communicationPlan?.getPrimaryMessage()
      ? resolveLocalizationKey(
          (response.communicationPlan.getPrimaryMessage() as MessageLike)
            .localizationKey,
          (response.communicationPlan.getPrimaryMessage() as MessageLike).variables,
        )
      : null

  const missingReporting =
    knowledge?.unavailableDomains
      .filter((domain) => domain === 'reports' || domain === 'campaign')
      .map((domain) => `Missing ${domain} knowledge for reporting.`) ?? []

  const suggestedReviewActions = recommendations
    .slice(0, 3)
    .map((item) => resolveItemText(item, messages))

  const hasContent =
    campaignProgressSummary !== null ||
    missingReporting.length > 0 ||
    suggestedReviewActions.length > 0

  return {
    visibility: hasContent ? 'ready' : 'empty',
    campaignProgressSummary,
    missingReporting,
    suggestedReviewActions,
  }
}

export function resolveContextualRequest(
  surface: ContextualSurface,
  role: ConversationRole,
  route: string,
  payload?: Readonly<Record<string, unknown>>,
): ContextualGuidanceRequest {
  const intentMap: Record<ContextualSurface, DigitalRafeeqIntent> = {
    connect_execution: 'connect_execution',
    meeting_preparation: 'meeting_preparation',
    compliance_review: 'compliance_review',
    report_review: 'report_review',
  }
  return {
    surface,
    intent: intentMap[surface],
    route,
    role,
    payload,
  }
}
