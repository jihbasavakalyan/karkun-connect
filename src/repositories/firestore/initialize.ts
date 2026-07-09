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

export async function initializeRepositories(): Promise<void> {
  if (initialized || getRepositoryProviderMode() !== 'firestore') {
    return
  }

  await enableFirestorePersistence()
  await hydrateFirestoreCaches()
  stopFirestoreSnapshotListeners()
  startFirestoreSnapshotListeners(() => {
    hydrateStoresFromRepositories()
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
