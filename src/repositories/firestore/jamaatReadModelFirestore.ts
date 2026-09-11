/**
 * Allowlisted settings read models:
 * - settings/jamaatCurrentSituation (five Jamaat metrics)
 * - settings/ruknNameDirectory (officer id → display name only)
 * Trusted publisher writes; Admin and Rukn read. No person registries.
 */

import {
  isJamaatCurrentSituation,
  type JamaatCurrentSituation,
} from '@/lib/jamaat/jamaatCurrentSituation'
import {
  isRuknNameDirectory,
  type RuknNameDirectory,
} from '@/lib/jamaat/ruknNameDirectory'
import { FIRESTORE_DOCS } from '@/repositories/firestore/collections'
import { SyncCache } from '@/repositories/firestore/cache'

const situationCache = new SyncCache<JamaatCurrentSituation | null>(null)
const nameDirectoryCache = new SyncCache<RuknNameDirectory | null>(null)

export function applyJamaatCurrentSituationHydrate(
  row: JamaatCurrentSituation | null,
): void {
  situationCache.set(row && isJamaatCurrentSituation(row) ? row : null)
}

export function applyRuknNameDirectoryHydrate(row: RuknNameDirectory | null): void {
  nameDirectoryCache.set(row && isRuknNameDirectory(row) ? row : null)
}

export function getJamaatCurrentSituationFromCache(): JamaatCurrentSituation | null {
  return situationCache.get()
}

export function getRuknNameDirectoryFromCache(): RuknNameDirectory | null {
  return nameDirectoryCache.get()
}

export function subscribeJamaatReadModels(listener: () => void): () => void {
  const a = situationCache.subscribe(listener)
  const b = nameDirectoryCache.subscribe(listener)
  return () => {
    a()
    b()
  }
}

export function resetJamaatReadModelCachesForTests(): void {
  situationCache.reset(null)
  nameDirectoryCache.reset(null)
}

export function applyJamaatReadModelHydrateFromSettingsDocs(input: {
  situationDoc: unknown
  nameDirectoryDoc: unknown
}): void {
  applyJamaatCurrentSituationHydrate(
    isJamaatCurrentSituation(input.situationDoc) ? input.situationDoc : null,
  )
  applyRuknNameDirectoryHydrate(
    isRuknNameDirectory(input.nameDirectoryDoc) ? input.nameDirectoryDoc : null,
  )
}

/** Live document listener: update one allowlisted settings doc without a full hydrate. */
export function applyJamaatSettingsDocumentSnapshot(docId: string, data: unknown): void {
  if (docId === FIRESTORE_DOCS.jamaatCurrentSituation) {
    applyJamaatCurrentSituationHydrate(isJamaatCurrentSituation(data) ? data : null)
    return
  }
  if (docId === FIRESTORE_DOCS.ruknNameDirectory) {
    applyRuknNameDirectoryHydrate(isRuknNameDirectory(data) ? data : null)
  }
}
