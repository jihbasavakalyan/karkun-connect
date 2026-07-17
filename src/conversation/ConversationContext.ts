/**
 * Conversation context interfaces for the Digital Rafeeq Conversation Layer.
 *
 * Purpose: Define session-scoped context slots without repository population.
 * Typical usage: Passed to ConversationSession; updated via ConversationEngine.updateContext.
 * Future extension: Knowledge Manager populates refs from repository reads in Phase 2.
 */

import type { ConversationObjective, ConversationRole } from './ConversationTypes'

/** Minimal user reference — not tied to AuthUser to keep layer independent. */
export type ConversationUserRef = {
  id: string
  displayName?: string
}

/** Active campaign reference — IDs and labels only; no repository fetch. */
export type ConversationCampaignRef = {
  campaignId?: string
  campaignName?: string
  campaignDayLabel?: string
}

/** Karkun (Connected Karkun) focus for the current segment — "Current Worker" in KC-003 docs. */
export type ConversationKarkunRef = {
  karkunId?: string
  karkunName?: string
}

/** Meeting or visit in focus for the current segment. */
export type ConversationMeetingRef = {
  meetingId?: string
  karkunId?: string
  scheduledAt?: string
  label?: string
}

/** Session-level metadata — timing, deferrals, channel hints. */
export type ConversationSessionMetadata = {
  channel?: 'in_app' | 'voice' | 'whatsapp' | 'unknown'
  startedAt: number
  lastActivityAt: number
  deferredTopics?: readonly string[]
  interruptedAt?: number
  locale?: string
}

/** Reserved keys for forward-compatible context extensions. */
export type ConversationFutureExtensions = Readonly<Record<string, unknown>>

/**
 * Full conversation context model per KC-003 §6.
 * Fields are optional until populated by future Knowledge Manager integration.
 */
export type ConversationContext = {
  currentUser?: ConversationUserRef
  currentRole?: ConversationRole
  currentCampaign?: ConversationCampaignRef
  currentObjective: ConversationObjective
  currentKarkun?: ConversationKarkunRef
  currentMeeting?: ConversationMeetingRef
  sessionMetadata: ConversationSessionMetadata
  extensions: ConversationFutureExtensions
}

export function createEmptyConversationContext(
  overrides?: Partial<ConversationContext>,
): ConversationContext {
  const now = Date.now()
  const { sessionMetadata, extensions, ...rest } = overrides ?? {}

  return {
    currentObjective: 'none',
    sessionMetadata: {
      channel: 'unknown',
      startedAt: now,
      lastActivityAt: now,
      locale: 'ur',
      ...sessionMetadata,
    },
    extensions: extensions ?? {},
    ...rest,
  }
}
