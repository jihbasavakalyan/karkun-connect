/**
 * Shared Administrator session gate (Increment D / A Rukn promotion).
 * When no Firebase user is present (local verification), the gate is permissive —
 * Firestore rules still require administrator claims in production.
 */

import { ensureJwtRoleClaimPresent } from '@/lib/auth/ensureJwtRoleClaim'
import { getFirebaseAuth } from '@/lib/firebase/firebase'

export const ADMINISTRATOR_REQUIRED_ERROR =
  'Only an Administrator can complete this action.'

export type AdministratorDecisionSessionResult =
  | { ok: true }
  | { ok: false; error: string }

let testOverride: AdministratorDecisionSessionResult | null = null

/** Verify scripts only — never used by product UI. */
export function setAdministratorDecisionSessionOverrideForTests(
  result: AdministratorDecisionSessionResult | null,
): void {
  testOverride = result
}

export async function assertAdministratorDecisionSession(
  deniedMessage = ADMINISTRATOR_REQUIRED_ERROR,
): Promise<AdministratorDecisionSessionResult> {
  if (testOverride) {
    return testOverride
  }
  if (!getFirebaseAuth().currentUser) {
    return { ok: true }
  }
  const claims = await ensureJwtRoleClaimPresent()
  if (!claims.ok) {
    return { ok: false, error: claims.error }
  }
  if (claims.role !== 'administrator') {
    return { ok: false, error: deniedMessage }
  }
  return { ok: true }
}
