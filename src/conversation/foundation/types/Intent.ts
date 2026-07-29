/**
 * Intent abstractions for DRDS Conversation Foundation (KC-0131.1).
 * No intent resolution engine — placeholders for KC-0131.2.
 */

import type { IntentStatus } from './ConversationState'

export type IntentId = string

/** Single conversational intent — unresolved in this sprint. */
export type Intent = {
  readonly id: IntentId
  /** Stable intent code when known; opaque string until Intent Engine exists. */
  readonly code: string
  readonly status: IntentStatus
  /** Raw utterance or system signal text — not interpreted here. */
  readonly utterance?: string
  readonly confidence?: number
  readonly entities?: Readonly<Record<string, unknown>>
  readonly metadata?: Readonly<Record<string, unknown>>
}

/** Ordered collection of intents from one turn or batch. */
export type IntentCollection = {
  readonly intents: readonly Intent[]
  readonly primaryIntentId: IntentId | null
  readonly isMultiIntent: boolean
  readonly createdAt: number
}

export function createIntent(
  partial: Pick<Intent, 'code'> & Partial<Omit<Intent, 'code'>>,
): Intent {
  return {
    id: partial.id ?? `intent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    code: partial.code,
    status: partial.status ?? 'placeholder',
    utterance: partial.utterance,
    confidence: partial.confidence,
    entities: partial.entities,
    metadata: partial.metadata,
  }
}

export function createIntentCollection(
  intents: readonly Intent[],
  createdAt: number = Date.now(),
): IntentCollection {
  return {
    intents,
    primaryIntentId: intents[0]?.id ?? null,
    isMultiIntent: intents.length > 1,
    createdAt,
  }
}
