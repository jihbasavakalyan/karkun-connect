import { computeRuknNameDirectoryEntriesFromOfficers } from '@/lib/jamaat/jamaatSituationMetrics'
import type { RuknNameDirectory } from '@/lib/jamaat/ruknNameDirectory'
import { getAllRukns } from '@/lib/peopleStore'

export function computeRuknNameDirectory(generatedAt = new Date().toISOString()): RuknNameDirectory {
  return {
    generatedAt,
    entries: computeRuknNameDirectoryEntriesFromOfficers(getAllRukns()),
  }
}
