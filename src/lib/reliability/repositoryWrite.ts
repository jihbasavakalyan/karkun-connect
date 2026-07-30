/**
 * KC-028B — Shared repository write helper.
 *
 * Repositories / services should not invent per-feature ACK / retry / busy logic.
 * Call `commitRepositoryWrite` after mutating SyncCache + queueWrite, or wrap the
 * whole mutation in `work` with the matching queue label(s).
 */

import {
  runWriteLifecycle,
  type RunWriteLifecycleOptions,
  type WriteLifecycleResult,
} from '@/lib/reliability/writeLifecycle'

export type CommitRepositoryWriteOptions<T> = {
  /** Stable exclusive key (also used for duplicate-submit coalesce). */
  key: string
  operation: string
  repository: string
  documentId?: string
  /** Queue label(s) flushed for Server ACK after `work`. */
  queueLabels: string | string[]
  maxAttempts?: number
  validate?: () => void | Promise<void>
  refreshRepos?: () => void | Promise<void>
  refreshCounters?: () => void | Promise<void>
  refreshUi?: () => void | Promise<void>
  work: () => Promise<T>
}

/**
 * Canonical repository-facing write lifecycle:
 * validate → write → Firestore ACK → optional refresh hooks.
 */
export function commitRepositoryWrite<T>(
  options: CommitRepositoryWriteOptions<T>,
): Promise<WriteLifecycleResult<T>> {
  const labels = Array.isArray(options.queueLabels)
    ? options.queueLabels
    : [options.queueLabels]

  const lifecycleOptions: RunWriteLifecycleOptions<T> = {
    key: options.key,
    operation: options.operation,
    repository: options.repository,
    documentId: options.documentId,
    queueLabels: labels,
    maxAttempts: options.maxAttempts,
    validate: options.validate,
    refreshRepos: options.refreshRepos,
    refreshCounters: options.refreshCounters,
    refreshUi: options.refreshUi,
    work: options.work,
  }

  return runWriteLifecycle(lifecycleOptions)
}

/** Await a specific Firestore write-queue label (Server ACK). */
export async function awaitRepositoryCommit(queueLabel: string): Promise<void> {
  try {
    const { awaitQueuedWrite } = await import(
      '@/repositories/firestore/firestoreRepositories'
    )
    await awaitQueuedWrite(queueLabel)
  } catch {
    // local / tests without Firestore queue
  }
}

export const REPOSITORY_QUEUE = {
  connections: 'connections',
  karkuns: 'karkuns',
  rukns: 'rukns',
  communications: 'communications',
  karkunRequests: 'settings.karkunRequests',
  annexure: 'executions.annexure',
  guidance: 'executions.guidance',
  weeklyIjtemaSubmissions: 'compliance.weeklyIjtemaSubmissions',
  monthlyBaitulMaalSubmissions: 'compliance.monthlyBaitulMaalSubmissions',
} as const
