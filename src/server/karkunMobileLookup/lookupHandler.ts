/**
 * KC-036 — Privileged master-registry mobile existence lookup (Admin SDK).
 * Authenticated Rukn/Admin may check whether a mobile already exists anywhere
 * in the master karkun/rukn registries — bypassing Rukn-scoped client hydrate.
 *
 * Read-only. Never creates or updates people / connections / requests.
 */

import { getRuknClaimsAdmin } from '../ruknClaims/firebaseAdmin.js'

export type MobileLookupRequest = {
  method?: string
  authorizationHeader?: string | null
  body?: { mobile?: string } | null
}

export type MobileLookupResponse = {
  status: number
  body: Record<string, unknown>
  headers: Record<string, string>
}

function json(status: number, body: Record<string, unknown>): MobileLookupResponse {
  return {
    status,
    body,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  }
}

function normalizeMobile(mobile: string): string {
  return mobile.trim().replace(/\D/g, '')
}

function isSoftRemoved(data: Record<string, unknown>): boolean {
  if (data.isArchived !== true) return false
  const kind = String(data.archiveKind || '')
  return kind === 'duplicate_merge' || kind === 'admin_delete'
}

export async function handleKarkunMobileLookup(
  input: MobileLookupRequest,
): Promise<MobileLookupResponse> {
  if (input.method === 'OPTIONS') {
    return {
      status: 204,
      body: {},
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    }
  }

  if (input.method && input.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' })
  }

  const header = input.authorizationHeader?.trim() ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  if (!match?.[1]) {
    return json(401, { ok: false, error: 'Missing Authorization Bearer token' })
  }

  const mobileRaw = String(input.body?.mobile ?? '').trim()
  const normalized = normalizeMobile(mobileRaw)
  if (normalized.length !== 10) {
    return json(400, {
      ok: false,
      error: 'Mobile number must be exactly 10 digits.',
    })
  }

  try {
    const admin = getRuknClaimsAdmin()
    const decoded = await admin.auth.verifyIdToken(match[1])
    const role = String(decoded.role || '')
    if (role !== 'administrator' && role !== 'rukn') {
      return json(403, { ok: false, error: 'Insufficient role for mobile lookup' })
    }

    // Master Rukn registry
    const ruknsSnap = await admin.db.collection('rukns').get()
    for (const doc of ruknsSnap.docs) {
      const data = doc.data()
      const digits = normalizeMobile(String(data.mobile || ''))
      if (digits && digits === normalized) {
        return json(200, {
          ok: true,
          exists: true,
          kind: 'rukn',
          id: doc.id,
          name: String(data.name || doc.id),
          ticket: 'KC-036',
        })
      }
    }

    // Master Karkun / Muttafiq registry (full collection — not Rukn-scoped)
    const karkunsSnap = await admin.db.collection('karkuns').get()
    for (const doc of karkunsSnap.docs) {
      const data = doc.data()
      if (isSoftRemoved(data)) continue
      const digits = normalizeMobile(String(data.mobile || ''))
      if (digits && digits === normalized) {
        return json(200, {
          ok: true,
          exists: true,
          kind: 'karkun',
          id: doc.id,
          name: String(data.name || doc.id),
          assignedRuknId: String(data.assignedRuknId || ''),
          ticket: 'KC-036',
        })
      }
    }

    return json(200, {
      ok: true,
      exists: false,
      ticket: 'KC-036',
    })
  } catch (error) {
    return json(503, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      ticket: 'KC-036',
    })
  }
}
