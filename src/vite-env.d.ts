/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_ADMIN_EMAILS?: string
  readonly VITE_REPOSITORY_PROVIDER?: 'local' | 'firestore'
  /** Explicit opt-in for KC-029 diagnostics outside Vite DEV. */
  readonly VITE_RUNTIME_DIAGNOSTICS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __KC_BUILD_SHA__: string
declare const __KC_BUILD_TIME__: string

interface Window {
  __KC029_RUNTIME_TRUTH__?: unknown
}
