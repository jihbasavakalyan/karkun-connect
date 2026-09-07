import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { ruknMaster } from '@/data/ruknMaster'
import { isSoftRemoved } from '@/lib/peopleClassification'
import type { PersonKind } from '@/types/people.types'
import type { PersonGender } from '@/types/karkun-registry.types'

export type PossibleNameDuplicate = {
  row: number
  name: string
  similarTo: string
  existingPerson: string
}

export type NameDuplicateScope = {
  gender?: PersonGender
  fatherHusbandName?: string
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

  // After honorific stripping, a single leftover token ("Ali") must not flag every
  // longer name that contains it ("Ali Hassan"). Exact equality is handled above.
  if (wordsA.length === 1 || wordsB.length === 1) {
    return false
  }

  const setB = new Set(wordsB)
  const shared = wordsA.filter((word) => setB.has(word))
  const minWords = Math.min(wordsA.length, wordsB.length)

  return shared.length >= minWords - 1 && shared.length >= 1
}

function sameGender(expected: PersonGender | undefined, actual: unknown): boolean {
  if (!expected) return true
  return String(actual ?? '').trim().toLowerCase() === expected.toLowerCase()
}

/** When both sides have a father/husband name, a mismatch disambiguates same given names. */
function fathersDisambiguate(
  inputFather: string | undefined,
  existingFather: string | undefined,
): boolean {
  const incoming = inputFather?.trim()
  const existing = existingFather?.trim()
  if (!incoming || !existing) return false
  return !namesPossiblyDuplicate(incoming, existing)
}

export function findPossibleNameDuplicates(
  name: string,
  kind: PersonKind,
  excludeId?: string,
  scope?: NameDuplicateScope,
): { name: string; id: string }[] {
  const matches: { name: string; id: string }[] = []

  if (kind === 'rukn') {
    for (const rukn of ruknMaster) {
      if (excludeId && rukn.id === excludeId) continue
      if (!sameGender(scope?.gender, rukn.gender)) continue
      if (namesPossiblyDuplicate(name, rukn.name)) {
        matches.push({ name: rukn.name, id: rukn.id })
      }
    }
    return matches
  }

  for (const person of MOCK_KARKUN_REGISTRY) {
    if (isSoftRemoved(person)) continue
    if (excludeId && person.id === excludeId) continue
    if (!sameGender(scope?.gender, person.gender)) continue
    if (fathersDisambiguate(scope?.fatherHusbandName, person.fatherHusbandName)) continue
    if (namesPossiblyDuplicate(name, person.name)) {
      matches.push({ name: person.name, id: person.id })
    }
  }

  return matches
}
