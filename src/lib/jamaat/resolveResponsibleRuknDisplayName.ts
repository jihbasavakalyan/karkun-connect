import { getRuknById } from '@/data/ruknMaster'
import { lookupRuknNameFromDirectory } from '@/lib/jamaat/ruknNameDirectory'
import { getRuknNameDirectoryFromCache } from '@/repositories/firestore/jamaatReadModelFirestore'

/**
 * Prefer the hydrated officer record (Admin has the full registry; Rukn has self).
 * Fall back to the names-only directory — never require rukns read-all.
 */
export function resolveResponsibleRuknDisplayName(ruknId: string | undefined): string | null {
  const id = ruknId?.trim()
  if (!id) return null
  const fromRecord = getRuknById(id)?.name?.trim()
  if (fromRecord) return fromRecord
  return lookupRuknNameFromDirectory(getRuknNameDirectoryFromCache(), id)
}
