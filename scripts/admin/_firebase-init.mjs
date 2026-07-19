/**
 * Shared Firebase Admin initialization for P2 / KC-0050 operational scripts.
 * Requires FIREBASE_SERVICE_ACCOUNT_PATH (preferred) or GOOGLE_APPLICATION_CREDENTIALS.
 *
 * Loads repo-root `.env.local` / `.env` when present so `npm run admin:*` picks up
 * local credential paths without hardcoding them in source.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function loadLocalEnvFiles() {
  for (const name of ['.env.local', '.env']) {
    const path = resolve(REPO_ROOT, name)
    if (!existsSync(path)) continue
    const text = readFileSync(path, 'utf8')
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq <= 0) continue
      const key = line.slice(0, eq).trim()
      let value = line.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      // Do not override an explicit shell/CI env var.
      if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = value
      }
    }
  }
}

function resolveServiceAccountPath() {
  loadLocalEnvFiles()

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
      credentialPath: process.env.__KC_ADMIN_CREDENTIAL_PATH__ ?? null,
      projectId: process.env.FIREBASE_PROJECT_ID ?? null,
    }
  }

  const serviceAccountPath = resolveServiceAccountPath()
  if (!serviceAccountPath || !existsSync(serviceAccountPath)) {
    throw new Error(
      'Service account required. Set FIREBASE_SERVICE_ACCOUNT_PATH (preferred) or GOOGLE_APPLICATION_CREDENTIALS to a JSON key file.',
    )
  }

  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
  const projectId = process.env.FIREBASE_PROJECT_ID ?? serviceAccount.project_id
  process.env.__KC_ADMIN_CREDENTIAL_PATH__ = serviceAccountPath
  process.env.__KC_ADMIN_CLIENT_EMAIL__ = serviceAccount.client_email ?? ''

  initializeApp({
    credential: cert(serviceAccount),
    projectId,
  })

  return {
    auth: getAuth(),
    db: getFirestore(),
    credentialPath: serviceAccountPath,
    projectId,
    clientEmail: serviceAccount.client_email ?? null,
  }
}
