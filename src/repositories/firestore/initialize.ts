import { getRepositories, getRepositoryProviderMode } from '@/repositories/provider'
import { enableFirestorePersistence } from '@/lib/firebase/firestore'
import { getFirebaseAuth } from '@/lib/firebase/firebase'
import { markStartupLifecycle } from '@/lib/startupLifecycleTrace'
import {
  beginPhasedStartupHydrate,
  hydrateFirestoreCaches,
  startFirestoreSnapshotListeners,
  stopFirestoreSnapshotListeners,
} from '@/repositories/firestore/firestoreRepositories'
import { hydrateStoresFromRepositories } from '@/repositories/firestore/storeHydration'
import {
  markBackgroundHydrationReady,
  resetBackgroundHydrationReadyForTests,
} from '@/repositories/backgroundHydrationReady'
import { resetRepositoryHydrationReadyForTests } from '@/repositories/hydrationReady'

let initialized = false
let initializeInFlight: Promise<void> | null = null
let snapshotRefreshQueued = false
let snapshotRefreshRunning = false
let backgroundHydrateScheduled = false

function ensureConnectionRepositoryReadable(): void {
  const state = getRepositories().connection.loadState()
  if (!state.ok) {
    throw new Error(
      `[kc-firestore] startup contract failed: connection repository unreadable (${state.error.code})`,
    )
  }
}

function rebuildStoresIfSafe(context: string, hydrateSucceeded: boolean): void {
  const connectionState = getRepositories().connection.loadState()
  const hasCachedConnections =
    connectionState.ok && connectionState.data.assignments.length > 0

  // Refresh reconstruction guard:
  // Do not rebuild assignmentStore / people projection from an empty cache when
  // hydrate failed. That path projects Connected Karkuns = 0 and persists it.
  // Wait for a successful hydrate (or a cache that already has connections).
  // Explicit empty after a successful hydrate is still rebuilt (true empty state).
  if (!hydrateSucceeded && !hasCachedConnections) {
    console.warn(
      `[kc-firestore] ${context} skipping store rebuild until connection cache is available`,
    )
    markStartupLifecycle('hydrate.cycle.skip_rebuild', { context })
    return
  }

  ensureConnectionRepositoryReadable()
  markStartupLifecycle('stores.hydrate.start', { context })
  hydrateStoresFromRepositories()
  markStartupLifecycle('stores.hydrate.complete', { context })
  markStartupLifecycle('hydrate.cycle.complete', { context })
}

async function runHydrateAndRebuildCycle(context: string): Promise<void> {
  markStartupLifecycle('hydrate.cycle.start', { context })
  let hydrateSucceeded = false
  try {
    markStartupLifecycle('firestore.hydrate.start', { context })
    await hydrateFirestoreCaches()
    hydrateSucceeded = true
    markStartupLifecycle('firestore.hydrate.complete', { context })
  } catch (error) {
    console.warn(`[kc-firestore] ${context} hydrate failed, using current repository state`, error)
    markStartupLifecycle('firestore.hydrate.failed', { context })
  }

  rebuildStoresIfSafe(context, hydrateSucceeded)
}

function attachSnapshotListeners(): void {
  stopFirestoreSnapshotListeners()
  markStartupLifecycle('firestore.snapshot.listeners.attach')
  startFirestoreSnapshotListeners(() => {
    scheduleSnapshotRefresh()
  })
  markStartupLifecycle('firestore.snapshot.listeners.attached')
}

/**
 * KC-004B — parallel critical + background reads; unlock after critical apply.
 * Background promise is already in flight (started with critical) — no second fan-out.
 */
