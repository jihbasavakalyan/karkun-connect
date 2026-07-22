/**
 * KC-0084 — Surface durable execution write failures to the UI (no silent failures).
 */

export const EXECUTION_PERSIST_FAILED_EVENT = 'kc-execution-persist-failed'

export type ExecutionPersistFailedDetail = {
  label: string
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
