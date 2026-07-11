import { getRepositoryProviderMode } from '@/repositories/provider'
import { enableFirestorePersistence } from '@/lib/firebase/firestore'
import {
  hydrateFirestoreCaches,
  startFirestoreSnapshotListeners,
  stopFirestoreSnapshotListeners,
  subscribeToFirestoreCacheChanges,
  getKarkunCacheHydratedFlag,
} from '@/repositories/firestore/firestoreRepositories'
import { hydrateStoresFromRepositories } from '@/repositories/firestore/storeHydration'
import {
  setRegistryTraceHydrated,
  traceRegistryStage,
} from '@/lib/registryHydrationTrace'

let initialized = false
let unsubscribeCache: (() => void) | null = null

async function hydrateCachesOrSkip(): Promise<void> {
  traceRegistryStage('hydrateCachesOrSkip:start')
  try {
    await hydrateFirestoreCaches()
    setRegistryTraceHydrated(getKarkunCacheHydratedFlag())
    traceRegistryStage('hydrateCachesOrSkip:success')
  } catch (error) {
    // Expected before sign-in: Firestore rules deny unauthenticated reads.
    console.warn('[kc-firestore] initial hydrate skipped (awaiting authentication)', error)
    setRegistryTraceHydrated(getKarkunCacheHydratedFlag())
    traceRegistryStage('hydrateCachesOrSkip:caught_error')
  }
}

export async function refreshFirestoreAfterAuth(): Promise<void> {
  if (getRepositoryProviderMode() !== 'firestore') {
    return
  }

  try {
    await hydrateFirestoreCaches()
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

  traceRegistryStage('initializeRepositories:before_hydrateCachesOrSkip')
  const hydratePromise = hydrateCachesOrSkip()
  if (typeof window !== 'undefined') {
    void Promise.race([
      hydratePromise.then(() => 'done' as const),
      new Promise<'timeout'>((resolve) => {
        window.setTimeout(() => resolve('timeout'), 10_000)
      }),
    ]).then((result) => {
      if (result === 'timeout') {
        traceRegistryStage('initializeRepositories:hydrate_still_pending_10s')
      }
    })
  }
  await hydratePromise
  traceRegistryStage('initializeRepositories:after_hydrateCachesOrSkip')

  stopFirestoreSnapshotListeners()
  startFirestoreSnapshotListeners(() => {
    void hydrateCachesOrSkip().then(() => {
      hydrateStoresFromRepositories()
      traceRegistryStage('snapshotListener:after_hydrateStoresFromRepositories')
    })
  })
  unsubscribeCache?.()
  unsubscribeCache = subscribeToFirestoreCacheChanges(() => {
    hydrateStoresFromRepositories()
    traceRegistryStage('cacheChange:after_hydrateStoresFromRepositories')
  })
  hydrateStoresFromRepositories()
  setRegistryTraceHydrated(getKarkunCacheHydratedFlag())
  initialized = true
  traceRegistryStage('2_after_initializeRepositories_complete')
}

export function resetRepositoryInitializationForTests(): void {
  initialized = false
  unsubscribeCache?.()
  unsubscribeCache = null
  stopFirestoreSnapshotListeners()
}
