/**
 * KC-0118 / KC-0119 — MessageComposer step of the Communication Engine.
 * Builds Urdu body from context + pending matters, then runs EditorialValidator.
 */

import type { MessageRecipient } from '@/types/communication'
import { resolveCommunicationContextFromMissionItemId } from './contextResolver'
import { validateEditorialMessage } from './editorialValidator'
import {
  buildContextAwareUrduMessage,
  CONTEXT_TYPE_LABELS,
  recipientTypeLabel,
} from './messageBuilder'
import { aggregatePendingMatters, pendingMatter } from './pendingMatterAggregator'
import type {
  CommunicationContextId,
  ContextAwareCommunicationInput,
  ContextAwareDeliveryChannel,
  GeneratedCommunication,
} from './types'

const SUPPORTED_CHANNELS: ContextAwareDeliveryChannel[] = ['whatsapp', 'sms']

export function composeContextAwareCommunication(
  input: ContextAwareCommunicationInput,
): GeneratedCommunication {
  const recipients = dedupeRecipients(input.recipients)
  const pendingMatters = aggregatePendingMatters(input.pendingMatters)
  const audienceLabel =
    input.audienceLabel?.trim() ||
    (recipients.length === 1
      ? recipients[0].name
      : recipients.length > 1
        ? `${recipients.length} ${recipientTypeLabel(input.recipientType)}`
        : recipientTypeLabel(input.recipientType))

  const message = buildContextAwareUrduMessage({
    context: input.context,
    recipientName: recipients.length === 1 ? recipients[0].name : undefined,
    pendingMatters,
  })

  const editorial = validateEditorialMessage(message, {
    pendingMatterCount: pendingMatters.length,
  })

  return {
    context: input.context,
    communicationTypeLabel: CONTEXT_TYPE_LABELS[input.context],
    recipientType: input.recipientType,
    recipients,
    audienceLabel,
    pendingMatters,
    generatedMessage: message,
    message,
    defaultChannel: 'whatsapp',
    supportedChannels: [...SUPPORTED_CHANNELS],
    editorial,
  }
}

export { pendingMatter }

/** @deprecated Prefer resolveCommunicationContextFromMissionItemId */
export function communicationContextFromMissionItemId(
  itemId: string,
): CommunicationContextId | null {
  return resolveCommunicationContextFromMissionItemId(itemId)
}

function dedupeRecipients(recipients: MessageRecipient[]): MessageRecipient[] {
  const seen = new Set<string>()
  const out: MessageRecipient[] = []
  for (const recipient of recipients) {
    const key = `${recipient.personKind}:${recipient.personId}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(recipient)
  }
  return out
}
