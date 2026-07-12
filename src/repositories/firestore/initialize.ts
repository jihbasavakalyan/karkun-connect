import { getRepositoryProviderMode } from '@/repositories/provider'
import { enableFirestorePersistence } from '@/lib/firebase/firestore'
import { getFirebaseAuth } from '@/lib/firebase/firebase'
import {
  hydrateFirestoreCaches,
  startFirestoreSnapshotListeners,
  stopFirestoreSnapshotListeners,
  getKarkunCacheHydratedFlag,
} from '@/repositories/firestore/firestoreRepositories'
import { hydrateStoresFromRepositories } from '@/repositories/firestore/storeHydration'
import {
  setRegistryTraceHydrated,
  traceRegistryStage,
} from '@/lib/registryHydrationTrace'

let initialized = false

const HYDRATE_TIMEOUT_MS = 8_000

/**
 * First blocking failure was `await hydrateFirestoreCaches()` → Promise.all(getDocs…).
 * Those promises often never settle before Auth is ready (SDK waits on credentials;
 * rules require sign-in). Bootstrap must not await that hang.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`[kc-firestore] ${label} timed out after ${ms}ms`))
    }, ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

async function hydrateCachesOrSkip(): Promise<void> {
  traceRegistryStage('hydrateCachesOrSkip:start')
  try {
    await withTimeout(hydrateFirestoreCaches(), HYDRATE_TIMEOUT_MS, 'hydrateFirestoreCaches')
    setRegistryTraceHydrated(getKarkunCacheHydratedFlag())
    traceRegistryStage('hydrateCachesOrSkip:success')
  } catch (error) {
    // Expected before sign-in, on timeout, or when rules deny unauthenticated reads.
    console.warn('[kc-firestore] hydrate skipped or timed out', error)
    setRegistryTraceHydrated(getKarkunCacheHydratedFlag())
    traceRegistryStage('hydrateCachesOrSkip:caught_error')
  }
}

/** Background hydrate after authStateReady — never blocks initializeRepositories(). */
function scheduleBackgroundHydrate(reason: string): void {
  void (async () => {
    try {
      await getFirebaseAuth().authStateReady()
      traceRegistryStage(`backgroundHydrate:authStateReady:${reason}`)
      await hydrateCachesOrSkip()
      hydrateStoresFromRepositories()
      traceRegistryStage(`backgroundHydrate:storesHydrated:${reason}`)
    } catch (error) {
      console.warn('[kc-firestore] background hydrate failed', error)
      traceRegistryStage(`backgroundHydrate:failed:${reason}`)
    }
  })()
}

export async function refreshFirestoreAfterAuth(): Promise<void> {
  if (getRepositoryProviderMode() !== 'firestore') {
    return
  }

  try {
    await withTimeout(hydrateFirestoreCaches(), HYDRATE_TIMEOUT_MS, 'refreshFirestoreAfterAuth.hydrate')
    setRegistryTraceHydrated(getKarkunCacheHydratedFlag())
    traceRegistryStage('refreshFirestoreAfterAuth:after_hydrateFirestoreCaches')
    hydrateStoresFromRepositories()
    traceRegistryStage('refreshFirestoreAfterAuth:after_hydrateStoresFromRepositories')
  } catch (error) {
    console.warn('[kc-firestore] post-auth hydrate failed', error)
    traceRegistryStage('refreshFirestoreAfterAuth:caught_error')
  }
}

export async function initializeRepositories(): Promise<void> {
  if (initialized || getRepositoryProviderMode() !== 'firestore') {
    if (getRepositoryProviderMode() !== 'firestore') {
      setRegistryTraceHydrated(false)
      traceRegistryStage('initializeRepositories:skipped_non_firestore')
    }
    return
  }

  traceRegistryStage('initializeRepositories:before_enableFirestorePersistence')
  await enableFirestorePersistence()
  traceRegistryStage('initializeRepositories:after_enableFirestorePersistence')

  // CRITICAL FIX: do not await hydrateCachesOrSkip() here.
  // Previously: await hydratePromise blocked forever inside Promise.all(getDocs…),
  // so runProductionDataMigration() in main.tsx never ran and the registry stayed empty.
  scheduleBackgroundHydrate('initializeRepositories')

  stopFirestoreSnapshotListeners()
  startFirestoreSnapshotListeners(() => {
    void hydrateCachesOrSkip().then(() => {
      hydrateStoresFromRepositories()
      traceRegistryStage('snapshotListener:after_hydrateStoresFromRepositories')
    })
  })

  // Apply whatever is already in memory caches (usually empty pre-auth), then finish init
  // so main.tsx can run production migration immediately.
  //
  // Do NOT subscribe SyncCache → hydrateStores here. Local saveState() also updates SyncCache;
  // wiring that to hydrateStores caused a hydrate↔persist storm while migration imported Karkuns.
  // Remote updates are already handled by startFirestoreSnapshotListeners above.
  hydrateStoresFromRepositories()

  setRegistryTraceHydrated(getKarkunCacheHydratedFlag())
  initialized = true
  traceRegistryStage('2_after_initializeRepositories_complete')
}

export function resetRepositoryInitializationForTests(): void {
  initialized = false
  stopFirestoreSnapshotListeners()
}
