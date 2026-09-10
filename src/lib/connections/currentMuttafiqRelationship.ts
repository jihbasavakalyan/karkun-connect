/**
 * Client helper over the pure current-valid Muttafiq predicate.
 * Serverless code must import `currentValidMuttafiqPredicate.js` instead.
 * Campaign `connections` are never consulted.
 *
 * Rukn Home may pass `treatMissingPersonAsCurrent` because a Rukn client
 * cannot always read Muttafiq person documents. The pure predicate does not
 * treat missing persons as current (registration / Admin display).
 */

import {
  isCurrentValidMuttafiqRelationship as isLoadedCurrentValidMuttafiqRelationship,
  type CurrentValidMuttafiqPersonFields,
  type CurrentValidMuttafiqRelationshipFields,
} from './currentValidMuttafiqPredicate.js'

export {
  isCurrentValidMuttafiqPerson,
  isSoftRemovedPerson,
  organisationalCategoryFromPerson,
} from './currentValidMuttafiqPredicate.js'

export type {
  CurrentValidMuttafiqPersonFields as CurrentMuttafiqPersonSnapshot,
  CurrentValidMuttafiqPersonFields as LoosePersonCategoryFields,
  CurrentValidMuttafiqRelationshipFields as CurrentMuttafiqRelationshipSnapshot,
} from './currentValidMuttafiqPredicate.js'

export function isCurrentValidMuttafiqRelationship(
  relationship: CurrentValidMuttafiqRelationshipFields,
  person: CurrentValidMuttafiqPersonFields | null | undefined,
  options?: { treatMissingPersonAsCurrent?: boolean },
): boolean {
  if (String(relationship.status || '') !== 'Active') return false
  const personId = String(relationship.personId || '').trim()
  if (!personId) return false
  if (!person) return options?.treatMissingPersonAsCurrent === true
  return isLoadedCurrentValidMuttafiqRelationship(relationship, person)
}
