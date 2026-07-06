import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { ruknMaster } from '@/data/ruknMaster'
import type { PersonKind } from '@/types/people.types'

export type PossibleNameDuplicate = {
  row: number
  name: string
  similarTo: string
  existingPerson: string
}

const NAME_PREFIXES = /\b(mohammed|muhammad|mohd|md|moh|syed|syeda|sheikh|sh)\b/gi

export function normalizePersonName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.(),[\]-]/g, ' ')
    .replace(NAME_PREFIXES, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function namesPossiblyDuplicate(a: string, b: string): boolean {
  const normalizedA = normalizePersonName(a)
  const normalizedB = normalizePersonName(b)

  if (!normalizedA || !normalizedB) {
    return false
  }

  if (normalizedA === normalizedB) {
    return true
  }

  const wordsA = normalizedA.split(' ').filter(Boolean)
  const wordsB = normalizedB.split(' ').filter(Boolean)

  if (wordsA.length === 0 || wordsB.length === 0) {
    return false
  }

  const setB = new Set(wordsB)
  const shared = wordsA.filter((word) => setB.has(word))
  const minWords = Math.min(wordsA.length, wordsB.length)

  return shared.length >= minWords - 1 && shared.length >= 1
}

export function findPossibleNameDuplicates(
  name: string,
  kind: PersonKind,
  excludeId?: string,
): { name: string; id: string }[] {
  const matches: { name: string; id: string }[] = []

  if (kind === 'rukn') {
    for (const rukn of ruknMaster) {
      if (excludeId && rukn.id === excludeId) continue
      if (namesPossiblyDuplicate(name, rukn.name)) {
        matches.push({ name: rukn.name, id: rukn.id })
      }
    }
    return matches
  }

  for (const karkun of MOCK_KARKUN_REGISTRY) {
    if (karkun.isArchived) continue
    if (excludeId && karkun.id === excludeId) continue
    if (namesPossiblyDuplicate(name, karkun.name)) {
      matches.push({ name: karkun.name, id: karkun.id })
    }
  }

  return matches
}
