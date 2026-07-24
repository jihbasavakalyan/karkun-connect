/**
 * KC-0100.3 — Client helper: request server-side Rukn claim provisioning after OTP.
 * Does not bypass JWT validation; caller must force-refresh the ID token afterward.
 */

import type { User } from 'firebase/auth'

export type RuknClaimsProvisionClientResult =
  | { ok: true; ruknId: string; alreadyProvisioned: boolean }
  | { ok: false; error: string; status?: number }

export async function requestRuknClaimsProvision(
  user: User,
): Promise<RuknClaimsProvisionClientResult> {
  const idToken = await user.getIdToken(false)
  let response: Response
  try {
    response = await fetch('/api/rukn-claims-provision', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        Accept: 'application/json',
      },
    })
  } catch (error) {
    console.error('[KC-0100.3] provision request network failure', error)
    return { ok: false, error: 'Claim provisioning is temporarily unavailable.' }
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
    console.error('[KC-0100.3] provision request rejected', {
      status: response.status,
      error,
      uid: user.uid,
    })
    return { ok: false, error, status: response.status }
  }

  const ruknId = typeof body.ruknId === 'string' ? body.ruknId : ''
  return {
    ok: true,
    ruknId,
    alreadyProvisioned: Boolean(body.alreadyProvisioned),
  }
}
