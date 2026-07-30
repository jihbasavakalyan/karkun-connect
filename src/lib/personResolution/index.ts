/**
 * KC-0128 — Unified Person Resolution public API.
 */

export type { ResolvedPerson, ResolvedPersonKind } from './types'
export type { SearchPeopleOptions } from './personResolutionService'
export {
  resolvePersonById,
  resolvePersonByMobile,
  searchPeople,
  resolveUniquePerson,
  getPeopleSearchPool,
  personMatchesSearchQuery,
  toMessageRecipient,
  mappingRowMatchesSearch,
} from './personResolutionService'
