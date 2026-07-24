/**
 * KC-0100.3 — Server-only Firebase Admin init for Rukn claim provisioning.
 * Credentials stay on the server (Vercel env / local service account path).
 */

import { existsSync, readFileSync } from 'node:fs'
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

type ServiceAccountJson = {
  project_id?: string
  client_email?: string
  private_key?: string
  [key: string]: unknown
}

function loadServiceAccount(): ServiceAccountJson {
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.GOOGLE_TTS_CREDENTIALS_JSON?.trim()
  if (raw) {
    return JSON.parse(raw) as ServiceAccountJson
  }

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64?.trim()
  if (b64) {
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as ServiceAccountJson
  }

  const path =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  if (path) {
    if (!existsSync(path)) {
      throw new Error(`Service account file not found: ${path}`)
    }
    return JSON.parse(readFileSync(path, 'utf8')) as ServiceAccountJson
  }

  throw new Error(
    'Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.',
  )
}

let app: App | undefined

export function getRuknClaimsAdmin(): { auth: Auth; db: Firestore; projectId: string } {
  if (!app) {
    if (getApps().length > 0) {
      app = getApps()[0]
    } else {
      const serviceAccount = loadServiceAccount()
      const projectId = process.env.FIREBASE_PROJECT_ID ?? serviceAccount.project_id
      if (!projectId || !serviceAccount.client_email || !serviceAccount.private_key) {
        throw new Error('Invalid Firebase service account JSON (project_id/client_email/private_key).')
      }
      app = initializeApp({
        credential: cert(serviceAccount as Parameters<typeof cert>[0]),
        projectId,
      })
    }
  }

  return {
    auth: getAuth(app),
    db: getFirestore(app),
    projectId: app.options.projectId ?? process.env.FIREBASE_PROJECT_ID ?? 'unknown',
  }
}
