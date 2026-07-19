import type { ConnectionLedgerEntry } from '@/types/connectionLedger.types'
import type { RepositoryResult } from '@/repositories/errors'

/**
 * KC-0058 — Append-only connection ledger.
 * Implementations must never update or delete ledger documents.
 */
export interface ConnectionLedgerRepository {
  append(entry: ConnectionLedgerEntry): RepositoryResult<ConnectionLedgerEntry>
  loadRecent(limit?: number): RepositoryResult<ConnectionLedgerEntry[]>
}
