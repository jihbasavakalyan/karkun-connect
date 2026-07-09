/**
 * Firebase configuration and helpers barrel export.
 */
export {
  getFirebaseApp,
  getFirebaseAuth,
  isFirebaseConfigured,
  readFirebaseConfigFromEnv,
  resetFirebaseClientsForTests,
  type FirebaseConfig,
} from '@/lib/firebase/firebase'
export {
  enableFirestorePersistence,
  getFirestoreDb,
  isFirestorePersistenceEnabled,
  resetFirestoreClientForTests,
} from '@/lib/firebase/firestore'
