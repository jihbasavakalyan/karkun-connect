/**
 * Current-valid Rukn↔Muttafiq relationship predicate.
 * Authoritative source is `muttafiqRelationships` plus current person category.
 * Campaign `connections` are never consulted.
 */

import { isMuttafiq } from '@/lib/peopleClassification'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export type CurrentMuttafiqPersonSnapshot = Pick<
  KarkunRegistryRecord,
  'category' | 'isArchived' | 'archiveKind'
>

export type LoosePersonCategoryFields = {
  category?: unknown
  isArchived?: unknown
  archiveKind?: unknown
}

export type CurrentMuttafiqRelationshipSnapshot = {
  status?: unknown
  personId?: unknown
}

function toPersonSnapshot(
  person: CurrentMuttafiqPersonSnapshot | LoosePersonCategoryFields | null | undefined,
): CurrentMuttafiqPersonSnapshot | null {
  if (!person) return null
  const category =
    person.category === 'Karkun' || person.category === 'Muttafiq' ? person.category : undefined
  const archiveKind =
    person.archiveKind === 'duplicate_merge' ||
    person.archiveKind === 'admin_delete' ||
    person.archiveKind === 'standard'
      ? person.archiveKind
      : undefined
  return {
    category,
    isArchived: person.isArchived === true,
    archiveKind,
  }
}

/**
 * Person is currently a Muttafiq and not soft-deleted.
 * Uses getPersonCategory via isMuttafiq — never ID prefixes.
 */
export function isCurrentValidMuttafiqPerson(
  person: CurrentMuttafiqPersonSnapshot | LoosePersonCategoryFields | null | undefined,
): boolean {
  const snapshot = toPersonSnapshot(person)
  return Boolean(snapshot && isMuttafiq(snapshot))
}

/**
 * Current Connected Muttafiq row.
 * Default: missing person is not current (full registry / registration).
 * Rukn Home may pass treatMissingPersonAsCurrent because Rukn cannot read
 * unassigned Muttafiq karkun documents (Firestore rules unchanged).
 */
export function isCurrentValidMuttafiqRelationship(
  relationship: CurrentMuttafiqRelationshipSnapshot,
  person: CurrentMuttafiqPersonSnapshot | LoosePersonCategoryFields | null | undefined,
  options?: { treatMissingPersonAsCurrent?: boolean },
): boolean {
  if (String(relationship.status || '') !== 'Active') return false
  const personId = String(relationship.personId || '').trim()
  if (!personId) return false
  if (!person) return options?.treatMissingPersonAsCurrent === true
  return isCurrentValidMuttafiqPerson(person)
}
