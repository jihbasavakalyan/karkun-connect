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
  isRepositoryHydrationReady,
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
/** KC-0058.8 — at most one automatic startup-critical retry per page load. */
let criticalHydrateRetryUsed = false

const CRITICAL_HYDRATE_RETRY_DELAY_MS = 400

function getErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code
    return typeof code === 'string' ? code : null
  }
  return null
}

/**
 * KC-0058.8 — first-load failures that succeed on immediate refresh are typically
 * auth-token attachment / transient Firestore availability races, not durable denials.
 */
function isTransientCriticalHydrateError(error: unknown): boolean {
  const code = getErrorCode(error)
  if (
    code === 'permission-denied' ||
    code === 'unauthenticated' ||
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'resource-exhausted' ||
    code === 'cancelled' ||
    code === 'failed-precondition'
  ) {
    return true
  }
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /permission-denied|Missing or insufficient permissions|unavailable|deadline|unauthenticated/i.test(
    message,
  )
}

/**
 * Ensure the Auth ID token is available before the first critical Firestore read.
 * authStateReady can resolve a few ms before AuthProvider / Firestore attach the token.
 *
 * KC-0061 Phase 2 — if the token has no role claim, force-refresh once (shared Admin+Rukn fix).
 */
async function ensureAuthTokenReadyForFirestore(forceRefresh = false): Promise<void> {
  const user = getFirebaseAuth().currentUser
  if (!user) {
    markStartupLifecycle('auth.token.skip', { reason: 'no-currentUser', forceRefresh })
    return
  }
  markStartupLifecycle('auth.token.wait', { forceRefresh, uid: user.uid })
  let tokenResult = await user.getIdTokenResult(forceRefresh)
  let claimRole =
    typeof tokenResult.claims.role === 'string' ? tokenResult.claims.role : null
  let claimRuknId =
    typeof tokenResult.claims.ruknId === 'string' ? tokenResult.claims.ruknId : null

  if (!claimRole && !forceRefresh) {
    markStartupLifecycle('auth.token.missing_role_claim.refresh', { uid: user.uid })
    tokenResult = await user.getIdTokenResult(true)
    claimRole = typeof tokenResult.claims.role === 'string' ? tokenResult.claims.role : null
    claimRuknId =
      typeof tokenResult.claims.ruknId === 'string' ? tokenResult.claims.ruknId : null
  }

  markStartupLifecycle('auth.token.ready', {
    forceRefresh: forceRefresh || !claimRole,
    uid: user.uid,
    role: claimRole,
    ruknId: claimRuknId,
    issuedAt: tokenResult.issuedAtTime,
    authTime: tokenResult.authTime,
  })
  if (!claimRole) {
    console.warn('[KC-0061] auth.token.ready without role claim after refresh — Firestore will deny', {
      uid: user.uid,
    })
    markStartupLifecycle('auth.token.missing_role_claim', { uid: user.uid, forceRefresh: true })
  }
}

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
      errorCode: getErrorCode(error),
    })
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
        void import('@/lib/debug/kc00586DashboardStateProbe').then(
          ({ dashState05RefreshTrigger }) => {
            dashState05RefreshTrigger('startup-background.store.rebuild', {
              backgroundSucceeded,
              criticalHydrateSucceeded,
            })
          },
        )
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
    // KC-0058.8 — defer hydrationReady.failed until the single automatic retry is exhausted.
    markStartupLifecycle('criticalHydrate.failed', {
      deferredFailureMark: true,
      error: criticalError instanceof Error ? criticalError.message : String(criticalError),
    })
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

async function runCriticalHydrateRetry(firstError: unknown): Promise<void> {
  criticalHydrateRetryUsed = true
  const code = getErrorCode(firstError)
  markStartupLifecycle('criticalHydrate.retry.scheduled', {
    delayMs: CRITICAL_HYDRATE_RETRY_DELAY_MS,
    errorCode: code,
    error: firstError instanceof Error ? firstError.message : String(firstError),
  })
  await new Promise((resolve) => setTimeout(resolve, CRITICAL_HYDRATE_RETRY_DELAY_MS))
  await ensureAuthTokenReadyForFirestore(true)
  markStartupLifecycle('criticalHydrate.retry.start')

  const ok = await runHydrateAndRebuildCycle('startup-critical-retry')
  if (!ok) {
    markStartupLifecycle('criticalHydrate.retry.failed', {
      errorCode: code,
    })
    throw firstError instanceof Error
      ? firstError
      : new Error('Startup-critical Firestore hydrate retry failed.')
  }

  criticalHydrateSucceeded = true
  backgroundHydrateScheduled = true
  markStartupLifecycle('criticalHydrate.retry.succeeded')
  attachSnapshotListeners()
  markBackgroundHydrationReady()
  markRepositoryHydrationReady()
}

