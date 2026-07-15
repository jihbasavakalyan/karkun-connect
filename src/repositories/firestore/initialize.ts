import { getRepositoryProviderMode } from '@/repositories/provider'
import { enableFirestorePersistence } from '@/lib/firebase/firestore'
import { getFirebaseAuth } from '@/lib/firebase/firebase'
import {
  hydrateFirestoreCaches,
  startFirestoreSnapshotListeners,
  stopFirestoreSnapshotListeners,
} from '@/repositories/firestore/firestoreRepositories'
import { hydrateStoresFromRepositories } from '@/repositories/firestore/storeHydration'

let initialized = false
let snapshotRefreshQueued = false
let snapshotRefreshRunning = false

const HYDRATE_TIMEOUT_MS = 8_000

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

async function hydrateCachesOrSkip(): Promise<boolean> {
  try {
    await withTimeout(hydrateFirestoreCaches(), HYDRATE_TIMEOUT_MS, 'hydrateFirestoreCaches')
    return true
  } catch (error) {
    console.warn('[kc-firestore] hydrate skipped or timed out', error)
    return false
  }
}

function scheduleBackgroundHydrate(): void {
  void (async () => {
    try {
      await getFirebaseAuth().authStateReady()
      const hydrated = await hydrateCachesOrSkip()
      if (hydrated) {
        hydrateStoresFromRepositories()
      }
    } catch (error) {
      console.warn('[kc-firestore] background hydrate failed', error)
    }
  })()
}

function scheduleSnapshotRefresh(): void {
  snapshotRefreshQueued = true
  if (snapshotRefreshRunning) {
    return
  }

  snapshotRefreshRunning = true
  void (async () => {
    try {
      while (snapshotRefreshQueued) {
        snapshotRefreshQueued = false
        const hydrated = await hydrateCachesOrSkip()
        if (hydrated) {
          hydrateStoresFromRepositories()
        }
      }
    } finally {
      snapshotRefreshRunning = false
    }
  })()
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
  scheduleBackgroundHydrate()

  stopFirestoreSnapshotListeners()
  startFirestoreSnapshotListeners(() => {
    scheduleSnapshotRefresh()
  })

  initialized = true
}

export function resetRepositoryInitializationForTests(): void {
  initialized = false
  snapshotRefreshQueued = false
  snapshotRefreshRunning = false
  stopFirestoreSnapshotListeners()
}
