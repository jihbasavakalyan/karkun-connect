/**
 * KC-0118 — Context-Aware Communication Engine (Phase 1).
 * Determines why / who / what from operational context — no template browsing.
 */

import type { MessageRecipient } from '@/types/communication'
import {
  buildContextAwareUrduMessage,
  CONTEXT_TYPE_LABELS,
  recipientTypeLabel,
} from './messageBuilder'
import type {
  CommunicationContextId,
  ContextAwareCommunicationInput,
  ContextAwareDeliveryChannel,
  ContextAwarePendingMatter,
  GeneratedCommunication,
} from './types'

const SUPPORTED_CHANNELS: ContextAwareDeliveryChannel[] = ['whatsapp', 'sms']

export function composeContextAwareCommunication(
  input: ContextAwareCommunicationInput,
): GeneratedCommunication {
  const recipients = dedupeRecipients(input.recipients)
  const pendingMatters = input.pendingMatters.filter((matter) => matter.label.trim())
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

  return {
    context: input.context,
    communicationTypeLabel: CONTEXT_TYPE_LABELS[input.context],
    recipientType: input.recipientType,
    recipients,
    audienceLabel,
    pendingMatters,
    message,
    defaultChannel: 'whatsapp',
    supportedChannels: [...SUPPORTED_CHANNELS],
  }
}

export function communicationContextFromMissionItemId(
  itemId: string,
): CommunicationContextId | null {
  if (itemId.includes('visit')) return 'pending-visits'
  if (itemId.includes('weekly-ijtema') || itemId.includes('ijtema')) {
    return 'pending-weekly-ijtema'
  }
  if (itemId.includes('baitul') || itemId.includes('maal')) return 'pending-baitul-maal'
  if (itemId.includes('app-registration') || itemId.includes('jih')) {
    return 'pending-jih-registration'
  }
  if (itemId.includes('follow-up')) return 'follow-up-pending'
  if (itemId.includes('assignment')) return 'new-assignment'
  if (itemId.includes('activity') || itemId.includes('no-activity')) return 'no-activity'
  return null
}

export function pendingMatter(
  id: string,
  label: string,
): ContextAwarePendingMatter {
  return { id, label }
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
