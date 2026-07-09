import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

export type FirebaseConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

export function readFirebaseConfigFromEnv(): FirebaseConfig {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  }
}

export function isFirebaseConfigured(config: FirebaseConfig = readFirebaseConfigFromEnv()): boolean {
  return Object.values(config).every((value) => value.trim().length > 0)
}

let firebaseApp: FirebaseApp | null = null
let firebaseAuth: Auth | null = null

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    const config = readFirebaseConfigFromEnv()
    if (!isFirebaseConfigured(config)) {
      throw new Error('Firebase is not configured. Set VITE_FIREBASE_* environment variables.')
    }
    firebaseApp = initializeApp(config)
  }
  return firebaseApp
}

export function getFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    firebaseAuth = getAuth(getFirebaseApp())
  }
  return firebaseAuth
}

/** Test-only reset — not used in production UI. */
export function resetFirebaseClientsForTests(): void {
  firebaseApp = null
  firebaseAuth = null
}