async function runStartupLifecycle(): Promise<void> {
  markStartupLifecycle('auth.authStateReady.wait')
  await getFirebaseAuth().authStateReady()
  markStartupLifecycle('auth.authStateReady')
  // KC-0058.8 — close the authStateReady → first getDocs token-attachment gap.
  await ensureAuthTokenReadyForFirestore(false)

  try {
    await runPhasedStartupHydrate()
  } catch (firstError) {
    const canRetry =
      !criticalHydrateRetryUsed &&
      Boolean(getFirebaseAuth().currentUser) &&
      isTransientCriticalHydrateError(firstError)

    if (!canRetry) {
      markRepositoryHydrationFailed(firstError)
      throw firstError
    }

    try {
      await runCriticalHydrateRetry(firstError)
    } catch (retryError) {
      markRepositoryHydrationFailed(retryError)
      throw retryError
    }
  }
}

function scheduleSnapshotRefresh(): void {
  snapshotRefreshQueued = true
  markStartupLifecycle('firestore.snapshot.refresh.queued', {
    alreadyRunning: snapshotRefreshRunning,
  })
  // KC-0058.6 — snapshot-driven dashboard refresh trigger.
  void import('@/lib/debug/kc00586DashboardStateProbe').then(({ dashState05RefreshTrigger }) => {
    dashState05RefreshTrigger('firestore.snapshot.refresh.queued', {
      alreadyRunning: snapshotRefreshRunning,
    })
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
        void import('@/lib/debug/kc00586DashboardStateProbe').then(
          ({ dashState05RefreshTrigger }) => {
            dashState05RefreshTrigger('firestore.snapshot.refresh.run', {
              context: 'snapshot refresh',
            })
          },
        )
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
      // KC-0058.8 — if startup failed while AuthProvider was awaiting it, attempt the
      // single automatic retry recovery path instead of leaving the error panel stuck.
      if (
        !initialized &&
        !isRepositoryHydrationReady() &&
        !criticalHydrateRetryUsed &&
        isTransientCriticalHydrateError(error)
      ) {
        try {
          await ensureAuthTokenReadyForFirestore(true)
          await runCriticalHydrateRetry(error)
          initialized = true
          return
        } catch (retryError) {
          console.warn('[kc-firestore] post-auth critical hydrate retry failed', retryError)
          if (!isRepositoryHydrationFailed()) {
            markRepositoryHydrationFailed(retryError)
          }
          return
        }
      }
    }
    return
  }

  if (initialized || isRepositoryHydrationReady()) {
    return
  }

  try {
    await ensureAuthTokenReadyForFirestore(false)
    const ok = await runHydrateAndRebuildCycle('post-auth')
    if (ok) {
      criticalHydrateSucceeded = true
      attachSnapshotListeners()
      markBackgroundHydrationReady()
      markRepositoryHydrationReady()
      initialized = true
    } else if (
      !criticalHydrateRetryUsed &&
      Boolean(getFirebaseAuth().currentUser)
    ) {
      await runCriticalHydrateRetry(
        new Error('Post-auth Firestore hydrate failed.'),
      )
      initialized = true
    } else {
      markRepositoryHydrationFailed('Post-auth Firestore hydrate failed.')
    }
  } catch (error) {
    console.warn('[kc-firestore] post-auth hydrate failed', error)
    if (!isRepositoryHydrationFailed()) {
      markRepositoryHydrationFailed(error)
    }
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
  criticalHydrateRetryUsed = false
  stopFirestoreSnapshotListeners()
  resetRepositoryHydrationReadyForTests()
  resetBackgroundHydrationReadyForTests()
}
