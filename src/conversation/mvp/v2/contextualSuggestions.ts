/**
 * Module 15 — Contextual Suggestions
 * After every response suggest relevant next steps.
 */

import type { RafeeqSessionMemory } from '../session'
import type { RafeeqAction, RafeeqRole } from '../types'
import { buildSmartQuickActions } from './quickActions'

const ALWAYS: Array<{ id: string; label: string; utterance: string }> = [
  { id: 'sug-brief', label: 'Daily briefing', utterance: 'Daily briefing' },
  { id: 'sug-queue', label: 'Show pending visits', utterance: 'Show work queue' },
  { id: 'sug-ijtema', label: 'Weekly Ijtema', utterance: 'Weekly Ijtema status' },
  { id: 'sug-campaign', label: 'Open Campaign', utterance: 'Open Campaign' },
  { id: 'sug-att', label: 'View Attendance', utterance: 'Open Attendance' },
]

export function buildContextualSuggestions(
  role: RafeeqRole,
  memory: RafeeqSessionMemory,
  lastIntentCode: string | null,
): {
  readonly utterances: readonly string[]
  readonly actions: readonly RafeeqAction[]
} {
  const utterances: string[] = []
  const actions = [...buildSmartQuickActions(role, memory)]

  if (memory.lastPersonName) {
    utterances.push(`Call ${memory.lastPersonName}`)
    utterances.push(`Open Assignment`)
    utterances.push('Why?')
  }

  if (lastIntentCode === 'REPORT' || lastIntentCode === 'CAMPAIGN_INTEL') {
    utterances.push('Explain more', 'Show work queue', 'Open Campaign')
  }

  if (lastIntentCode === 'SEARCH' || lastIntentCode === 'KARKUN_INFO') {
    utterances.push('Call worker', 'WhatsApp', 'Open Profile')
  }

  for (const a of ALWAYS) {
    if (!utterances.includes(a.utterance)) utterances.push(a.utterance)
  }

  return {
    utterances: Object.freeze(utterances.slice(0, 8)),
    actions: Object.freeze(actions.slice(0, 8)),
  }
}

export function attachSuggestionsMetadata(
  metadata: Record<string, unknown>,
  role: RafeeqRole,
  memory: RafeeqSessionMemory,
  lastIntentCode: string | null,
): Record<string, unknown> {
  const sug = buildContextualSuggestions(role, memory, lastIntentCode)
  return {
    ...metadata,
    contextualSuggestions: sug.utterances,
    contextualSuggestionActions: sug.actions,
  }
}
