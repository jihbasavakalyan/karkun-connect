/**
 * Module 6 — Advanced Conversation helpers
 * Pronouns/context already in mvp/pronouns + session; this adds clarification,
 * context switching, and multi-intent splitting — still keyword deterministic.
 */

import type { RafeeqSessionMemory } from '../session'

const CLARIFY_PATTERNS =
  /^(اور|and|what about|بتاو?|وضاحت|explain( more)?|why\??|کیوں|continue|جاری)\b/i

const CONTEXT_SWITCH =
  /\b(what about|and|اور|regarding|about)\s+(.+)/i

export function isClarificationUtterance(raw: string): boolean {
  const t = raw.trim()
  return (
    CLARIFY_PATTERNS.test(t) ||
    /^(کیوں|why|explain more|continue|جاری رکھیں)$/i.test(t)
  )
}

export function detectContextSwitchTopic(raw: string): string | null {
  const m = raw.trim().match(CONTEXT_SWITCH)
  if (!m?.[2]) return null
  return m[2].trim()
}

/** Split compound intents joined by "and" / Urdu و / اور */
export function splitMultipleIntents(raw: string): readonly string[] {
  const parts = raw
    .split(/\s+(?:and|اور|&)\s+/i)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2)
  return parts.length > 1 ? Object.freeze(parts) : Object.freeze([raw.trim()])
}

export function resolveClarificationFocus(
  memory: RafeeqSessionMemory,
  utterance: string,
): {
  readonly topic: string | null
  readonly personName: string | null
  readonly intentHint: string | null
} {
  const switched = detectContextSwitchTopic(utterance)
  return {
    topic: switched ?? memory.lastCampaignTopic ?? memory.followUpHint,
    personName: memory.lastPersonName,
    intentHint: memory.lastIntentCode,
  }
}

export function advanceConversationMemory(
  memory: RafeeqSessionMemory,
  utterance: string,
  intentCode: string,
  options?: {
    campaignTopic?: string | null
    followUpHint?: string | null
  },
): void {
  memory.lastUtterance = utterance
  memory.lastIntentCode = intentCode
  if (options?.campaignTopic) memory.lastCampaignTopic = options.campaignTopic
  if (options?.followUpHint !== undefined) {
    memory.followUpHint = options.followUpHint
  }
}
