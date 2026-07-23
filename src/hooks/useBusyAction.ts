/**
 * KC-0098 — Immediate click acknowledgement + single-action lock for write UIs.
 */

import { useCallback, useRef, useState } from 'react'
import {
  endAction,
  markActionAck,
  settleUiAction,
  tryBeginAction,
} from '@/lib/reliability/singleActionGuard'

type RunOptions = {
  /** Unique key for this control/operation (blocks duplicate clicks). */
  key: string
  /** Minimum time the control stays busy (default 350ms). */
  minMs?: number
  /** Wait for Firestore pending writes to drain before re-enabling. */
  waitForPendingWrites?: boolean
}

/**
 * Use on every destructive/write control.
 * First click: busy=true immediately (sync ref) → run work → settle → re-enable.
 * Extra clicks while busy are ignored.
 */
export function useBusyAction() {
  const [busy, setBusy] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const busyRef = useRef(false)

  const run = useCallback(
    async <T,>(
      work: () => T | Promise<T>,
      options: RunOptions,
    ): Promise<T | undefined> => {
      const started = performance.now()
      if (busyRef.current) return undefined
      if (!tryBeginAction(options.key, options.minMs ?? 350)) return undefined

      busyRef.current = true
      setBusy(true)
      setBusyKey(options.key)
      markActionAck(options.key, started)

      try {
        const result = await work()
        await settleUiAction({
          minMs: options.minMs,
          waitForPendingWrites: options.waitForPendingWrites,
          key: options.key,
        })
        return result
      } finally {
        endAction(options.key)
        busyRef.current = false
        setBusy(false)
        setBusyKey(null)
      }
    },
    [],
  )

  return {
    busy,
    busyKey,
    run,
    isBusyKey: (key: string) => busy && busyKey === key,
  }
}
