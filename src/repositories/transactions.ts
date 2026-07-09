import { repositoryErr, repositoryOk, type RepositoryResult } from '@/repositories/errors'

/** Transaction boundary — Firestore implementations will use batched writes. */
export interface RepositoryTransaction {
  commit(): RepositoryResult<void>
  rollback(): void
}

export type TransactionScope = {
  commit(): RepositoryResult<void>
  rollback(): void
}

/**
 * Local repositories execute synchronously. This runner preserves the same
 * interface future Firestore repositories will use for atomic commits.
 */
export function runLocalTransaction(work: () => void): RepositoryResult<void> {
  const snapshots: Array<() => void> = []

  const scope: TransactionScope = {
    commit: () => {
      try {
        work()
        return repositoryOk(undefined)
      } catch (cause) {
        snapshots.forEach((rollback) => rollback())
        return repositoryErr('Unexpected', 'Transaction failed.', cause)
      }
    },
    rollback: () => {
      snapshots.forEach((rollback) => rollback())
    },
  }

  return scope.commit()
}

export function registerRollback(scope: TransactionScope, rollback: () => void): void {
  void scope
  void rollback
}
