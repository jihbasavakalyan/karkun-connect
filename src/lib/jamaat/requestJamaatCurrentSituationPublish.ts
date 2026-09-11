/**
 * Client call to the trusted Jamaat aggregate publisher.
 * Does not send counts. Server recomputes from Firestore.
 */

import { getFirebaseAuth } from '@/lib/firebase/firebase'

export const JAMAAT_READ_MODEL_REFRESH_FAILED =
  'Connection saved. Jamaat-wide situation could not be refreshed. The previous situation remains until an Administrator session republishes it.'

export type JamaatTrustedPublishResult =
  | { ok: true; generatedAt: string; counts: Record<string, number> }
  | { ok: false; error: string }

export async function requestJamaatCurrentSituationPublish(): Promise<JamaatTrustedPublishResult> {
  const user = getFirebaseAuth().currentUser
  if (!user) {
    return { ok: false, error: 'Not signed in' }
  }
  const idToken = await user.getIdToken(false)
  const response = await fetch('/api/jamaat-current-situation-publish', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok || body.ok !== true) {
    return {
      ok: false,
      error: typeof body.error === 'string' ? body.error : JAMAAT_READ_MODEL_REFRESH_FAILED,
    }
  }
  return {
    ok: true,
    generatedAt: typeof body.generatedAt === 'string' ? body.generatedAt : '',
    counts: body.counts && typeof body.counts === 'object' ? (body.counts as Record<string, number>) : {},
  }
}

/**
 * After a durable connection write: Rukn asks the trusted publisher to recompute.
 * Admin sessions already publish from the layout/home via the same API; skip here.
 * Never throws — connection success must remain independent of refresh.
 */
export async function refreshJamaatReadModelsAfterConnectionWrite(): Promise<JamaatTrustedPublishResult | null> {
  try {
    const user = getFirebaseAuth().currentUser
    if (!user) return null
    const token = await user.getIdTokenResult()
    if (token.claims.role !== 'rukn') return null
    const result = await requestJamaatCurrentSituationPublish()
    if (!result.ok) {
      console.error('[jamaat-read-model] connection write succeeded; aggregate refresh failed', {
        module: 'jamaatCurrentSituation',
        operation: 'publishAfterConnection',
        result: 'error',
        error: result.error,
      })
    }
    return result
  } catch (error) {
    console.error('[jamaat-read-model] connection write succeeded; aggregate refresh threw', {
      module: 'jamaatCurrentSituation',
      operation: 'publishAfterConnection',
      result: 'error',
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      ok: false,
      error: error instanceof Error ? error.message : JAMAAT_READ_MODEL_REFRESH_FAILED,
    }
  }
}
