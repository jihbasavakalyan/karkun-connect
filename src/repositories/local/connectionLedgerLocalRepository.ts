import type { ConnectionLedgerEntry } from '@/types/connectionLedger.types'
import type { ConnectionLedgerRepository } from '@/repositories/interfaces/ConnectionLedgerRepository'
import { tryRepository, type RepositoryResult } from '@/repositories/errors'
import { STORAGE_KEYS } from '@/repositories/storageKeys'
import { loadJsonFromStorage, saveJsonToStorage } from '@/lib/browserStorage'

export class ConnectionLedgerLocalRepository implements ConnectionLedgerRepository {
  append(entry: ConnectionLedgerEntry): RepositoryResult<ConnectionLedgerEntry> {
    return tryRepository(() => {
      const existing = loadJsonFromStorage<ConnectionLedgerEntry[]>(
        STORAGE_KEYS.connectionLedger,
        [],
      )
      if (existing.some((row) => row.ledgerId === entry.ledgerId)) {
        throw new Error(`Duplicate ledgerId ${entry.ledgerId}`)
      }
      const next = [entry, ...existing].slice(0, 5000)
      saveJsonToStorage(STORAGE_KEYS.connectionLedger, next)
      return entry
    })
  }

  loadRecent(limit = 50): RepositoryResult<ConnectionLedgerEntry[]> {
    return tryRepository(() => {
      const existing = loadJsonFromStorage<ConnectionLedgerEntry[]>(
        STORAGE_KEYS.connectionLedger,
        [],
      )
      return existing.slice(0, Math.max(1, limit))
    })
  }
}

/** Test helper — does not delete production Firestore history. */
export function clearLocalConnectionLedgerForTests(): RepositoryResult<void> {
  return tryRepository(() => {
    saveJsonToStorage(STORAGE_KEYS.connectionLedger, [])
    return undefined
  })
}

export function peekLocalConnectionLedger(): ConnectionLedgerEntry[] {
  return loadJsonFromStorage<ConnectionLedgerEntry[]>(STORAGE_KEYS.connectionLedger, [])
}
