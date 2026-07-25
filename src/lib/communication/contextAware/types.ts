/**
 * KC-0118 — Context-Aware Communication Engine types (Phase 1).
 * Presentation/compose foundation only — no WhatsApp Business / SMS gateway.
 */

import type { MessageRecipient } from '@/types/communication'

/** Operational contexts that can trigger generated communication. */
export type CommunicationContextId =
  | 'pending-visits'
  | 'pending-weekly-ijtema'
  | 'pending-jih-registration'
  | 'pending-baitul-maal'
  | 'follow-up-pending'
  | 'no-activity'
  | 'new-assignment'

export type ContextAwareRecipientType = 'rukn' | 'karkun' | 'muttafiq'

/** Abstract delivery channels — adapters plug in later without UI redesign. */
export type ContextAwareDeliveryChannel = 'whatsapp' | 'sms'

export type ContextAwarePendingMatter = {
  id: string
  label: string
}

export type ContextAwareCommunicationInput = {
  context: CommunicationContextId
  recipientType: ContextAwareRecipientType
  recipients: MessageRecipient[]
  pendingMatters: ContextAwarePendingMatter[]
  /** Optional display name override when messaging a group. */
  audienceLabel?: string
}

export type GeneratedCommunication = {
  context: CommunicationContextId
  communicationTypeLabel: string
  recipientType: ContextAwareRecipientType
  recipients: MessageRecipient[]
  audienceLabel: string
  pendingMatters: ContextAwarePendingMatter[]
  /** Generated Urdu body (editorial standard). */
  message: string
  defaultChannel: ContextAwareDeliveryChannel
  supportedChannels: ContextAwareDeliveryChannel[]
}

export type ContextAwareDeliveryRequest = {
  channel: ContextAwareDeliveryChannel
  recipients: MessageRecipient[]
  message: string
  context: CommunicationContextId
}

export type ContextAwareDeliveryResult = {
  ok: boolean
  status: 'prepared' | 'launched' | 'unsupported' | 'failed'
  detail: string
  launchedCount?: number
}

export type ContextAwareDeliveryPort = {
  deliver: (request: ContextAwareDeliveryRequest) => Promise<ContextAwareDeliveryResult>
}
