/**
 * KC-0100.3 — Idempotent Rukn custom-claims provisioner (Admin SDK).
 *
 * Called after phone OTP when JWT lacks role/ruknId. Does not bypass KC-0100:
 * the client must still present a valid JWT with claims after refresh.
 *
 * Security:
 * - Caller ID token required
 * - Token phone must match an Active Rukn Master mobile
 * - Never grants administrator
 * - Never changes claims for unrelated UIDs
 */

import { getRuknClaimsAdmin } from './firebaseAdmin.js'

export type ProvisionRequest = {
  method?: string
  authorizationHeader?: string | null
}

export type ProvisionResponse = {
  status: number
  body: Record<string, unknown>
  headers: Record<string, string>
}

function normalizePhone(phone: string | null | undefined): string {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

function json(status: number, body: Record<string, unknown>): ProvisionResponse {
  return {
    status,
    body,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  }
}

export async function handleRuknClaimsProvision(
  input: ProvisionRequest,
): Promise<ProvisionResponse> {
  const started = Date.now()
  if (input.method && input.method !== 'POST' && input.method !== 'OPTIONS') {
    return json(405, { ok: false, error: 'Method not allowed' })
  }
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

  const header = input.authorizationHeader?.trim() ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  if (!match?.[1]) {
    return json(401, { ok: false, error: 'Missing Authorization Bearer token' })
  }

  let auth
  let db
  try {
    ;({ auth, db } = getRuknClaimsAdmin())
  } catch (error) {
    console.error('[KC-0100.3] admin init failed', error)
    return json(503, {
      ok: false,
      error: 'Claim provisioning service is not configured.',
    })
  }

  let decoded
  try {
    decoded = await auth.verifyIdToken(match[1], true)
  } catch (error) {
    console.error('[KC-0100.3] verifyIdToken failed', error)
    return json(401, { ok: false, error: 'Invalid or expired ID token' })
  }

  const uid = decoded.uid
  const phone = typeof decoded.phone_number === 'string' ? decoded.phone_number : null
  if (!phone) {
    return json(403, {
      ok: false,
      error: 'Phone authentication required for Rukn claim provisioning.',
    })
  }

  const mobile = normalizePhone(phone)
  if (mobile.length !== 10) {
    return json(403, { ok: false, error: 'Phone number format is not eligible.' })
  }

  const snap = await db.collection('rukns').get()
  const matches = snap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as { mobile?: string; status?: string; isArchived?: boolean; name?: string }) }))
    .filter(
      (rukn) =>
        rukn.status === 'active' &&
        !rukn.isArchived &&
        normalizePhone(rukn.mobile) === mobile,
    )

  if (matches.length === 0) {
    console.warn('[KC-0100.3] no active rukn for phone', { uid, mobile })
    return json(403, {
      ok: false,
      error: 'This mobile number is not registered as an Active Rukn.',
    })
  }
  if (matches.length > 1) {
    console.error('[KC-0100.3] duplicate active rukn mobile', {
      uid,
      mobile,
      ruknIds: matches.map((r) => r.id),
    })
    return json(409, {
      ok: false,
      error: 'Duplicate Active Rukn records for this mobile. Contact administrator.',
    })
  }

  const rukn = matches[0]!
  const user = await auth.getUser(uid)
  const existing = user.customClaims ?? {}
  if (existing.role === 'administrator') {
    return json(403, { ok: false, error: 'Administrator accounts cannot receive Rukn claims.' })
  }

  if (existing.role === 'rukn' && existing.ruknId === rukn.id) {
    console.info('[KC-0100.3] claims already provisioned', {
      uid,
      ruknId: rukn.id,
      durationMs: Date.now() - started,
      result: 'already_ok',
    })
    return json(200, {
      ok: true,
      alreadyProvisioned: true,
      ruknId: rukn.id,
      uid,
    })
  }

  const nextClaims = {
    ...existing,
    role: 'rukn',
    ruknId: rukn.id,
  }

  await auth.setCustomUserClaims(uid, nextClaims)

  console.info('[KC-0100.3] claims provisioned', {
    module: 'rukn-claims-provision',
    operation: 'setCustomUserClaims',
    uid,
    ruknId: rukn.id,
    name: rukn.name ?? null,
    durationMs: Date.now() - started,
    result: 'provisioned',
  })

  return json(200, {
    ok: true,
    provisioned: true,
    ruknId: rukn.id,
    uid,
  })
}
