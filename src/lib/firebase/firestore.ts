import {
  initializeFirestore,
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
    firestoreDb = initializeFirestore(getFirebaseApp(), {})
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
