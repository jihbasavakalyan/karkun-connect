/**
 * Admin-authoritative publisher for Jamaat read models.
 * Rukn never writes. Freshness is explicit via generatedAt.
 */

import { computeJamaatCurrentSituation } from '@/lib/jamaat/computeJamaatCurrentSituation'
import { computeRuknNameDirectory } from '@/lib/jamaat/computeRuknNameDirectory'
import {
  persistJamaatCurrentSituation,
  persistRuknNameDirectory,
} from '@/repositories/firestore/jamaatReadModelFirestore'
import { getFirebaseAuth } from '@/lib/firebase/firebase'

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

  const generatedAt = new Date().toISOString()
  const situation = computeJamaatCurrentSituation(generatedAt)
  const names = computeRuknNameDirectory(generatedAt)

  const situationWrite = await persistJamaatCurrentSituation(situation)
  if (!situationWrite.ok) {
    console.error('[jamaat-read-model] jamaatCurrentSituation publish failed', {
      module: 'jamaatCurrentSituation',
      operation: 'publish',
      result: 'error',
      error: situationWrite.error,
    })
  } else {
    console.info('[jamaat-read-model] jamaatCurrentSituation publish ok', {
      module: 'jamaatCurrentSituation',
      operation: 'publish',
      result: 'ok',
      generatedAt,
    })
  }

  const namesWrite = await persistRuknNameDirectory(names)
  if (!namesWrite.ok) {
    console.error('[jamaat-read-model] ruknNameDirectory publish failed', {
      module: 'ruknNameDirectory',
      operation: 'publish',
      result: 'error',
      error: namesWrite.error,
    })
  } else {
    console.info('[jamaat-read-model] ruknNameDirectory publish ok', {
      module: 'ruknNameDirectory',
      operation: 'publish',
      result: 'ok',
      generatedAt,
      nameCount: names.entries.length,
    })
  }
}
