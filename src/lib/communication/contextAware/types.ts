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

/** KC-0119 — Editorial Validator result attached to generated drafts. */
export type EditorialValidationResult = {
  ok: boolean
  status: 'Editorial Approved' | 'Editorial Review Required'
  failedRules: Array<{
    id: string
    label: string
    passed: boolean
    detail: string
  }>
  allRules: Array<{
    id: string
    label: string
    passed: boolean
    detail: string
  }>
}

export type GeneratedCommunication = {
  context: CommunicationContextId
  communicationTypeLabel: string
  recipientType: ContextAwareRecipientType
  recipients: MessageRecipient[]
  audienceLabel: string
  pendingMatters: ContextAwarePendingMatter[]
  /** Original generated Urdu body (before optional edit). */
  generatedMessage: string
  /** Current message body (same as generated until edited). */
  message: string
  defaultChannel: ContextAwareDeliveryChannel
  supportedChannels: ContextAwareDeliveryChannel[]
  /** KC-0119 — Editorial Validator result for the current message. */
  editorial: EditorialValidationResult
}

export type ContextAwareHistoryStatus = 'Prepared' | 'Sent' | 'Failed'

export type ContextAwareHistoryRecord = {
  id: string
  timestamp: string
  campaign: string
  context: CommunicationContextId
  contextLabel: string
  recipientType: ContextAwareRecipientType
  recipientCount: number
  recipientNames: string[]
  channel: ContextAwareDeliveryChannel
  generatedMessage: string
  finalMessage: string
  edited: boolean
  sentBy: string
  status: ContextAwareHistoryStatus
  editorialStatus: EditorialValidationResult['status']
  deliveryDetail?: string
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
