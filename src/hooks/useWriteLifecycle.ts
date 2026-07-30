/**
 * KC-028B — React binding for the unified write lifecycle.
 * Immediate busy + Urdu progress + slow warning + duplicate-click prevention.
 */

import { useCallback, useRef, useState } from 'react'
import {
  endAction,
  tryBeginAction,
} from '@/lib/reliability/singleActionGuard'
import {
  runWriteLifecycle,
  writeProgressMessage,
  type RunWriteLifecycleOptions,
  type WriteLifecycleResult,
  type WritePhase,
} from '@/lib/reliability/writeLifecycle'

type RunOptions<T> = Omit<RunWriteLifecycleOptions<T>, 'work'> & {
  work: () => Promise<T>
}

/**
 * Use on every durable write control.
 * First click: busy immediately → lifecycle → re-enable.
 * Extra clicks while busy are ignored (or coalesce via runExclusive key).
 */
export function useWriteLifecycle() {
  const [busy, setBusy] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [phase, setPhase] = useState<WritePhase>('idle')
  const [slow, setSlow] = useState(false)
  const [progressMessage, setProgressMessage] = useState('')
  const busyRef = useRef(false)

  const run = useCallback(async <T,>(options: RunOptions<T>): Promise<WriteLifecycleResult<T> | undefined> => {
    if (busyRef.current) return undefined
    if (!tryBeginAction(options.key, 400)) return undefined

    busyRef.current = true
    setBusy(true)
    setBusyKey(options.key)
    setSlow(false)
    setPhase('submitting')
    setProgressMessage(writeProgressMessage(true, false))

    try {
      return await runWriteLifecycle({
        ...options,
        onPhase: (nextPhase, message) => {
          setPhase(nextPhase)
          if (message) setProgressMessage(message)
          options.onPhase?.(nextPhase, message)
        },
        onSlow: () => {
          setSlow(true)
          setProgressMessage(writeProgressMessage(true, true))
          options.onSlow?.()
        },
      })
    } finally {
      endAction(options.key)
      busyRef.current = false
      setBusy(false)
      setBusyKey(null)
      setPhase('idle')
      setSlow(false)
      setProgressMessage('')
    }
  }, [])

  return {
    busy,
    busyKey,
    phase,
    slow,
    progressMessage,
    run,
    isBusyKey: (key: string) => busy && busyKey === key,
  }
}
