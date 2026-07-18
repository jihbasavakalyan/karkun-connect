import { markStartupLifecycle } from '@/lib/startupLifecycleTrace'

type HydrationListener = () => void

let ready = false
const listeners = new Set<HydrationListener>()

export function isRepositoryHydrationReady(): boolean {
  return ready
}

export function markRepositoryHydrationReady(): void {
  if (ready) {
    return
  }
  ready = true
  markStartupLifecycle('hydrationReady.marked')
  listeners.forEach((listener) => listener())
}

export function subscribeToRepositoryHydration(listener: HydrationListener): () => void {
  listeners.add(listener)
  if (ready) {
    listener()
  }
  return () => {
    listeners.delete(listener)
  }
}

/** Test-only reset. */
export function resetRepositoryHydrationReadyForTests(): void {
  ready = false
}
