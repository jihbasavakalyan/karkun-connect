/**
 * KC-0100.3 / KC-0100.5 — Client helper: request server-side Rukn claim provisioning after OTP.
 * Does not bypass JWT validation; caller must force-refresh the ID token afterward.
 */

import type { User } from 'firebase/auth'
import {
  errorFields,
  logAuthTrace,
  newAuthTraceId,
  summarizeClaims,
} from '@/lib/auth/authPipelineTrace'

export type RuknClaimsProvisionClientResult =
  | { ok: true; ruknId: string; alreadyProvisioned: boolean; traceId: string }
  | { ok: false; error: string; status?: number; traceId: string }

export async function requestRuknClaimsProvision(
  user: User,
  options?: { traceId?: string; expectedRuknId?: string },
): Promise<RuknClaimsProvisionClientResult> {
  const traceId = options?.traceId ?? newAuthTraceId()
  const tokenResult = await user.getIdTokenResult(false)
  const claimsBefore = summarizeClaims(tokenResult.claims as Record<string, unknown>)

  logAuthTrace(traceId, {
    step: 3,
    name: 'id_token_generated',
    status: 'success',
    uid: user.uid,
    phone: user.phoneNumber,
    ruknId: options?.expectedRuknId ?? null,
    claimsBefore,
  })

  let idToken: string
  try {
    idToken = await user.getIdToken(false)
  } catch (error) {
    const err = errorFields(error)
    logAuthTrace(traceId, {
      step: 3,
      name: 'id_token_generated',
      status: 'failure',
      uid: user.uid,
      phone: user.phoneNumber,
      ruknId: options?.expectedRuknId ?? null,
      claimsBefore,
      ...err,
    })
    return { ok: false, error: err.error, traceId }
  }

  logAuthTrace(traceId, {
    step: 4,
    name: 'post_rukn_claims_provision_sending',
    status: 'info',
    uid: user.uid,
    phone: user.phoneNumber,
    ruknId: options?.expectedRuknId ?? null,
    claimsBefore,
  })

  let response: Response
  try {
    response = await fetch('/api/rukn-claims-provision', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        Accept: 'application/json',
        'X-KC-Trace-Id': traceId,
      },
    })
  } catch (error) {
    const err = errorFields(error)
    logAuthTrace(traceId, {
      step: 4,
      name: 'post_rukn_claims_provision_received',
      status: 'failure',
      uid: user.uid,
      phone: user.phoneNumber,
      ruknId: options?.expectedRuknId ?? null,
      ...err,
    })
    return { ok: false, error: 'Claim provisioning is temporarily unavailable.', traceId }
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await response.json()) as Record<string, unknown>
  } catch {
    body = {}
  }

  if (!response.ok || body.ok !== true) {
    const error =
      typeof body.error === 'string' ? body.error : `Provisioning failed (${response.status})`
    logAuthTrace(traceId, {
      step: 4,
      name: 'post_rukn_claims_provision_received',
      status: 'failure',
      uid: user.uid,
      phone: user.phoneNumber,
      ruknId: options?.expectedRuknId ?? null,
      claimsBefore,
      error,
      detail: {
        httpStatus: response.status,
        adminProjectId: body.adminProjectId ?? null,
        tokenAud: body.tokenAud ?? null,
        responseTraceId: body.traceId ?? null,
      },
    })
    return { ok: false, error, status: response.status, traceId }
  }

  const ruknId = typeof body.ruknId === 'string' ? body.ruknId : ''
  logAuthTrace(traceId, {
    step: 4,
    name: 'post_rukn_claims_provision_received',
    status: 'success',
    uid: user.uid,
    phone: user.phoneNumber,
    ruknId,
    claimsBefore,
    claimsAfter: summarizeClaims((body.claims as Record<string, unknown> | undefined) ?? null),
    detail: {
      httpStatus: response.status,
      alreadyProvisioned: Boolean(body.alreadyProvisioned),
    },
  })

  return {
    ok: true,
    ruknId,
    alreadyProvisioned: Boolean(body.alreadyProvisioned),
    traceId,
  }
}
