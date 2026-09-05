/**
 * KC-0100.3 / KC-0100.5 — Idempotent Rukn custom-claims provisioner (Admin SDK).
 *
 * Called after phone OTP when JWT lacks role/ruknId. Does not bypass KC-0100:
 * the client must still present a valid JWT with claims after refresh.
 */

import { errorFields, logAuthTrace, summarizeClaims } from '../../lib/auth/authPipelineTrace.js'
import { buildOfficerRuknClaims, isActiveOfficerForRuknClaims } from '../../lib/officerIdentity.js'
import { getRuknClaimsAdmin, peekExpectedFirebaseProject } from './firebaseAdmin.js'

export type ProvisionRequest = {
  method?: string
  authorizationHeader?: string | null
  traceId?: string | null
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

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const jsonText = Buffer.from(part, 'base64url').toString('utf8')
    return JSON.parse(jsonText) as Record<string, unknown>
  } catch {
    return null
  }
}

function readTraceId(header: string | null | undefined, bodyTrace?: string | null): string {
  return bodyTrace?.trim() || header?.trim() || `srv-${Date.now().toString(36)}`
}

export async function handleRuknClaimsProvision(
  input: ProvisionRequest,
): Promise<ProvisionResponse> {
  const started = Date.now()
  const traceId = readTraceId(null, input.traceId)

  if (input.method && input.method !== 'POST' && input.method !== 'OPTIONS' && input.method !== 'GET') {
    return json(405, { ok: false, error: 'Method not allowed' })
  }

  if (input.method === 'OPTIONS') {
    return {
      status: 204,
      body: {},
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-KC-Trace-Id',
      },
    }
  }

  // KC-0100.5 — safe diagnostics (no secrets): prove Admin init + project alignment.
  if (input.method === 'GET') {
    try {
      const admin = getRuknClaimsAdmin()
      return json(200, {
        ok: true,
        ticket: 'KC-0100.5',
        expectedProject: peekExpectedFirebaseProject(),
        projectId: admin.projectId,
        serviceAccountProjectId: admin.serviceAccountProjectId,
        serviceAccountEmail: admin.serviceAccountEmail,
        credentialSource: admin.credentialSource,
        projectMatch: admin.serviceAccountProjectId === peekExpectedFirebaseProject(),
      })
    } catch (error) {
      const err = errorFields(error)
      logAuthTrace(traceId, {
        step: 6,
        name: 'admin_sdk_init',
        status: 'failure',
        ...err,
      })
      return json(503, {
        ok: false,
        ticket: 'KC-0100.5',
        expectedProject: peekExpectedFirebaseProject(),
        error: err.error,
      })
    }
  }

  logAuthTrace(traceId, {
    step: 4,
    name: 'post_rukn_claims_provision_received',
    status: 'success',
    detail: { hasAuthorization: Boolean(input.authorizationHeader) },
  })

  const header = input.authorizationHeader?.trim() ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  if (!match?.[1]) {
    logAuthTrace(traceId, {
      step: 5,
      name: 'request_authentication',
      status: 'failure',
      error: 'Missing Authorization Bearer token',
    })
    return json(401, { ok: false, error: 'Missing Authorization Bearer token', traceId })
  }

  const idToken = match[1]
  const unverified = decodeJwtPayload(idToken)

  let admin
  try {
    admin = getRuknClaimsAdmin()
    logAuthTrace(traceId, {
      step: 6,
      name: 'admin_sdk_init',
      status: 'success',
      uid: typeof unverified?.user_id === 'string' ? unverified.user_id : null,
      detail: {
        projectId: admin.projectId,
        serviceAccountProjectId: admin.serviceAccountProjectId,
        credentialSource: admin.credentialSource,
      },
    })
  } catch (error) {
    const err = errorFields(error)
    logAuthTrace(traceId, {
      step: 6,
      name: 'admin_sdk_init',
      status: 'failure',
      ...err,
    })
    return json(503, {
      ok: false,
      error: 'Claim provisioning service is not configured.',
      detail: err.error,
      traceId,
    })
  }

  logAuthTrace(traceId, {
    step: 5,
    name: 'request_authentication',
    status: 'success',
    uid: typeof unverified?.sub === 'string' ? unverified.sub : null,
    detail: {
      tokenAud: unverified?.aud ?? null,
      tokenIss: unverified?.iss ?? null,
      adminProjectId: admin.projectId,
    },
  })

  let decoded
  try {
    decoded = await admin.auth.verifyIdToken(idToken, true)
    logAuthTrace(traceId, {
      step: 6,
      name: 'verifyIdToken',
      status: 'success',
      uid: decoded.uid,
      phone: typeof decoded.phone_number === 'string' ? decoded.phone_number : null,
      claimsBefore: summarizeClaims(decoded as unknown as Record<string, unknown>),
    })
  } catch (error) {
    const err = errorFields(error)
    logAuthTrace(traceId, {
      step: 6,
      name: 'verifyIdToken',
      status: 'failure',
      uid: typeof unverified?.sub === 'string' ? unverified.sub : null,
      phone: typeof unverified?.phone_number === 'string' ? unverified.phone_number : null,
      ...err,
      detail: {
        tokenAud: unverified?.aud ?? null,
        adminProjectId: admin.projectId,
        serviceAccountProjectId: admin.serviceAccountProjectId,
        credentialSource: admin.credentialSource,
        projectMismatch:
          typeof unverified?.aud === 'string' && unverified.aud !== admin.projectId,
      },
    })
    const mismatch =
      typeof unverified?.aud === 'string' && unverified.aud !== admin.projectId
    return json(401, {
      ok: false,
      error: mismatch
        ? `Invalid ID token for Admin project ${admin.projectId} (token aud=${unverified?.aud}). Check FIREBASE_SERVICE_ACCOUNT_JSON.`
        : 'Invalid or expired ID token',
      traceId,
      adminProjectId: admin.projectId,
      tokenAud: unverified?.aud ?? null,
    })
  }

  const uid = decoded.uid
  const phone = typeof decoded.phone_number === 'string' ? decoded.phone_number : null
  if (!phone) {
    logAuthTrace(traceId, {
      step: 7,
      name: 'rukn_lookup_by_phone',
      status: 'failure',
      uid,
      error: 'Phone authentication required for Rukn claim provisioning.',
    })
    return json(403, {
      ok: false,
      error: 'Phone authentication required for Rukn claim provisioning.',
      traceId,
    })
  }

  const mobile = normalizePhone(phone)
  if (mobile.length !== 10) {
    return json(403, { ok: false, error: 'Phone number format is not eligible.', traceId })
  }

  let matches
  try {
    const snap = await admin.db.collection('rukns').get()
    matches = snap.docs
      .map((doc) => ({
        id: doc.id,
        ...(doc.data() as {
          mobile?: string
          status?: string
          isArchived?: boolean
          name?: string
        }),
      }))
      .filter(
        (rukn) =>
          isActiveOfficerForRuknClaims(rukn) &&
          normalizePhone(rukn.mobile) === mobile,
      )
    logAuthTrace(traceId, {
      step: 7,
      name: 'rukn_lookup_by_phone',
      status: matches.length === 1 ? 'success' : 'failure',
      uid,
      phone,
      ruknId: matches[0]?.id ?? null,
      detail: { matchCount: matches.length, mobile },
    })
  } catch (error) {
    const err = errorFields(error)
    logAuthTrace(traceId, {
      step: 7,
      name: 'rukn_lookup_by_phone',
      status: 'failure',
      uid,
      phone,
      ...err,
    })
    return json(500, { ok: false, error: 'Rukn Master lookup failed.', traceId })
  }

  if (matches.length === 0) {
    return json(403, {
      ok: false,
      error: 'This mobile number is not registered as an Active Rukn.',
      traceId,
    })
  }
  if (matches.length > 1) {
    return json(409, {
      ok: false,
      error: 'Duplicate Active Rukn records for this mobile. Contact administrator.',
      traceId,
    })
  }

  const rukn = matches[0]!
  logAuthTrace(traceId, {
    step: 8,
    name: 'active_status_validation',
    status: 'success',
    uid,
    phone,
    ruknId: rukn.id,
    detail: { status: 'active', isArchived: false, name: rukn.name ?? null },
  })

  const user = await admin.auth.getUser(uid)
  const existing = (user.customClaims ?? {}) as Record<string, unknown>
  const claimsBefore = summarizeClaims(existing)

  if (existing.role === 'administrator') {
    return json(403, {
      ok: false,
      error: 'Administrator accounts cannot receive Rukn claims.',
      traceId,
    })
  }

  const officerClaims = buildOfficerRuknClaims(rukn.id)

  if (existing.role === 'rukn' && existing.ruknId === officerClaims.ruknId) {
    logAuthTrace(traceId, {
      step: 9,
      name: 'setCustomUserClaims',
      status: 'skipped',
      uid,
      phone,
      ruknId: rukn.id,
      claimsBefore,
      claimsAfter: claimsBefore,
      detail: { result: 'already_ok', durationMs: Date.now() - started },
    })
    return json(200, {
      ok: true,
      alreadyProvisioned: true,
      ruknId: rukn.id,
      uid,
      traceId,
      claims: claimsBefore,
    })
  }

  const nextClaims = {
    ...existing,
    ...officerClaims,
  }

  logAuthTrace(traceId, {
    step: 9,
    name: 'setCustomUserClaims_called',
    status: 'info',
    uid,
    phone,
    ruknId: rukn.id,
    claimsBefore,
    claimsAfter: summarizeClaims(nextClaims),
  })

  try {
    await admin.auth.setCustomUserClaims(uid, nextClaims)
    logAuthTrace(traceId, {
      step: 10,
      name: 'setCustomUserClaims_completed',
      status: 'success',
      uid,
      phone,
      ruknId: rukn.id,
      claimsBefore,
      claimsAfter: summarizeClaims(nextClaims),
      detail: { durationMs: Date.now() - started },
    })
  } catch (error) {
    const err = errorFields(error)
    logAuthTrace(traceId, {
      step: 10,
      name: 'setCustomUserClaims_completed',
      status: 'failure',
      uid,
      phone,
      ruknId: rukn.id,
      claimsBefore,
      ...err,
    })
    return json(500, { ok: false, error: 'Failed to set custom claims.', traceId })
  }

  const confirmed = await admin.auth.getUser(uid)
  const claimsAfter = summarizeClaims(confirmed.customClaims as Record<string, unknown>)
  const confirmedOk = claimsAfter?.role === 'rukn' && claimsAfter?.ruknId === rukn.id
  logAuthTrace(traceId, {
    step: 11,
    name: 'getUser_confirms_stored_claims',
    status: confirmedOk ? 'success' : 'failure',
    uid,
    phone,
    ruknId: rukn.id,
    claimsBefore,
    claimsAfter,
  })

  return json(200, {
    ok: true,
    provisioned: true,
    ruknId: rukn.id,
    uid,
    traceId,
    claims: claimsAfter,
  })
}
