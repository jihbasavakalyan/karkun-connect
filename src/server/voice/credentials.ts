/**
 * KC-019 / KC-027 — Shared Google Cloud service-account loading (server-only).
 */

import { existsSync, readFileSync } from 'node:fs'

export type GoogleServiceAccountJson = {
  client_email?: string
  private_key?: string
  project_id?: string
  token_uri?: string
  [key: string]: unknown
}

export function loadGoogleServiceAccount(): GoogleServiceAccountJson | undefined {
  const raw =
    process.env.GOOGLE_TTS_CREDENTIALS_JSON?.trim() ||
    process.env.GOOGLE_STT_CREDENTIALS_JSON?.trim()
  if (raw) {
    return JSON.parse(raw) as GoogleServiceAccountJson
  }

  const b64 =
    process.env.GOOGLE_TTS_CREDENTIALS_JSON_BASE64?.trim() ||
    process.env.GOOGLE_STT_CREDENTIALS_JSON_BASE64?.trim()
  if (b64) {
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as GoogleServiceAccountJson
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  if (credentialsPath) {
    if (!existsSync(credentialsPath)) {
      throw new Error(`GOOGLE_APPLICATION_CREDENTIALS file not found: ${credentialsPath}`)
    }
    return JSON.parse(readFileSync(credentialsPath, 'utf8')) as GoogleServiceAccountJson
  }

  return undefined
}

export function assertServiceAccount(credentials: GoogleServiceAccountJson): void {
  const missing = ['project_id', 'client_email', 'private_key', 'token_uri'].filter(
    (key) => !credentials[key],
  )
  if (missing.length > 0) {
    throw new Error(`Invalid Google service account JSON. Missing: ${missing.join(', ')}`)
  }
}
