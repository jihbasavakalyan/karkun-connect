/**
 * KC-0061 Phase 2 — Ensure browser JWT carries Firestore role claims.
 *
 * App Auth may resolve Admin via email allowlist or Rukn via phone→master
 * while the ID token still lacks custom claims. Firestore rules require
 * request.auth.token.role — without it both Admin assign and Rukn connect
 * fail at settings/connectionMeta (ASN allocate) and critical hydrate denies.
 *
 * KC-0061 / Increment 3.4 — `getIdToken(true)` updates Auth's token manager, but
 * Firestore's `FirebaseAuthCredentialsProvider` applies that token on
 * `addAuthTokenListener` via `enqueueRetryable` (and its own `setTimeout(0)`
 * Auth handshake). Synchronization is: subscribe → force-refresh when the
 * current token lacks a role → wait for the post-initial ID-token notification
 * → then yield so Firestore observes `request.auth.token.role` before the next RPC.
 * Do not force-refresh when the current token already has administrator/rukn.
 */

import { onIdTokenChanged } from 'firebase/auth'
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

export type SynchronizeRefreshedIdTokenInput = {
  getIdToken: (forceRefresh: boolean) => Promise<string>
  subscribeIdTokenChanges: (onChange: () => void) => () => void
  yieldForFirestoreAuthQueue: () => Promise<void>
}

let testOverride: JwtRoleClaimResult | null = null

/** Verify scripts only — never used by product UI. */
export function setJwtRoleClaimOverrideForTests(result: JwtRoleClaimResult | null): void {
  testOverride = result
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
 * Yield macrotasks matching Firestore's AuthCredentialsProvider handshake
 * (`setTimeout(0)` + `enqueueRetryable` credential application).
 */
export function yieldForFirestoreAuthCredentialQueue(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  }).then(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, 0)
      }),
  )
}

function jwtHasAppRole(role: unknown): role is 'administrator' | 'rukn' {
  return role === 'administrator' || role === 'rukn'
}

/**
 * Force-refresh the ID token, wait until Auth has notified ID-token observers
 * (including Firestore), then yield so Firestore can attach the new credential
 * before the next RPC. Never races the notification against the queue yield.
 */
export async function synchronizeRefreshedIdTokenForFirestore(
  input: SynchronizeRefreshedIdTokenInput,
): Promise<string> {
  let skipInitial = true
  let unsubscribe = (): void => {}
  const notified = new Promise<void>((resolve) => {
    unsubscribe = input.subscribeIdTokenChanges(() => {
      if (skipInitial) {
        skipInitial = false
        return
      }
      resolve()
    })
  })

  try {
    const refreshedToken = await input.getIdToken(true)
    await notified
    await input.yieldForFirestoreAuthQueue()
    return refreshedToken
  } finally {
    unsubscribe()
  }
}

/**
 * Require a JWT role claim. Force-refresh and synchronize Firestore credentials
 * only when the current token lacks administrator/rukn. Does not change
 * AuthProvider / hydration architecture.
 */
export async function ensureJwtRoleClaimPresent(): Promise<JwtRoleClaimResult> {
  if (testOverride) {
    return testOverride
  }

  const user = getFirebaseAuth().currentUser
  if (!user) {
    return { ok: false, error: 'Not signed in.', forceRefreshed: false, timeline: null }
  }

  const t1 = Date.now()
  const existing = await user.getIdTokenResult(false)
  let forceRefreshed = false
  if (!jwtHasAppRole(existing.claims.role)) {
    await synchronizeRefreshedIdTokenForFirestore({
      getIdToken: (forceRefresh) => user.getIdToken(forceRefresh),
      subscribeIdTokenChanges: (onChange) => onIdTokenChanged(getFirebaseAuth(), () => onChange()),
      yieldForFirestoreAuthQueue: yieldForFirestoreAuthCredentialQueue,
    })
    forceRefreshed = true
  }
  const t2 = Date.now()
  const token = forceRefreshed ? await user.getIdTokenResult(false) : existing

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
