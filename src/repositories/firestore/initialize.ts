import { enableFirestorePersistence } from '@/lib/firebase/firestore'
import { getRepositoryProviderMode } from '@/repositories/provider'
import {
  hydrateFirestoreCaches,
  startFirestoreSnapshotListeners,
  stopFirestoreSnapshotListeners,
  subscribeToFirestoreCacheChanges,
} from '@/repositories/firestore/firestoreRepositories'
import { hydrateStoresFromRepositories } from '@/repositories/firestore/storeHydration'

let initialized = false
let unsubscribeCache: (() => void) | null = null

async function hydrateCachesOrSkip(): Promise<void> {
  try {
    await hydrateFirestoreCaches()
  } catch (error) {
    // Expected before sign-in: Firestore rules deny unauthenticated reads.
    console.warn('[kc-firestore] initial hydrate skipped (awaiting authentication)', error)
  }
}

export async function refreshFirestoreAfterAuth(): Promise<void> {
  if (getRepositoryProviderMode() !== 'firestore') {
    return
  }

  try {
    await hydrateFirestoreCaches()
    hydrateStoresFromRepositories()
  } catch (error) {
    console.warn('[kc-firestore] post-auth hydrate failed', error)
  }
}

export async function initializeRepositories(): Promise<void> {
  if (initialized || getRepositoryProviderMode() !== 'firestore') {
    return
  }

  await enableFirestorePersistence()
  await hydrateCachesOrSkip()
  stopFirestoreSnapshotListeners()
  startFirestoreSnapshotListeners(() => {
    void hydrateCachesOrSkip().then(() => {
      hydrateStoresFromRepositories()
    })
  })
  unsubscribeCache?.()
  unsubscribeCache = subscribeToFirestoreCacheChanges(() => {
    hydrateStoresFromRepositories()
  })
  hydrateStoresFromRepositories()
  initialized = true
}

export function resetRepositoryInitializationForTests(): void {
  initialized = false
  unsubscribeCache?.()
  unsubscribeCache = null
  stopFirestoreSnapshotListeners()
}
