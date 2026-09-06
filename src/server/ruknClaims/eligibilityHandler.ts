/**
 * Pre-OTP Rukn login eligibility (Admin SDK).
 * Unauthenticated: lookup by exact 10-digit mobile only. Does not list rukns.
 * Does not set JWT claims.
 */

import { isExactTenDigitMobileInput,
  matchActiveOfficersByMobile,
  toMinimalLoginIdentity,
  type OfficerLoginCandidate,
} from '../../lib/officerMobileEligibility.js'
import { getRuknClaimsAdmin } from './firebaseAdmin.js'
import { listRuknOfficersForLogin } from './loadOfficersForLogin.js'

export type EligibilityRequest = {
  method?: string
  body?: { mobile?: string } | null
}

export type EligibilityResponse = {
  status: number
  body: Record<string, unknown>
  headers: Record<string, string>
}

function json(status: number, body: Record<string, unknown>): EligibilityResponse {
  return {
    status,
    body,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  }
}

export async function handleRuknLoginEligibility(
  input: EligibilityRequest,
  deps?: {
    listOfficers?: () => Promise<OfficerLoginCandidate[]>
  },
): Promise<EligibilityResponse> {
  if (input.method === 'OPTIONS') {
    return {
      status: 204,
      body: {},
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  }

  if (input.method && input.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' })
  }

  const mobile = String(input.body?.mobile ?? '').trim()
  if (!isExactTenDigitMobileInput(mobile)) {
    return json(400, {
      ok: false,
      allowed: false,
      reason: 'INVALID_FORMAT',
      error: 'Mobile number must be exactly 10 digits.',
    })
  }

  try {
    const officers = deps?.listOfficers
      ? await deps.listOfficers()
      : await listRuknOfficersForLogin(getRuknClaimsAdmin().db)

    const match = matchActiveOfficersByMobile(officers, mobile)

    if (match.kind === 'none' || match.kind === 'invalid_format') {
      return json(200, {
        ok: true,
        allowed: false,
        reason: 'NOT_REGISTERED',
      })
    }

    if (match.kind === 'duplicate') {
      return json(200, {
        ok: true,
        allowed: false,
        reason: 'DUPLICATE_MOBILE',
      })
    }

    const identity = toMinimalLoginIdentity(match.officer)
    return json(200, {
      ok: true,
      allowed: true,
      rukn: {
        id: identity.id,
        mobile: identity.mobile,
        name: identity.name,
      },
    })
  } catch {
    return json(503, {
      ok: false,
      allowed: false,
      reason: 'LOOKUP_UNAVAILABLE',
      error: 'Rukn identity lookup is temporarily unavailable.',
    })
  }
}
