import { markStartupLifecycle } from '@/lib/startupLifecycleTrace'

type HydrationListener = () => void

/** KC-0058.3 — critical hydration terminal states. */
export type RepositoryHydrationStatus = 'pending' | 'ready' | 'failed'

let status: RepositoryHydrationStatus = 'pending'
let failureMessage: string | null = null
const listeners = new Set<HydrationListener>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

export function getRepositoryHydrationStatus(): RepositoryHydrationStatus {
  return status
}

export function getRepositoryHydrationFailureMessage(): string | null {
  return failureMessage
}

export function isRepositoryHydrationReady(): boolean {
  return status === 'ready'
}

export function isRepositoryHydrationFailed(): boolean {
  return status === 'failed'
}

export function markRepositoryHydrationReady(): void {
  if (status === 'ready') {
    return
  }
  status = 'ready'
  failureMessage = null
  markStartupLifecycle('hydrationReady.marked', { status: 'ready' })
  notify()
}

export function markRepositoryHydrationFailed(error?: unknown): void {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Critical data hydration failed.'
  status = 'failed'
  failureMessage = message
  markStartupLifecycle('hydrationReady.failed', {
    status: 'failed',
    message,
  })
  notify()
}

export function subscribeToRepositoryHydration(listener: HydrationListener): () => void {
  listeners.add(listener)
  // Notify current terminal or pending state so subscribers sync immediately.
  listener()
  return () => {
    listeners.delete(listener)
  }
}

/** Test-only reset. */
export function resetRepositoryHydrationReadyForTests(): void {
  status = 'pending'
  failureMessage = null
}
