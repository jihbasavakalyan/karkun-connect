/**
 * KC-0084 / KC-0091.1 — Surface durable execution write outcomes to the UI.
 * Success feedback waits for pending Firestore writes (no optimistic toast).
 */

import { getPendingWriteCount } from '@/repositories/firestore/offlineSync'

export const EXECUTION_PERSIST_FAILED_EVENT = 'kc-execution-persist-failed'
export const EXECUTION_SAVE_SUCCESS_EVENT = 'kc-execution-save-success'

export type ExecutionPersistFailedDetail = {
  label: string
  message: string
}

export type ExecutionSaveSuccessDetail = {
  message: string
}

export function emitExecutionPersistFailed(label: string, error: unknown): void {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : String(error)

  console.error('[KC-0084] Firestore Write Failed', { label, message, error })

  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<ExecutionPersistFailedDetail>(EXECUTION_PERSIST_FAILED_EVENT, {
      detail: { label, message },
    }),
  )
}

function emitExecutionSaveSuccess(message: string): void {
  if (typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(
    new CustomEvent<ExecutionSaveSuccessDetail>(EXECUTION_SAVE_SUCCESS_EVENT, {
      detail: { message },
    }),
  )
}

/**
 * KC-0091.1 — After sync validation succeeds, wait until durable writes finish.
 * Shows success only if no persist-failed event occurs while pending writes drain.
 */
export async function confirmExecutionSaveFeedback(message: string): Promise<void> {
  if (typeof window === 'undefined') {
    return
  }

  let failed = false
  const onFail = () => {
    failed = true
  }
  window.addEventListener(EXECUTION_PERSIST_FAILED_EVENT, onFail)

  try {
    // Let synchronous queueWrite() bump pendingWrites before we sample.
    await Promise.resolve()
    await Promise.resolve()

    const started = Date.now()
    while (getPendingWriteCount() > 0 && Date.now() - started < 15_000) {
      if (failed) return
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 40)
      })
    }

    if (failed || getPendingWriteCount() > 0) {
      return
    }

    emitExecutionSaveSuccess(message)
  } finally {
    window.removeEventListener(EXECUTION_PERSIST_FAILED_EVENT, onFail)
  }
}
