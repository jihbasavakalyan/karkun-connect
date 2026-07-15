import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { getFirebaseApp, isFirebaseConfigured } from '@/lib/firebase/firebase'

let firestoreDb: Firestore | null = null
let persistenceEnabled = false

export function getFirestoreDb(): Firestore {
  if (!isFirebaseConfigured()) {
    throw new Error('Firestore is not available — configure VITE_FIREBASE_* variables.')
  }

  if (!firestoreDb) {
    // IndexedDB local cache is required for refresh reconstruction:
    // connection writes must survive page reload even when the SDK briefly
    // reports offline during startup getDocs.
    firestoreDb = initializeFirestore(getFirebaseApp(), {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  }

  return firestoreDb
}

export function isFirestorePersistenceEnabled(): boolean {
  return persistenceEnabled
}

export async function enableFirestorePersistence(): Promise<void> {
  if (persistenceEnabled || typeof window === 'undefined') {
    return
  }

  getFirestoreDb()
  persistenceEnabled = true
}

export function resetFirestoreClientForTests(): void {
  firestoreDb = null
  persistenceEnabled = false
}
