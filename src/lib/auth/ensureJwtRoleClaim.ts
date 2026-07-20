/**
 * KC-0061 Phase 2 — Ensure browser JWT carries Firestore role claims.
 *
 * App Auth may resolve Admin via email allowlist or Rukn via phone→master
 * while the ID token still lacks custom claims. Firestore rules require
 * request.auth.token.role — without it both Admin assign and Rukn connect
 * fail at settings/connectionMeta (ASN allocate) and critical hydrate denies.
 *
 * KC-0061 production follow-up — always await getIdToken(true) before the
 * critical Firestore read so T2 (refresh resolved) completes before T3
 * (transaction start). Skipping refresh when claims appear present left a
 * window where Firestore could still use a stale Auth credential.
 */

import { getFirebaseAuth } from '@/lib/firebase/firebase'

export const MISSING_JWT_ROLE_CLAIM_ERROR =
  'Your session is missing authorization claims. Sign out and sign in again, then retry.'

export type JwtRoleClaimTimeline = {
  t1GetIdTokenCalled: number
  t2GetIdTokenResolved: number
  forceRefreshed: boolean
  role: unknown
  ruknId: unknown
  issuedAtTime: string | null
  expirationTime: string | null
}

export type JwtRoleClaimResult =
  | {
      ok: true
      role: 'administrator' | 'rukn'
      ruknId: string | null
      forceRefreshed: boolean
      timeline: JwtRoleClaimTimeline
    }
  | {
      ok: false
      error: string
      forceRefreshed: boolean
      timeline: JwtRoleClaimTimeline | null
    }

function publishLastClaims(payload: Record<string, unknown>): void {
  try {
    if (typeof window === 'undefined') return
    const w = window as Window & {
      __KC0061_LAST_CLAIMS__?: Record<string, unknown>
      __KC0061_TRACE__?: boolean
    }
    w.__KC0061_LAST_CLAIMS__ = payload
    if (w.__KC0061_TRACE__) {
      console.info('[KC-0061] claims gate', payload)
    }
  } catch {
    // ignore
  }
}

/**
 * Always force-refresh the ID token, then require role claim.
 * Does not change AuthProvider / hydration architecture.
 */
export async function ensureJwtRoleClaimPresent(): Promise<JwtRoleClaimResult> {
  const user = getFirebaseAuth().currentUser
  if (!user) {
    return { ok: false, error: 'Not signed in.', forceRefreshed: false, timeline: null }
  }

  const t1 = Date.now()
  // Always force-refresh so Firestore's next request uses a current token
  // that includes custom claims (Gate 3: T2 before T3).
  await user.getIdToken(true)
  const t2 = Date.now()
  const token = await user.getIdTokenResult(false)
  const forceRefreshed = true

  const timeline: JwtRoleClaimTimeline = {
    t1GetIdTokenCalled: t1,
    t2GetIdTokenResolved: t2,
    forceRefreshed,
    role: token.claims.role ?? null,
    ruknId: token.claims.ruknId ?? null,
    issuedAtTime: token.issuedAtTime ?? null,
    expirationTime: token.expirationTime ?? null,
  }

  publishLastClaims({
    uid: user.uid,
    ...timeline,
    claimKeys: Object.keys(token.claims),
  })

  const nextRole = token.claims.role
  if (nextRole !== 'administrator' && nextRole !== 'rukn') {
    console.error('[KC-0061] JWT still missing role claim after force-refresh', {
      uid: user.uid,
      claimKeys: Object.keys(token.claims),
    })
    return { ok: false, error: MISSING_JWT_ROLE_CLAIM_ERROR, forceRefreshed, timeline }
  }

  return {
    ok: true,
    role: nextRole,
    ruknId: typeof token.claims.ruknId === 'string' ? token.claims.ruknId : null,
    forceRefreshed,
    timeline,
  }
}
