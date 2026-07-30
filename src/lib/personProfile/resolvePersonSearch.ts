/**
 * KC-0124 / KC-0128 — Global / module person search → always open 360° profile when unique.
 * Delegates to the canonical Person Resolution pipeline.
 */

import {
  resolveUniquePerson,
  searchPeople,
  type ResolvedPerson,
} from '@/lib/personResolution'

export type PersonSearchHit = {
  personId: string
  name: string
  mobile: string
  profilePath: string
}

function toHit(person: ResolvedPerson): PersonSearchHit | null {
  if (!person.profilePath) return null
  return {
    personId: person.personId,
    name: person.name,
    mobile: person.mobile,
    profilePath: person.profilePath,
  }
}

export function searchPeopleForProfile(query: string, limit = 8): PersonSearchHit[] {
  return searchPeople(query, { limit, includeRukns: false })
    .map(toHit)
    .filter((hit): hit is PersonSearchHit => hit !== null)
}

/** Prefer unique hit → profile; otherwise null (caller may fall back to list). */
export function resolveUniquePersonProfilePath(query: string): string | null {
  const person = resolveUniquePerson(query)
  return person?.profilePath ?? null
}
