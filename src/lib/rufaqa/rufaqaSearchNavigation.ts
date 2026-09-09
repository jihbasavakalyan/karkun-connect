import { searchPeople } from '@/lib/personResolution'
import {
  rufaqaCategoryForResolvedPerson,
  rufaqaCategoryPath,
  rufaqaDetailPathForPerson,
} from '@/lib/rufaqa/rufaqaPresentation'

/**
 * Admin top-bar search: reuse searchPeople (include officers).
 * Unique hit → existing detail. Otherwise → matching category list with search context.
 */
export function resolveRufaqaSearchNavigation(query: string): string {
  const trimmed = query.trim()
  if (!trimmed) return rufaqaCategoryPath('karkun')

  const hits = searchPeople(trimmed, { limit: 8, includeRukns: true })
  if (hits.length === 1) {
    return rufaqaDetailPathForPerson(hits[0]!)
  }
  if (hits.length === 0) {
    return rufaqaCategoryPath('karkun', { search: trimmed })
  }

  const categories = new Set(hits.map(rufaqaCategoryForResolvedPerson))
  if (categories.size === 1) {
    return rufaqaCategoryPath([...categories][0]!, { search: trimmed })
  }

  return rufaqaCategoryPath(rufaqaCategoryForResolvedPerson(hits[0]!), { search: trimmed })
}
