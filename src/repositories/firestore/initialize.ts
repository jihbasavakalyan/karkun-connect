import { getRepositories, getRepositoryProviderMode } from '@/repositories/provider'
import { enableFirestorePersistence } from '@/lib/firebase/firestore'
import { getFirebaseAuth } from '@/lib/firebase/firebase'
import {
  hydrateFirestoreCaches,
  startFirestoreSnapshotListeners,
  stopFirestoreSnapshotListeners,
} from '@/repositories/firestore/firestoreRepositories'
import { hydrateStoresFromRepositories } from '@/repositories/firestore/storeHydration'

let initialized = false
let initializeInFlight: Promise<void> | null = null
let snapshotRefreshQueued = false
let snapshotRefreshRunning = false

function ensureConnectionRepositoryReadable(): void {
  const state = getRepositories().connection.loadState()
  if (!state.ok) {
    throw new Error(
      `[kc-firestore] startup contract failed: connection repository unreadable (${state.error.code})`,
    )
  }
}

async function runHydrateAndRebuildCycle(context: string): Promise<void> {
  try {
    await hydrateFirestoreCaches()
  } catch (error) {
    console.warn(`[kc-firestore] ${context} hydrate failed, using current repository state`, error)
  }

  // Contract enforcement: assignmentStore rebuild + synchronization must run
  // against a readable repository state (including explicit empty state).
  ensureConnectionRepositoryReadable()
  hydrateStoresFromRepositories()
}

async function runStartupLifecycle(): Promise<void> {
  await getFirebaseAuth().authStateReady()
  await runHydrateAndRebuildCycle('startup')
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
        await runHydrateAndRebuildCycle('snapshot refresh')
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
    await runHydrateAndRebuildCycle('post-auth')
  } catch (error) {
    console.warn('[kc-firestore] post-auth hydrate failed', error)
  }
}

export async function initializeRepositories(): Promise<void> {
  if (getRepositoryProviderMode() !== 'firestore' || initialized) {
    return
  }

  if (initializeInFlight) {
    return initializeInFlight
  }

  initializeInFlight = (async () => {
    await enableFirestorePersistence()
    await runStartupLifecycle()

    stopFirestoreSnapshotListeners()
    startFirestoreSnapshotListeners(() => {
      scheduleSnapshotRefresh()
    })

    initialized = true
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
  stopFirestoreSnapshotListeners()
}