async function runPhasedStartupHydrate(): Promise<void> {
  markStartupLifecycle('hydrate.cycle.start', { context: 'startup-critical' })
  markStartupLifecycle('criticalHydrate.start')
  markStartupLifecycle('backgroundHydrate.start')
  markStartupLifecycle('firestore.hydrate.start', { context: 'startup-critical' })

  const { critical, background } = beginPhasedStartupHydrate()

  let criticalSucceeded = false
  try {
    await critical
    criticalSucceeded = true
    markStartupLifecycle('firestore.hydrate.complete', { context: 'startup-critical' })
    markStartupLifecycle('criticalHydrate.complete')
  } catch (error) {
    console.warn('[kc-firestore] startup-critical hydrate failed, using current repository state', error)
    markStartupLifecycle('firestore.hydrate.failed', { context: 'startup-critical' })
  }

  rebuildStoresIfSafe('startup-critical', criticalSucceeded)

  if (backgroundHydrateScheduled) {
    return
  }
  backgroundHydrateScheduled = true

  void (async () => {
    let backgroundSucceeded = false
    try {
      markStartupLifecycle('firestore.hydrate.start', { context: 'startup-background' })
      await background
      backgroundSucceeded = true
      markStartupLifecycle('firestore.hydrate.complete', { context: 'startup-background' })
      markStartupLifecycle('backgroundHydrate.complete')
    } catch (error) {
      console.warn('[kc-firestore] startup-background hydrate failed', error)
      markStartupLifecycle('firestore.hydrate.failed', { context: 'startup-background' })
    }

    if (backgroundSucceeded) {
      markStartupLifecycle('stores.hydrate.start', { context: 'startup-background' })
      hydrateStoresFromRepositories()
      markStartupLifecycle('stores.hydrate.complete', { context: 'startup-background' })
    }

    attachSnapshotListeners()
    markBackgroundHydrationReady()
  })()
}

async function runStartupLifecycle(): Promise<void> {
  markStartupLifecycle('auth.authStateReady.wait')
  await getFirebaseAuth().authStateReady()
  markStartupLifecycle('auth.authStateReady')
  await runPhasedStartupHydrate()
}

function scheduleSnapshotRefresh(): void {
  snapshotRefreshQueued = true
  markStartupLifecycle('firestore.snapshot.refresh.queued', {
    alreadyRunning: snapshotRefreshRunning,
  })
  if (snapshotRefreshRunning) {
    return
  }

  snapshotRefreshRunning = true
  void (async () => {
    try {
      while (snapshotRefreshQueued) {
        snapshotRefreshQueued = false
        await runHydrateAndRebuildCycle('snapshot refresh')
      }
    } finally {
      snapshotRefreshRunning = false
      markStartupLifecycle('firestore.snapshot.refresh.idle')
    }
  })()
}

export async function refreshFirestoreAfterAuth(): Promise<void> {
  if (getRepositoryProviderMode() !== 'firestore') {
    return
  }

  // KC-027F: coalesce with startup init — authStateReady hydrate already ran (or is
  // in flight). A second full getDocs + store rebuild doubles post-login latency.
  if (initializeInFlight) {
    try {
      await initializeInFlight
    } catch (error) {
      console.warn('[kc-firestore] post-auth awaited startup hydrate failure', error)
    }
    return
  }

  if (initialized) {
    return
  }

  try {
    await runHydrateAndRebuildCycle('post-auth')
  } catch (error) {
    console.warn('[kc-firestore] post-auth hydrate failed', error)
  }
}

export async function initializeRepositories(): Promise<void> {
  if (getRepositoryProviderMode() !== 'firestore' || initialized) {
    markBackgroundHydrationReady()
    return
  }

  if (initializeInFlight) {
    return initializeInFlight
  }

  initializeInFlight = (async () => {
    try {
      markStartupLifecycle('initializeRepositories.start')
      await enableFirestorePersistence()
      await runStartupLifecycle()

      initialized = true
      markStartupLifecycle('initializeRepositories.complete')
    } catch (error) {
      // Unblock background-dependent widgets if startup aborts before schedule.
      markBackgroundHydrationReady()
      throw error
    }
  })()

  try {
    await initializeInFlight
  } finally {
    if (!initialized) {
      initializeInFlight = null
    }
  }
}

export function resetRepositoryInitializationForTests(): void {
  initialized = false
  initializeInFlight = null
  snapshotRefreshQueued = false
  snapshotRefreshRunning = false
  backgroundHydrateScheduled = false
  stopFirestoreSnapshotListeners()
  resetRepositoryHydrationReadyForTests()
  resetBackgroundHydrationReadyForTests()
}
