/**
 * Module 10 — Conversation History
 * Ephemeral session history (DRDS: not durable SoR). Extends session memory.
 */

import type { RafeeqAction } from '../types'
import type { RafeeqSessionMemory } from '../session'
import type { ConversationHistorySnapshot } from './types'

export type ExtendedHistoryMemory = RafeeqSessionMemory & {
  conversationLog: string[]
  recentActionLog: RafeeqAction[]
  pinnedConversations: string[]
}

const extended = new WeakMap<RafeeqSessionMemory, ExtendedHistoryMemory>()

function asExtended(memory: RafeeqSessionMemory): ExtendedHistoryMemory {
  let ext = extended.get(memory)
  if (!ext) {
    ext = memory as ExtendedHistoryMemory
    if (!Array.isArray(ext.conversationLog)) ext.conversationLog = []
    if (!Array.isArray(ext.recentActionLog)) ext.recentActionLog = []
    if (!Array.isArray(ext.pinnedConversations)) ext.pinnedConversations = []
    extended.set(memory, ext)
  }
  return ext
}

export function recordConversationTurn(
  memory: RafeeqSessionMemory,
  utterance: string,
): void {
  const ext = asExtended(memory)
  const trimmed = utterance.trim()
  if (!trimmed) return
  ext.conversationLog = [trimmed, ...ext.conversationLog.filter((u) => u !== trimmed)].slice(
    0,
    20,
  )
}

export function recordHistoryAction(
  memory: RafeeqSessionMemory,
  action: RafeeqAction,
): void {
  const ext = asExtended(memory)
  ext.recentActionLog = [action, ...ext.recentActionLog].slice(0, 12)
}

export function pinConversation(
  memory: RafeeqSessionMemory,
  label: string,
): void {
  const ext = asExtended(memory)
  const trimmed = label.trim()
  if (!trimmed) return
  ext.pinnedConversations = [
    trimmed,
    ...ext.pinnedConversations.filter((p) => p !== trimmed),
  ].slice(0, 8)
}

export function buildConversationHistory(
  memory: RafeeqSessionMemory,
): ConversationHistorySnapshot {
  const ext = asExtended(memory)
  const suggestedFollowUps: string[] = []
  if (memory.lastPersonName) {
    suggestedFollowUps.push(`Call ${memory.lastPersonName}`)
    suggestedFollowUps.push(`Open profile ${memory.lastPersonName}`)
  }
  if (memory.lastCampaignTopic) {
    suggestedFollowUps.push(`Explain more about ${memory.lastCampaignTopic}`)
  }
  if (memory.lastRoute) {
    suggestedFollowUps.push('Open it')
  }
  suggestedFollowUps.push('Daily briefing', 'Show work queue', 'Why?')

  return {
    recentUtterances: Object.freeze([...ext.conversationLog].slice(0, 10)),
    recentSearches: Object.freeze([...memory.recentSearches].slice(0, 8)),
    recentActions: Object.freeze([...ext.recentActionLog].slice(0, 8)),
    pinned: Object.freeze([...ext.pinnedConversations]),
    suggestedFollowUps: Object.freeze(suggestedFollowUps.slice(0, 6)),
  }
}

export function formatHistoryText(snap: ConversationHistorySnapshot): string {
  return [
    'گفتگو کی تاریخ (عارضی):',
    snap.recentUtterances.length
      ? `Recent: ${snap.recentUtterances.slice(0, 5).join(' · ')}`
      : 'Recent: —',
    snap.recentSearches.length
      ? `Searches: ${snap.recentSearches.join(' · ')}`
      : 'Searches: —',
    snap.pinned.length ? `Pinned: ${snap.pinned.join(' · ')}` : 'Pinned: —',
    'Suggested follow-ups:',
    ...snap.suggestedFollowUps.map((s) => `• ${s}`),
  ].join('\n')
}
