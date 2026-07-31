/**
 * KC-036 — Client call to privileged master-registry mobile lookup.
 */

import { getFirebaseAuth } from '@/lib/firebase/firebase'

export type MasterMobileLookupHit = {
  readonly kind: 'karkun' | 'rukn'
  readonly id: string
  readonly name: string
  readonly assignedRuknId?: string
}

export type MasterMobileLookupResult =
  | { ok: true; exists: false }
  | { ok: true; exists: true; hit: MasterMobileLookupHit }
  | { ok: false; error: string }

export async function lookupMobileInMasterRegistry(
  mobile: string,
): Promise<MasterMobileLookupResult> {
  try {
    const user = getFirebaseAuth().currentUser
    if (!user) {
      return { ok: false, error: 'Not signed in — cannot verify mobile against master registry.' }
    }
    const idToken = await user.getIdToken(false)
    const response = await fetch('/api/karkun-mobile-lookup', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mobile }),
    })
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
    if (!response.ok || body.ok === false) {
      return {
        ok: false,
        error:
          typeof body.error === 'string'
            ? body.error
            : 'Could not verify mobile against master registry. Please try again.',
      }
    }
    if (body.exists === true) {
      const kind = body.kind === 'rukn' ? 'rukn' : 'karkun'
      return {
        ok: true,
        exists: true,
        hit: {
          kind,
          id: String(body.id || ''),
          name: String(body.name || body.id || ''),
          assignedRuknId:
            typeof body.assignedRuknId === 'string' ? body.assignedRuknId : undefined,
        },
      }
    }
    return { ok: true, exists: false }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
