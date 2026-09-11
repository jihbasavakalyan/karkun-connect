/**
 * Administrator trigger for Jamaat read-model publication.
 * Does not compute counts or write settings docs from the client.
 * The trusted API recomputes and persists both read models.
 */

import { getFirebaseAuth } from '@/lib/firebase/firebase'
import { requestJamaatCurrentSituationPublish } from '@/lib/jamaat/requestJamaatCurrentSituationPublish'

async function isAdministratorClient(): Promise<boolean> {
  try {
    const user = getFirebaseAuth().currentUser
    if (!user) return false
    const token = await user.getIdTokenResult()
    return token.claims.role === 'administrator'
  } catch {
    return false
  }
}

export async function publishJamaatReadModelsIfAdministrator(): Promise<void> {
  const isAdmin = await isAdministratorClient()
  if (!isAdmin) return

  try {
    const result = await requestJamaatCurrentSituationPublish()
    if (!result.ok) {
      console.error('[jamaat-read-model] trusted publish failed', {
        module: 'jamaatCurrentSituation',
        operation: 'publish',
        result: 'error',
        error: result.error,
      })
      return
    }
    console.info('[jamaat-read-model] trusted publish ok', {
      module: 'jamaatCurrentSituation',
      operation: 'publish',
      result: 'ok',
      generatedAt: result.generatedAt,
    })
  } catch (error) {
    console.error('[jamaat-read-model] trusted publish threw', {
      module: 'jamaatCurrentSituation',
      operation: 'publish',
      result: 'error',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
