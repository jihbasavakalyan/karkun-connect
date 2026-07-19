/**
 * KC-0058 — Append-only connection lifecycle ledger.
 */

export type ConnectionLedgerEventType =
  | 'CONNECTED'
  | 'TRANSFERRED'
  | 'RESTORED'
  | 'ARCHIVED'
  | 'UNARCHIVED'
  | 'DISCONNECTED'

export type ConnectionLedgerEntry = {
  ledgerId: string
  timestamp: string
  campaignId: string | null
  connectionId: string | null
  assignmentId: string | null
  ruknId: string | null
  karkunId: string | null
  eventType: ConnectionLedgerEventType
  performedBy: string
  metadata: Record<string, unknown>
}
