import { doc, setDoc } from 'firebase/firestore'
import { getFirestoreDb } from '@/lib/firebase/firestore'
import { repositoryOk, repositoryErr, type RepositoryResult } from '@/repositories/errors'
import type { ConnectionLedgerRepository } from '@/repositories/interfaces/ConnectionLedgerRepository'
import type { ConnectionLedgerEntry } from '@/types/connectionLedger.types'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import { sanitizeForFirestore } from '@/repositories/firestore/firestoreHelpers'

const recent: ConnectionLedgerEntry[] = []
const MAX_RECENT = 200

/**
 * KC-0058 — Append-only Firestore ledger.
 * Never updates or deletes ledger documents.
 */
export class ConnectionLedgerFirestoreRepository implements ConnectionLedgerRepository {
  append(entry: ConnectionLedgerEntry): RepositoryResult<ConnectionLedgerEntry> {
    if (recent.some((row) => row.ledgerId === entry.ledgerId)) {
      return repositoryErr('Duplicate', `Duplicate ledgerId ${entry.ledgerId}`)
    }
    recent.unshift(entry)
    if (recent.length > MAX_RECENT) recent.length = MAX_RECENT

    void setDoc(
      doc(getFirestoreDb(), FIRESTORE_COLLECTIONS.connectionLedger, entry.ledgerId),
      sanitizeForFirestore(entry),
    ).catch((error) => {
      console.error('[KC-0058] connectionLedger write failed:', error)
    })

    return repositoryOk(entry)
  }

  loadRecent(limit = 50): RepositoryResult<ConnectionLedgerEntry[]> {
    return repositoryOk(recent.slice(0, Math.max(1, limit)))
  }
}
