/**
 * KC-0124 — Global / module person search → always open 360° profile when unique.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getAllKarkuns, getAllMuttafiqeen } from '@/lib/peopleStore'
import { mobilesMatch, normalizeMobile } from '@/lib/mobileValidation'
import { matchesKarkunRegistrySearch } from '@/lib/relationshipPresentation'
import { adminPersonProfilePath } from './ProfilePresenter'

export type PersonSearchHit = {
  personId: string
  name: string
  mobile: string
  profilePath: string
}

export function searchPeopleForProfile(query: string, limit = 8): PersonSearchHit[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const pool = [...getAllKarkuns(), ...getAllMuttafiqeen()]
  const byId = new Map(pool.map((person) => [person.id, person]))
  const unique = [...byId.values()]

  const mobileNorm = normalizeMobile(trimmed)
  const mobileHits = unique.filter((person) => mobilesMatch(person.mobile, mobileNorm))
  if (mobileHits.length > 0) {
    return mobileHits.slice(0, limit).map((person) => ({
      personId: person.id,
      name: person.name,
      mobile: person.mobile,
      profilePath: adminPersonProfilePath(person.id),
    }))
  }

  const idHit = getKarkunById(trimmed)
  if (idHit) {
    return [
      {
        personId: idHit.id,
        name: idHit.name,
        mobile: idHit.mobile,
        profilePath: adminPersonProfilePath(idHit.id),
      },
    ]
  }

  return unique
    .filter((person) => matchesKarkunRegistrySearch(person, trimmed))
    .slice(0, limit)
    .map((person) => ({
      personId: person.id,
      name: person.name,
      mobile: person.mobile,
      profilePath: adminPersonProfilePath(person.id),
    }))
}

/** Prefer unique hit → profile; otherwise null (caller may fall back to list). */
export function resolveUniquePersonProfilePath(query: string): string | null {
  const hits = searchPeopleForProfile(query, 2)
  if (hits.length === 1) return hits[0]!.profilePath
  return null
}
