/**
 * Shared Firebase Admin initialization for P2 operational scripts.
 * Requires GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_PATH.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function resolveServiceAccountPath() {
  const explicit = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim()
  if (explicit) {
    return resolve(explicit)
  }

  const fromGac = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  if (fromGac) {
    return resolve(fromGac)
  }

  return null
}

export function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return {
      auth: getAuth(),
      db: getFirestore(),
    }
  }

  const serviceAccountPath = resolveServiceAccountPath()
  if (!serviceAccountPath || !existsSync(serviceAccountPath)) {
    throw new Error(
      'Service account required. Set FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS to a JSON key file.',
    )
  }

  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID ?? serviceAccount.project_id,
  })

  return {
    auth: getAuth(),
    db: getFirestore(),
  }
}
