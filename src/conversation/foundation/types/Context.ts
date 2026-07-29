/**
 * Conversation context & turn abstractions (KC-0131.1).
 * Context never expands permissions (DRDS §11.3).
 */

import type { ConversationChannel, ConversationRole } from './ConversationState'
import type { IntentCollection } from './Intent'
import type { ConversationResponse } from './Response'

export type ConversationContext = {
  readonly role: ConversationRole | null
  readonly ruknId: string | null
  readonly activeCampaignId: string | null
  readonly route: string | null
  readonly selectedPersonId: string | null
  readonly selectedConnectionId: string | null
  readonly locale: 'ur' | 'en'
  readonly channel: ConversationChannel
  /** Opaque bag for future adapters — never authoritative SoR. */
  readonly extensions: Readonly<Record<string, unknown>>
}

export type ConversationTurnId = string

export type ConversationTurn = {
  readonly id: ConversationTurnId
  readonly index: number
  readonly startedAt: number
  readonly completedAt: number | null
  readonly inputText: string | null
  readonly intents: IntentCollection | null
  readonly response: ConversationResponse | null
}

export function createEmptyConversationContext(
  patch?: Partial<ConversationContext>,
): ConversationContext {
  return {
    role: patch?.role ?? null,
    ruknId: patch?.ruknId ?? null,
    activeCampaignId: patch?.activeCampaignId ?? null,
    route: patch?.route ?? null,
    selectedPersonId: patch?.selectedPersonId ?? null,
    selectedConnectionId: patch?.selectedConnectionId ?? null,
    locale: patch?.locale ?? 'ur',
    channel: patch?.channel ?? 'text',
    extensions: patch?.extensions ?? {},
  }
}

export function createConversationTurn(
  index: number,
  options?: Partial<Omit<ConversationTurn, 'index'>>,
): ConversationTurn {
  return {
    id: options?.id ?? `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    index,
    startedAt: options?.startedAt ?? Date.now(),
    completedAt: options?.completedAt ?? null,
    inputText: options?.inputText ?? null,
    intents: options?.intents ?? null,
    response: options?.response ?? null,
  }
}
