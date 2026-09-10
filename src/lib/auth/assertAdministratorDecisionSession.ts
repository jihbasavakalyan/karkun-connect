/**
 * Shared Administrator session gate (Increment D / A Rukn promotion).
 * When no Firebase user is present (local verification), the gate is permissive —
 * Firestore rules still require administrator claims in production.
 *
 * Production path:
 * 1. `ensureJwtRoleClaimPresent()` — Auth JWT must carry `role=administrator`
 *    (force-refresh only when the current token lacks an app role).
 * 2. If claims were just repaired, `synchronizeRefreshedIdTokenForFirestore()`.
 *    If `role=administrator` is already on the token, only yield for Firestore's
 *    credential queue — do not force-refresh on every save.
 */

import { onIdTokenChanged } from 'firebase/auth'
import {
  ensureJwtRoleClaimPresent,
  synchronizeRefreshedIdTokenForFirestore,
  yieldForFirestoreAuthCredentialQueue,
  type SynchronizeRefreshedIdTokenInput,
} from '@/lib/auth/ensureJwtRoleClaim'
import { getFirebaseAuth } from '@/lib/firebase/firebase'

export const ADMINISTRATOR_REQUIRED_ERROR =
  'Only an Administrator can complete this action.'

export type AdministratorDecisionSessionResult =
  | { ok: true }
  | { ok: false; error: string }

export type AdministratorDecisionAuthRuntime = {
  currentUser: { getIdToken: (forceRefresh: boolean) => Promise<string> } | null
  subscribeIdTokenChanges: SynchronizeRefreshedIdTokenInput['subscribeIdTokenChanges']
  yieldForFirestoreAuthQueue: SynchronizeRefreshedIdTokenInput['yieldForFirestoreAuthQueue']
}

let testOverride: AdministratorDecisionSessionResult | null = null
let authRuntimeForTests: AdministratorDecisionAuthRuntime | null = null

/** Verify scripts only — never used by product UI. */
export function setAdministratorDecisionSessionOverrideForTests(
  result: AdministratorDecisionSessionResult | null,
): void {
  testOverride = result
}

/** Verify scripts only — never used by product UI. */
export function setAdministratorDecisionAuthRuntimeForTests(
  runtime: AdministratorDecisionAuthRuntime | null,
): void {
  authRuntimeForTests = runtime
}

function resolveAuthRuntime(): AdministratorDecisionAuthRuntime {
  if (authRuntimeForTests) {
    return authRuntimeForTests
  }
  const auth = getFirebaseAuth()
  return {
    currentUser: auth.currentUser,
    subscribeIdTokenChanges: (onChange) => onIdTokenChanged(auth, () => onChange()),
    yieldForFirestoreAuthQueue: yieldForFirestoreAuthCredentialQueue,
  }
}

export async function assertAdministratorDecisionSession(
  deniedMessage = ADMINISTRATOR_REQUIRED_ERROR,
): Promise<AdministratorDecisionSessionResult> {
  if (testOverride) {
    return testOverride
  }
  const runtime = resolveAuthRuntime()
  if (!runtime.currentUser) {
    return { ok: true }
  }
  const claims = await ensureJwtRoleClaimPresent()
  if (!claims.ok) {
    return { ok: false, error: claims.error }
  }
  if (claims.role !== 'administrator') {
    return { ok: false, error: deniedMessage }
  }
  // Force-refresh only when the JWT was just repaired. A second getIdToken(true)
  // on every Admin save waits on Auth + can hang if onIdTokenChanged does not
  // fire again — that is the recurring "کارروائی مکمل ہونے میں معمول سے زیادہ وقت".
  if (claims.forceRefreshed) {
    await synchronizeRefreshedIdTokenForFirestore({
      getIdToken: (forceRefresh) => runtime.currentUser!.getIdToken(forceRefresh),
      subscribeIdTokenChanges: runtime.subscribeIdTokenChanges,
      yieldForFirestoreAuthQueue: runtime.yieldForFirestoreAuthQueue,
    })
  } else {
    await runtime.yieldForFirestoreAuthQueue()
  }
  return { ok: true }
}
