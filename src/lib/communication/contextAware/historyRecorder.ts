/**
 * KC-0119 — HistoryRecorder for context-aware Send actions.
 */

import { getActiveCampaignName } from '@/services/campaignService'
import { appendContextAwareHistoryRecord } from './historyStore'
import type {
  CommunicationContextId,
  ContextAwareDeliveryChannel,
  ContextAwareDeliveryResult,
  ContextAwareHistoryRecord,
  ContextAwareRecipientType,
  GeneratedCommunication,
} from './types'

function createId(): string {
  return `cah-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export type RecordContextAwareHistoryInput = {
  draft: GeneratedCommunication
  generatedMessage: string
  finalMessage: string
  channel: ContextAwareDeliveryChannel
  sentBy: string
  delivery: ContextAwareDeliveryResult
}

export function recordContextAwareHistory(
  input: RecordContextAwareHistoryInput,
): ContextAwareHistoryRecord {
  const edited = input.generatedMessage.trim() !== input.finalMessage.trim()
  const status =
    input.delivery.status === 'failed'
      ? 'Failed'
      : input.delivery.status === 'launched'
        ? 'Sent'
        : 'Prepared'

  const record: ContextAwareHistoryRecord = {
    id: createId(),
    timestamp: new Date().toISOString(),
    campaign: getActiveCampaignName() || 'No active campaign',
    context: input.draft.context,
    contextLabel: input.draft.communicationTypeLabel,
    recipientType: input.draft.recipientType,
    recipientCount: input.draft.recipients.length,
    recipientNames: input.draft.recipients.map((item) => item.name),
    channel: input.channel,
    generatedMessage: input.generatedMessage,
    finalMessage: input.finalMessage,
    edited,
    sentBy: input.sentBy,
    status,
    editorialStatus: input.draft.editorial.status,
    deliveryDetail: input.delivery.detail,
  }

  return appendContextAwareHistoryRecord(record)
}

export function historyContextLabel(context: CommunicationContextId): string {
  return context
}

export function historyRecipientTypeLabel(type: ContextAwareRecipientType): string {
  return type
}
