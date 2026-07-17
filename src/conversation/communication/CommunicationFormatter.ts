/**
 * Communication formatter (KC-004 Sprint 1.4).
 *
 * Purpose: Variable substitution, ordering, channel adaptation, template validation.
 * Ownership: Formatter prepares message models — never renders final user-visible text.
 * Extension points: Channel adapters adjust delivery hints and formatting metadata.
 * Future localization strategy: Variable values stay structural; packs apply at render time.
 */

import type { ConversationContext } from '../ConversationContext'
import type { GuidanceRecommendation } from '../guidance'
import type { CommunicationTemplate } from './CommunicationTemplates'
import type {
  CommunicationChannel,
  CommunicationMessage,
  CommunicationTone,
  CommunicationVariables,
  DeliveryHint,
  FormattingMetadata,
  LocalizationPreferences,
} from './CommunicationTypes'
import { COMMUNICATION_PRIORITY_RANK } from './CommunicationTypes'

export type FormatMessageInput = {
  recommendation: GuidanceRecommendation
  template: CommunicationTemplate
  conversationContext: ConversationContext
  channel: CommunicationChannel
  localization: LocalizationPreferences
  sequenceOrder: number
}

export type FormatValidationResult = {
  valid: boolean
  missingVariables: readonly string[]
  warnings: readonly string[]
}

export type ChannelAdapter = {
  readonly channel: CommunicationChannel
  adaptFormatting(metadata: FormattingMetadata): FormattingMetadata
  adaptDeliveryHint(hint: DeliveryHint): DeliveryHint
}

/** Reserved channel adapter contract — implementations deferred to integration layers. */
export interface VoiceChannelAdapter extends ChannelAdapter {
  readonly channel: 'voice'
}

export interface EmailChannelAdapter extends ChannelAdapter {
  readonly channel: 'email'
}

export interface SmsChannelAdapter extends ChannelAdapter {
  readonly channel: 'sms'
}

let messageCounter = 0

function createMessageId(): string {
  messageCounter += 1
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `msg_${crypto.randomUUID()}`
  }
  return `msg_${Date.now()}_${messageCounter}`
}

export class CommunicationFormatter {
  private readonly channelAdapters = new Map<CommunicationChannel, ChannelAdapter>()

  registerChannelAdapter(adapter: ChannelAdapter): () => void {
    this.channelAdapters.set(adapter.channel, adapter)
    return () => {
      this.channelAdapters.delete(adapter.channel)
    }
  }

  validateTemplate(
    template: CommunicationTemplate,
    variables: CommunicationVariables,
  ): FormatValidationResult {
    const missingVariables = template.requiredVariables.filter(
      (key) => variables[key] === undefined || variables[key] === '',
    )
    const warnings: string[] = []

    if (!template.drcsChecklistId) {
      warnings.push(`Template "${template.templateKey}" has no DRCS checklist reference.`)
    }

    return {
      valid: missingVariables.length === 0,
      missingVariables,
      warnings,
    }
  }

  extractVariables(
    recommendation: GuidanceRecommendation,
    conversationContext: ConversationContext,
  ): CommunicationVariables {
    const variables: Record<string, string | number | boolean> = {
      objective: conversationContext.currentObjective,
      clarificationReason: recommendation.reason,
    }

    if (conversationContext.currentKarkun?.karkunName) {
      variables.karkunName = conversationContext.currentKarkun.karkunName
    }
    if (conversationContext.currentKarkun?.karkunId) {
      variables.karkunId = conversationContext.currentKarkun.karkunId
    }
    if (conversationContext.currentCampaign?.campaignName) {
      variables.campaignName = conversationContext.currentCampaign.campaignName
    }
    if (conversationContext.currentCampaign?.campaignDayLabel) {
      variables.campaignDayLabel = conversationContext.currentCampaign.campaignDayLabel
    }
    if (conversationContext.currentMeeting?.label) {
      variables.meetingLabel = conversationContext.currentMeeting.label
    }

    const deferredCount = conversationContext.sessionMetadata.deferredTopics?.length ?? 0
    if (deferredCount > 0) {
      variables.deferredTopicCount = deferredCount
    }

    if (recommendation.metadata?.confirmationId) {
      variables.confirmationId = String(recommendation.metadata.confirmationId)
    }
    if (recommendation.metadata?.deferredTopicCount !== undefined) {
      variables.deferredTopicCount = Number(recommendation.metadata.deferredTopicCount)
    }

    variables.confirmationSummary = recommendation.reason

    return variables
  }

  formatMessage(input: FormatMessageInput): CommunicationMessage | null {
    const variables = this.extractVariables(
      input.recommendation,
      input.conversationContext,
    )

    const validation = this.validateTemplate(input.template, variables)
    if (!validation.valid) {
      return null
    }

    const tone = this.resolveTone(input.template.defaultTone, input.recommendation.blocking)
    const deliveryHint = this.resolveDeliveryHint(input.recommendation, input.channel)
    const formattingMetadata = this.adaptFormattingForChannel(
      input.template.formattingMetadata,
      input.channel,
    )

    return {
      id: createMessageId(),
      templateKey: input.template.templateKey,
      localizationKey: input.template.localizationKey,
      channel: input.channel,
      tone,
      priority: input.recommendation.priority,
      variables,
      formattingMetadata,
      deliveryHint,
      sequenceOrder: input.sequenceOrder,
      recommendationId: input.recommendation.id,
      metadata: {
        locale: input.localization.locale,
        reason: input.recommendation.reason,
        validationWarnings: validation.warnings,
      },
    }
  }

  orderMessages(messages: CommunicationMessage[]): CommunicationMessage[] {
    return [...messages].sort((a, b) => {
      const priorityDiff =
        COMMUNICATION_PRIORITY_RANK[b.priority] - COMMUNICATION_PRIORITY_RANK[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return a.sequenceOrder - b.sequenceOrder
    })
  }

  assignSequence(messages: CommunicationMessage[]): CommunicationMessage[] {
    const ordered = this.orderMessages(messages)
    return ordered.map((message, index) => ({
      ...message,
      sequenceOrder: index + 1,
    }))
  }

  private resolveTone(
    defaultTone: CommunicationTone,
    blocking: boolean,
  ): CommunicationTone {
    return blocking ? 'formal' : defaultTone
  }

  private resolveDeliveryHint(
    recommendation: GuidanceRecommendation,
    channel: CommunicationChannel,
  ): DeliveryHint {
    if (recommendation.blocking) return 'requires_confirmation'
    if (channel === 'notification' || channel === 'whatsapp') return 'deferred'
    if (channel === 'report') return 'batch'
    if (recommendation.category === 'reminder') return 'deferred'
    return 'immediate'
  }

  private adaptFormattingForChannel(
    metadata: FormattingMetadata,
    channel: CommunicationChannel,
  ): FormattingMetadata {
    const adapter = this.channelAdapters.get(channel)
    if (adapter) {
      return adapter.adaptFormatting({ ...metadata })
    }

    switch (channel) {
      case 'whatsapp':
        return { ...metadata, maxLength: Math.min(metadata.maxLength ?? 300, 300) }
      case 'notification':
        return { ...metadata, maxLength: Math.min(metadata.maxLength ?? 200, 200) }
      case 'report':
        return { ...metadata, allowRichText: true, lineBreaks: 'paragraph' }
      default:
        return { ...metadata }
    }
  }
}

export function createCommunicationFormatter(): CommunicationFormatter {
  return new CommunicationFormatter()
}
