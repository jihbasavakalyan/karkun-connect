import { markStartupLifecycle } from '@/lib/startupLifecycleTrace'

type HydrationListener = () => void

let ready = false
const listeners = new Set<HydrationListener>()

export function isBackgroundHydrationReady(): boolean {
  return ready
}

export function markBackgroundHydrationReady(): void {
  if (ready) {
    return
  }
  ready = true
  markStartupLifecycle('backgroundHydrate.ready')
  listeners.forEach((listener) => listener())
}

export function subscribeToBackgroundHydration(listener: HydrationListener): () => void {
  listeners.add(listener)
  if (ready) {
    listener()
  }
  return () => {
    listeners.delete(listener)
  }
}

/** Test-only reset. */
export function resetBackgroundHydrationReadyForTests(): void {
  ready = false
}
