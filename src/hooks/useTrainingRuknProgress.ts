import { useCallback, useEffect, useState } from 'react'
import { getFirebaseAuth } from '@/lib/firebase/firebase'
import { fetchTrainingRegistrationRuknProgress } from '@/lib/publicRegistration/client'
import type { TrainingRuknProgressView } from '@/lib/publicRegistration/types'

type TrainingRuknProgressState = 'loading' | 'ready' | 'error'

export function useTrainingRuknProgress() {
  const [status, setStatus] = useState<TrainingRuknProgressState>('loading')
  const [progress, setProgress] = useState<TrainingRuknProgressView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const retry = useCallback(() => {
    setReloadKey((value) => value + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setProgress(null)
    setError(null)

    void (async () => {
      try {
        const token = await getFirebaseAuth().currentUser?.getIdToken()
        if (!token) {
          throw new Error('Please sign in again.')
        }
        const result = await fetchTrainingRegistrationRuknProgress(token)
        if (cancelled) return
        setProgress(result.progress)
        setStatus('ready')
      } catch (caught) {
        if (cancelled) return
        setProgress(null)
        setError(
          caught instanceof Error ? caught.message : 'Unable to load registration progress.',
        )
        setStatus('error')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  return { status, progress, error, retry }
}
