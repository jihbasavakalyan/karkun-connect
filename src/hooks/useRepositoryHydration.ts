import { useEffect, useState } from 'react'
import {
  isRepositoryHydrationReady,
  subscribeToRepositoryHydration,
} from '@/repositories/hydrationReady'

/** True after startup repository hydration has finished (or local provider is active). */
export function useRepositoryHydration(): boolean {
  const [ready, setReady] = useState(isRepositoryHydrationReady)

  useEffect(() => {
    return subscribeToRepositoryHydration(() => {
      setReady(true)
    })
  }, [])

  return ready
}
