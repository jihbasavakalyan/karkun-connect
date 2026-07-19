/**
 * KC-0058 — Append-only connection lifecycle ledger (service API).
 */

import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'
import type {
  ConnectionLedgerEntry,
  ConnectionLedgerEventType,
} from '@/types/connectionLedger.types'
import { ACTIVE_CAMPAIGN_ID } from '@/types/assignment.types'

export type AppendLedgerInput = {
  eventType: ConnectionLedgerEventType
  performedBy: string
  assignmentId?: string | null
  connectionId?: string | null
  ruknId?: string | null
  karkunId?: string | null
  campaignId?: string | null
  metadata?: Record<string, unknown>
}

export function appendConnectionLedgerEntry(input: AppendLedgerInput): ConnectionLedgerEntry {
  const entry: ConnectionLedgerEntry = {
    ledgerId: `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    campaignId: input.campaignId ?? ACTIVE_CAMPAIGN_ID ?? null,
    connectionId: input.connectionId ?? input.assignmentId ?? null,
    assignmentId: input.assignmentId ?? null,
    ruknId: input.ruknId ?? null,
    karkunId: input.karkunId ?? null,
    eventType: input.eventType,
    performedBy: input.performedBy.trim() || 'Administrator',
    metadata: input.metadata ?? {},
  }

  const result = getRepositories().connectionLedger.append(entry)
  if (!result.ok) {
    console.error('[KC-0058] connectionLedger append failed:', result.error.message)
  }
  return entry
}

export function getRecentConnectionLedger(limit = 50): ConnectionLedgerEntry[] {
  return unwrapRepository(getRepositories().connectionLedger.loadRecent(limit), [])
}
