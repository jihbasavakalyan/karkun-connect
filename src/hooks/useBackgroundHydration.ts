import { useEffect, useState } from 'react'
import {
  isBackgroundHydrationReady,
  subscribeToBackgroundHydration,
} from '@/repositories/backgroundHydrationReady'

/** True after non-critical Firestore collections have hydrated (KC-004B). */
export function useBackgroundHydration(): boolean {
  const [ready, setReady] = useState(isBackgroundHydrationReady)
  useEffect(() => {
    return subscribeToBackgroundHydration(() => {
      setReady(true)
    })
  }, [])
  return ready
}
