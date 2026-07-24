/**
 * KC-0100.3 / KC-0100.5 — Server-only Firebase Admin init for Rukn claim provisioning.
 *
 * Requires a service account for the SAME Firebase project as client Auth tokens.
 * Does not silently accept mismatched TTS credentials (that caused prod 401s).
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

export type RuknClaimsAdminMeta = {
  auth: Auth
  db: Firestore
  projectId: string
  serviceAccountProjectId: string
  serviceAccountEmail: string
  credentialSource: string
}

const EXPECTED_PROJECT =
  process.env.FIREBASE_PROJECT_ID?.trim() ||
  process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
  'karkun-connect-75c68'

function loadServiceAccount(): { json: ServiceAccountJson; source: string } {
  const candidates: Array<{ source: string; raw: string | undefined }> = [
    { source: 'FIREBASE_SERVICE_ACCOUNT_JSON', raw: process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() },
    {
      source: 'FIREBASE_SERVICE_ACCOUNT_JSON_BASE64',
      raw: process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64?.trim()
        ? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64.trim(), 'base64').toString('utf8')
        : undefined,
    },
  ]

  // Explicit Auth admin path/file — not TTS fallback (KC-0100.5).
  const path =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  if (path) {
    if (!existsSync(path)) {
      throw new Error(`Service account file not found: ${path}`)
    }
    candidates.push({ source: 'FIREBASE_SERVICE_ACCOUNT_PATH', raw: readFileSync(path, 'utf8') })
  }

  // Last resort: TTS JSON only if its project_id matches the expected Firebase project.
  const ttsRaw = process.env.GOOGLE_TTS_CREDENTIALS_JSON?.trim()
  if (ttsRaw) {
    candidates.push({ source: 'GOOGLE_TTS_CREDENTIALS_JSON', raw: ttsRaw })
  }

  const errors: string[] = []
  for (const candidate of candidates) {
    if (!candidate.raw) continue
    try {
      const json = JSON.parse(candidate.raw) as ServiceAccountJson
      if (!json.project_id || !json.client_email || !json.private_key) {
        errors.push(`${candidate.source}: missing project_id/client_email/private_key`)
        continue
      }
      if (json.project_id !== EXPECTED_PROJECT) {
        errors.push(
          `${candidate.source}: project_id=${json.project_id} does not match expected ${EXPECTED_PROJECT}`,
        )
        continue
      }
      return { json, source: candidate.source }
    } catch (error) {
      errors.push(
        `${candidate.source}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  throw new Error(
    `Firebase Admin credentials missing or project mismatch for ${EXPECTED_PROJECT}. ` +
      `Set FIREBASE_SERVICE_ACCOUNT_JSON to the firebase-adminsdk key for that project. ` +
      `Details: ${errors.join('; ') || 'no credential env vars present'}`,
  )
}

let cached: RuknClaimsAdminMeta | undefined

export function getRuknClaimsAdmin(): RuknClaimsAdminMeta {
  if (cached) return cached

  const { json: serviceAccount, source } = loadServiceAccount()
  const projectId = EXPECTED_PROJECT

  let app: App
  if (getApps().length > 0) {
    app = getApps()[0]!
    const existingProject = app.options.projectId ?? ''
    if (existingProject && existingProject !== projectId) {
      throw new Error(
        `Existing Firebase Admin app projectId=${existingProject} does not match expected ${projectId}`,
      )
    }
  } else {
    app = initializeApp({
      credential: cert(serviceAccount as Parameters<typeof cert>[0]),
      projectId,
    })
  }

  cached = {
    auth: getAuth(app),
    db: getFirestore(app),
    projectId: app.options.projectId ?? projectId,
    serviceAccountProjectId: serviceAccount.project_id!,
    serviceAccountEmail: serviceAccount.client_email!,
    credentialSource: source,
  }

  console.info(
    JSON.stringify({
      ticket: 'KC-0100.5',
      name: 'admin_sdk_initialized',
      status: 'success',
      ts: new Date().toISOString(),
      projectId: cached.projectId,
      serviceAccountProjectId: cached.serviceAccountProjectId,
      serviceAccountEmail: cached.serviceAccountEmail,
      credentialSource: cached.credentialSource,
    }),
  )

  return cached
}

export function peekExpectedFirebaseProject(): string {
  return EXPECTED_PROJECT
}
