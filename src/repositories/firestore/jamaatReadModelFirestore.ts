/**
 * Allowlisted settings read models:
 * - settings/jamaatCurrentSituation (five Jamaat metrics)
 * - settings/ruknNameDirectory (officer id → display name only)
 * Admin writes; Rukn reads. No person registries.
 */

import {
  isJamaatCurrentSituation,
  type JamaatCurrentSituation,
} from '@/lib/jamaat/jamaatCurrentSituation'
import {
  isRuknNameDirectory,
  type RuknNameDirectory,
} from '@/lib/jamaat/ruknNameDirectory'
import { FIRESTORE_COLLECTIONS, FIRESTORE_DOCS } from '@/repositories/firestore/collections'
import { SyncCache } from '@/repositories/firestore/cache'
import { sanitizeForFirestore, writeDoc } from '@/repositories/firestore/firestoreHelpers'
import { getFirestoreDb } from '@/lib/firebase/firestore'
import type { RepositoryResult } from '@/repositories/errors'

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

export async function persistJamaatCurrentSituation(
  situation: JamaatCurrentSituation,
): Promise<RepositoryResult<void>> {
  const write = await writeDoc(
    getFirestoreDb(),
    FIRESTORE_COLLECTIONS.settings,
    FIRESTORE_DOCS.jamaatCurrentSituation,
    sanitizeForFirestore(situation),
  )
  if (write.ok) applyJamaatCurrentSituationHydrate(situation)
  return write
}

export async function persistRuknNameDirectory(
  directory: RuknNameDirectory,
): Promise<RepositoryResult<void>> {
  const write = await writeDoc(
    getFirestoreDb(),
    FIRESTORE_COLLECTIONS.settings,
    FIRESTORE_DOCS.ruknNameDirectory,
    sanitizeForFirestore({
      generatedAt: directory.generatedAt,
      entries: [...directory.entries],
    }),
  )
  if (write.ok) applyRuknNameDirectoryHydrate(directory)
  return write
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
