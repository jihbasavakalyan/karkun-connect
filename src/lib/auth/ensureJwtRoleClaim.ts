/**
 * KC-0061 Phase 2 — Ensure browser JWT carries Firestore role claims.
 *
 * App Auth may resolve Admin via email allowlist or Rukn via phone→master
 * while the ID token still lacks custom claims. Firestore rules require
 * request.auth.token.role — without it both Admin assign and Rukn connect
 * fail at settings/connectionMeta (ASN allocate) and critical hydrate denies.
 */

import { getFirebaseAuth } from '@/lib/firebase/firebase'

export const MISSING_JWT_ROLE_CLAIM_ERROR =
  'Your session is missing authorization claims. Sign out and sign in again, then retry.'

export type JwtRoleClaimResult =
  | {
      ok: true
      role: 'administrator' | 'rukn'
      ruknId: string | null
      forceRefreshed: boolean
    }
  | { ok: false; error: string; forceRefreshed: boolean }

/**
 * Force-refresh once when role claim is absent, then re-read.
 * Does not change AuthProvider / hydration architecture.
 */
export async function ensureJwtRoleClaimPresent(): Promise<JwtRoleClaimResult> {
  const user = getFirebaseAuth().currentUser
  if (!user) {
    return { ok: false, error: 'Not signed in.', forceRefreshed: false }
  }

  let token = await user.getIdTokenResult(false)
  let forceRefreshed = false
  const role = token.claims.role
  if (role !== 'administrator' && role !== 'rukn') {
    token = await user.getIdTokenResult(true)
    forceRefreshed = true
  }

  const nextRole = token.claims.role
  if (nextRole !== 'administrator' && nextRole !== 'rukn') {
    console.error('[KC-0061] JWT still missing role claim after force-refresh', {
      uid: user.uid,
      claimKeys: Object.keys(token.claims),
    })
    return { ok: false, error: MISSING_JWT_ROLE_CLAIM_ERROR, forceRefreshed }
  }

  return {
    ok: true,
    role: nextRole,
    ruknId: typeof token.claims.ruknId === 'string' ? token.claims.ruknId : null,
    forceRefreshed,
  }
}
