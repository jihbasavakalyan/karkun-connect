import { useCallback, useEffect, useState } from 'react'
import {
  getRepositoryHydrationFailureMessage,
  getRepositoryHydrationStatus,
  isRepositoryHydrationReady,
  subscribeToRepositoryHydration,
  type RepositoryHydrationStatus,
} from '@/repositories/hydrationReady'

/** True after startup repository hydration has finished successfully. */
export function useRepositoryHydration(): boolean {
  const [ready, setReady] = useState(isRepositoryHydrationReady)

  useEffect(() => {
    return subscribeToRepositoryHydration(() => {
      setReady(isRepositoryHydrationReady())
    })
  }, [])

  return ready
}

/** KC-0058.3 — full critical hydration status for error/retry UI. */
export function useRepositoryHydrationStatus(): {
  status: RepositoryHydrationStatus
  ready: boolean
  failed: boolean
  error: string | null
  retry: () => void
} {
  const [status, setStatus] = useState(getRepositoryHydrationStatus)
  const [error, setError] = useState(getRepositoryHydrationFailureMessage)

  useEffect(() => {
    return subscribeToRepositoryHydration(() => {
      setStatus(getRepositoryHydrationStatus())
      setError(getRepositoryHydrationFailureMessage())
    })
  }, [])

  const retry = useCallback(() => {
    window.location.reload()
  }, [])

  return {
    status,
    ready: status === 'ready',
    failed: status === 'failed',
    error,
    retry,
  }
}
