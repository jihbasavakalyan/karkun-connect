/**
 * KC-0119 — Context-aware communication history (local store).
 * No Firestore / repository changes — session-durable via localStorage.
 */

import type {
  CommunicationContextId,
  ContextAwareDeliveryChannel,
  ContextAwareHistoryRecord,
  ContextAwareHistoryStatus,
  ContextAwareRecipientType,
} from './types'

const STORAGE_KEY = 'kc.contextAware.communicationHistory.v1'
const MAX_RECORDS = 500

type Listener = () => void

let records: ContextAwareHistoryRecord[] = load()
const listeners = new Set<Listener>()

function load(): ContextAwareHistoryRecord[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ContextAwareHistoryRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)))
  } catch {
    // ignore quota / private mode
  }
}

function notify(): void {
  for (const listener of listeners) listener()
}

export function subscribeToContextAwareHistory(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getContextAwareHistoryRecords(): ContextAwareHistoryRecord[] {
  return [...records]
}

export function getContextAwareHistoryRecordById(
  id: string,
): ContextAwareHistoryRecord | null {
  return records.find((item) => item.id === id) ?? null
}

export function appendContextAwareHistoryRecord(
  record: ContextAwareHistoryRecord,
): ContextAwareHistoryRecord {
  records = [record, ...records].slice(0, MAX_RECORDS)
  persist()
  notify()
  return record
}

export type ContextAwareHistoryFilters = {
  date?: string
  campaign?: string
  recipientType?: ContextAwareRecipientType | ''
  context?: CommunicationContextId | ''
  channel?: ContextAwareDeliveryChannel | ''
  status?: ContextAwareHistoryStatus | ''
  search?: string
}

export function filterContextAwareHistory(
  source: ContextAwareHistoryRecord[],
  filters: ContextAwareHistoryFilters,
): ContextAwareHistoryRecord[] {
  let out = source
  if (filters.date) {
    out = out.filter((item) => item.timestamp.slice(0, 10) === filters.date)
  }
  if (filters.campaign) {
    const needle = filters.campaign.trim().toLowerCase()
    out = out.filter((item) => item.campaign.toLowerCase().includes(needle))
  }
  if (filters.recipientType) {
    out = out.filter((item) => item.recipientType === filters.recipientType)
  }
  if (filters.context) {
    out = out.filter((item) => item.context === filters.context)
  }
  if (filters.channel) {
    out = out.filter((item) => item.channel === filters.channel)
  }
  if (filters.status) {
    out = out.filter((item) => item.status === filters.status)
  }
  if (filters.search?.trim()) {
    const needle = filters.search.trim().toLowerCase()
    out = out.filter((item) => {
      const hay = [
        item.campaign,
        item.context,
        item.channel,
        item.status,
        item.sentBy,
        item.recipientNames.join(' '),
        item.finalMessage,
        item.generatedMessage,
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }
  return out
}
