/**
 * Communication Engine type definitions (KC-004 Sprint 1.4).
 *
 * Purpose: Channel-neutral message models, templates metadata, and composition contracts.
 * Ownership: Communication Engine owns wording selection keys — not rendered copy.
 * Extension points: Localization packs resolve keys in Presentation Layer.
 * Future localization strategy: Urdu-first keys with English fallback pack registration.
 */

import type { ConversationContext } from '../ConversationContext'
import type { GuidanceBundle } from '../guidance'
import type { GuidancePriority } from '../guidance/GuidanceTypes'

/** Supported and reserved communication channels — abstraction only. */
export type CommunicationChannel =
  | 'conversation'
  | 'dashboard'
  | 'notification'
  | 'whatsapp'
  | 'report'
  | 'voice'
  | 'email'
  | 'sms'

/** Active channels for Sprint 1.4 composition. */
export type ActiveCommunicationChannel =
  | 'conversation'
  | 'dashboard'
  | 'notification'
  | 'whatsapp'
  | 'report'

/** Reserved channels for future adapters — interfaces only. */
export type ReservedCommunicationChannel = 'voice' | 'email' | 'sms'

/** DRCS-aligned tone metadata — not rendered prose. */
export type CommunicationTone =
  | 'respectful'
  | 'brief'
  | 'encouraging'
  | 'formal'
  | 'neutral'

export type CommunicationPriority = GuidancePriority

export type LocalizationPreferences = {
  locale: string
  fallbackLocale?: string
  script?: 'latin' | 'arabic' | 'devanagari'
  formality?: 'formal' | 'informal'
}

export type DeliveryHint =
  | 'immediate'
  | 'deferred'
  | 'batch'
  | 'silent'
  | 'requires_confirmation'

export type FormattingMetadata = {
  maxLength?: number
  allowRichText?: boolean
  lineBreaks?: 'single' | 'paragraph'
  emphasisSlots?: readonly string[]
  drcsChecklistId?: string
}

export type CommunicationVariables = Readonly<Record<string, string | number | boolean>>

/**
 * Request to compose a communication plan from structured guidance.
 *
 * Purpose: Transform recommendations into channel-neutral message models.
 * Typical usage: Context Manager forwards after Guidance Engine produces a bundle.
 */
export type CommunicationRequest = {
  guidanceBundle: GuidanceBundle
  conversationContext: ConversationContext
  channel: CommunicationChannel
  localization: LocalizationPreferences
  sessionId?: string
}

export type CommunicationPlanMetadata = {
  planId: string
  composedAt: number
  channel: CommunicationChannel
  locale: string
  messageCount: number
  templateCount: number
  sessionId?: string
}

export type CommunicationMessage = {
  id: string
  templateKey: string
  localizationKey: string
  channel: CommunicationChannel
  tone: CommunicationTone
  priority: CommunicationPriority
  variables: CommunicationVariables
  formattingMetadata: FormattingMetadata
  deliveryHint: DeliveryHint
  sequenceOrder: number
  recommendationId: string
  metadata?: Readonly<Record<string, unknown>>
}

export type TemplateCategory =
  | 'greeting'
  | 'clarification'
  | 'confirmation'
  | 'reminder'
  | 'preparation'
  | 'suggestion'
  | 'encouragement'
  | 'completion'
  | 'recovery'

export const COMMUNICATION_PRIORITY_RANK: Readonly<Record<CommunicationPriority, number>> = {
  critical: 5,
  high: 4,
  normal: 3,
  low: 2,
  background: 1,
}
