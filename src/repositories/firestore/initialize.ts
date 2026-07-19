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
import { isTransferCommitInFlight } from '@/repositories/firestore/offlineSync'
import { hydrateStoresFromRepositories } from '@/repositories/firestore/storeHydration'
import {
  markBackgroundHydrationReady,
  resetBackgroundHydrationReadyForTests,
} from '@/repositories/backgroundHydrationReady'
import {
  isRepositoryHydrationFailed,
  markRepositoryHydrationFailed,
  markRepositoryHydrationReady,
  resetRepositoryHydrationReadyForTests,
} from '@/repositories/hydrationReady'
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { kc004cTraceRegistry } from '@/lib/debug/kc004cRegistryTrace'

let initialized = false
let initializeInFlight: Promise<void> | null = null
let snapshotRefreshQueued = false
let snapshotRefreshRunning = false
let backgroundHydrateScheduled = false
/** KC-0058.3 — background must never rebuild stores after a failed critical hydrate. */
let criticalHydrateSucceeded = false

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
    markStartupLifecycle('hydrate.cycle.skip_rebuild', { context, hydrateSucceeded })
    return
  }

  ensureConnectionRepositoryReadable()
  markStartupLifecycle('stores.hydrate.start', { context })
  hydrateStoresFromRepositories()
  markStartupLifecycle('stores.hydrate.complete', { context })
  markStartupLifecycle('hydrate.cycle.complete', { context })
}

async function runHydrateAndRebuildCycle(context: string): Promise<boolean> {
  markStartupLifecycle('hydrate.cycle.start', { context })
  let hydrateSucceeded = false
  try {
    markStartupLifecycle('firestore.hydrate.start', { context })
    await hydrateFirestoreCaches()
    hydrateSucceeded = true
    markStartupLifecycle('firestore.hydrate.complete', { context })
  } catch (error) {
    console.warn(`[kc-firestore] ${context} hydrate failed, using current repository state`, error)
    markStartupLifecycle('firestore.hydrate.failed', {
      context,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  rebuildStoresIfSafe(context, hydrateSucceeded)
  return hydrateSucceeded
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
 * KC-0058.3 — critical failure is terminal for readiness; background must not rebuild stores.
 */
async function runPhasedStartupHydrate(): Promise<boolean> {
  markStartupLifecycle('hydrate.cycle.start', { context: 'startup-critical' })
  markStartupLifecycle('criticalHydrate.start')
  markStartupLifecycle('backgroundHydrate.start')
  markStartupLifecycle('firestore.hydrate.start', { context: 'startup-critical' })

  const { critical, background } = beginPhasedStartupHydrate()

  let criticalSucceeded = false
  let criticalError: unknown = null
  try {
    await critical
    criticalSucceeded = true
    criticalHydrateSucceeded = true
    markStartupLifecycle('firestore.hydrate.complete', { context: 'startup-critical' })
    markStartupLifecycle('criticalHydrate.complete')
  } catch (error) {
    criticalError = error
    criticalHydrateSucceeded = false
    console.warn('[kc-firestore] startup-critical hydrate failed', error)
    markStartupLifecycle('firestore.hydrate.failed', {
      context: 'startup-critical',
      error: error instanceof Error ? error.message : String(error),
    })
    markStartupLifecycle('criticalHydrate.failed')
  }

  kc004cTraceRegistry({
    caller: 'runPhasedStartupHydrate',
    phase: 'before-critical-store-rebuild',
    before: MOCK_KARKUN_REGISTRY.length,
    extra: { criticalSucceeded },
  })

  if (criticalSucceeded) {
    rebuildStoresIfSafe('startup-critical', true)
    markStartupLifecycle('stores.rebuild.after_critical_success')
  } else {
    markStartupLifecycle('hydrate.cycle.skip_rebuild', {
      context: 'startup-critical',
      reason: 'critical_hydrate_failed',
    })
    markStartupLifecycle('stores.rebuild.skipped_critical_failure')
  }

  kc004cTraceRegistry({
    caller: 'runPhasedStartupHydrate',
    phase: 'after-critical-store-rebuild',
    after: MOCK_KARKUN_REGISTRY.length,
    extra: {
      criticalSucceeded,
      note: 'initializeRepositories returns soon; migration may run before background apply',
    },
  })

  if (!backgroundHydrateScheduled) {
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
        markStartupLifecycle('firestore.hydrate.failed', {
          context: 'startup-background',
          error: error instanceof Error ? error.message : String(error),
        })
      }

      kc004cTraceRegistry({
        caller: 'runPhasedStartupHydrate',
        phase: 'background-apply-complete',
        after: MOCK_KARKUN_REGISTRY.length,
        extra: {
          backgroundSucceeded,
          criticalHydrateSucceeded,
          note: 'migrationVersion cache is set in applyBackgroundHydratePayload',
        },
      })

      // KC-0058.3 — never rebuild stores from background if critical failed.
      if (backgroundSucceeded && criticalHydrateSucceeded) {
        markStartupLifecycle('stores.hydrate.start', { context: 'startup-background' })
        hydrateStoresFromRepositories()
        markStartupLifecycle('stores.hydrate.complete', { context: 'startup-background' })
        kc004cTraceRegistry({
          caller: 'runPhasedStartupHydrate',
          phase: 'after-background-store-rebuild',
          after: MOCK_KARKUN_REGISTRY.length,
        })
        attachSnapshotListeners()
        markBackgroundHydrationReady()
      } else if (backgroundSucceeded && !criticalHydrateSucceeded) {
        markStartupLifecycle('stores.hydrate.skipped', {
          context: 'startup-background',
          reason: 'critical_hydrate_failed',
        })
      }
    })()
  }

  if (!criticalSucceeded) {
    markRepositoryHydrationFailed(criticalError)
    throw criticalError instanceof Error
      ? criticalError
      : new Error(
          typeof criticalError === 'string'
            ? criticalError
            : 'Startup-critical Firestore hydrate failed.',
        )
  }

  markRepositoryHydrationReady()
  return true
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
        // KC-0055: do not rebuild stores over an in-flight Transfer ownership commit.
        while (isTransferCommitInFlight()) {
          await new Promise((resolve) => setTimeout(resolve, 25))
        }
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
    const ok = await runHydrateAndRebuildCycle('post-auth')
    if (ok) {
      criticalHydrateSucceeded = true
      markRepositoryHydrationReady()
    } else {
      markRepositoryHydrationFailed('Post-auth Firestore hydrate failed.')
    }
  } catch (error) {
    console.warn('[kc-firestore] post-auth hydrate failed', error)
    markRepositoryHydrationFailed(error)
  }
}

export async function initializeRepositories(): Promise<void> {
  if (getRepositoryProviderMode() !== 'firestore') {
    markBackgroundHydrationReady()
    markRepositoryHydrationReady()
    return
  }

  if (initialized) {
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
      markStartupLifecycle('initializeRepositories.complete', {
        criticalHydrateSucceeded: true,
      })
    } catch (error) {
      criticalHydrateSucceeded = false
      markStartupLifecycle('initializeRepositories.failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      // Do not mark background ready — critical contract failed.
      if (!isRepositoryHydrationFailed()) {
        markRepositoryHydrationFailed(error)
      }
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
  criticalHydrateSucceeded = false
  stopFirestoreSnapshotListeners()
  resetRepositoryHydrationReadyForTests()
  resetBackgroundHydrationReadyForTests()
}
