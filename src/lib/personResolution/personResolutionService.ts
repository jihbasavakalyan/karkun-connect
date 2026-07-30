/**
 * KC-0128 — Unified Person Resolution service.
 * Source of truth for person lookups across Registry, Global Search,
 * duplicate detection, connection/assignment dialogs, profile, and communication.
 *
 * Reuses existing stores + matchers. No Firestore / repository / schema changes.
 */

import { getKarkunById, MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { getRuknById, ruknMaster, type Rukn } from '@/data/ruknMaster'
import { adminPersonProfilePath } from '@/lib/personProfile/ProfilePresenter'
import {
  getPersonCategory,
  isSoftRemoved,
} from '@/lib/peopleClassification'
import { matchesKarkunRegistrySearch } from '@/lib/peopleSearch'
import { findMobileOwner, getAllKarkuns, getAllMuttafiqeen } from '@/lib/peopleStore'
import { mobilesMatch, normalizeMobile } from '@/lib/mobileValidation'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { MessageRecipient } from '@/types/communication'
import type { ResolvedPerson, ResolvedPersonKind } from './types'

export type { ResolvedPerson, ResolvedPersonKind } from './types'

export type SearchPeopleOptions = {
  limit?: number
  /** Restrict to registry categories / rukn. Default: all. */
  kinds?: readonly ResolvedPersonKind[]
  /** When set, prefer this category pool but still surface exact mobile/id hits elsewhere. */
  preferCategory?: 'Karkun' | 'Muttafiq'
  includeRukns?: boolean
}

function fromRegistryRecord(person: KarkunRegistryRecord): ResolvedPerson {
  const category = getPersonCategory(person)
  return {
    personId: person.id,
    kind: category === 'Muttafiq' ? 'muttafiq' : 'karkun',
    category,
    name: person.name,
    mobile: person.mobile,
    whatsapp: person.whatsapp,
    gender: person.gender,
    registryNumber: person.registryNumber ?? '',
    assignedRuknId: person.assignedRuknId ?? '',
    assignedRukn: person.assignedRukn ?? '',
    area: person.area ?? '',
    place: person.place ?? '',
    ward: person.area ?? '',
    status: person.status,
    assignmentStatus: person.assignmentStatus,
    profilePath: adminPersonProfilePath(person.id),
  }
}

function fromRukn(rukn: Rukn): ResolvedPerson {
  return {
    personId: rukn.id,
    kind: 'rukn',
    category: null,
    name: rukn.name,
    mobile: rukn.mobile ?? '',
    whatsapp: undefined,
    gender: rukn.gender ?? null,
    registryNumber: '',
    assignedRuknId: '',
    assignedRukn: '',
    area: rukn.place ?? '',
    place: rukn.place ?? '',
    ward: rukn.place ?? '',
    status: rukn.status ?? '',
    assignmentStatus: '',
    profilePath: null,
  }
}

function allRegistryPeople(): KarkunRegistryRecord[] {
  const byId = new Map<string, KarkunRegistryRecord>()
  for (const person of [...getAllKarkuns(false), ...getAllMuttafiqeen()]) {
    byId.set(person.id, person)
  }
  return [...byId.values()]
}

function resolveRegistryRecord(personId: string): KarkunRegistryRecord | undefined {
  const memory = getKarkunById(personId)
  if (memory && !isSoftRemoved(memory)) return memory
  return MOCK_KARKUN_REGISTRY.find((row) => row.id === personId && !isSoftRemoved(row))
}

/** Resolve a single person by durable id (registry or Rukn). */
export function resolvePersonById(personId: string): ResolvedPerson | null {
  const trimmed = personId.trim()
  if (!trimmed) return null

  const registry = resolveRegistryRecord(trimmed)
  if (registry) return fromRegistryRecord(registry)

  const rukn = getRuknById(trimmed)
  if (rukn) return fromRukn(rukn)

  return null
}

/**
 * Exact mobile ownership — same identity surface as Add New / Existing Person duplicate detection.
 */
export function resolvePersonByMobile(mobile: string): ResolvedPerson | null {
  const owner = findMobileOwner(mobile)
  if (!owner) return null
  return resolvePersonById(owner.id)
}

function matchesRuknSearch(rukn: Rukn, query: string): boolean {
  const term = query.trim().toLowerCase()
  if (!term) return true

  const digitQuery = term.replace(/\D/g, '')
  if (digitQuery.length >= 3) {
    const mobileDigits = normalizeMobile(rukn.mobile ?? '')
    if (mobileDigits.includes(digitQuery)) return true
  }

  const haystack = [rukn.id, rukn.name, rukn.mobile ?? '', rukn.place ?? '']
    .join(' ')
    .toLowerCase()
  return term.split(/\s+/).every((token) => token.length > 0 && haystack.includes(token))
}

function matchesConnectionOrAssignmentIds(person: KarkunRegistryRecord, query: string): boolean {
  const term = query.trim().toLowerCase()
  if (!term) return false
  const assignments = getActiveAssignmentsForKarkun(person.id)
  return assignments.some(
    (row) =>
      row.assignmentNumber.toLowerCase().includes(term) ||
      row.assignmentId.toLowerCase() === term ||
      row.ruknId.toLowerCase() === term,
  )
}

/**
 * Canonical multi-field people search used by every lookup surface.
 * Mobile / id / registry / connection / assigned Rukn / area / name share one pipeline.
 */
export function searchPeople(
  query: string,
  options: SearchPeopleOptions = {},
): ResolvedPerson[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const limit = options.limit ?? 25
  const includeRukns = options.includeRukns !== false
  const kindFilter = options.kinds ? new Set(options.kinds) : null
  const allowKind = (kind: ResolvedPersonKind) => !kindFilter || kindFilter.has(kind)

  const results: ResolvedPerson[] = []
  const seen = new Set<string>()

  const push = (person: ResolvedPerson) => {
    if (seen.has(person.personId)) return
    if (!allowKind(person.kind)) return
    seen.add(person.personId)
    results.push(person)
  }

  // 1) Exact mobile ownership (parity with duplicate detection).
  const byMobile = resolvePersonByMobile(trimmed)
  if (byMobile) push(byMobile)

  // 2) Exact id (person / rukn / registry number).
  const byId = resolvePersonById(trimmed)
  if (byId) push(byId)

  const mobileNorm = normalizeMobile(trimmed)
  if (mobileNorm.length >= 3) {
    for (const person of allRegistryPeople()) {
      if (mobilesMatch(person.mobile, mobileNorm)) push(fromRegistryRecord(person))
      if (person.whatsapp && mobilesMatch(person.whatsapp, mobileNorm)) {
        push(fromRegistryRecord(person))
      }
    }
    if (includeRukns) {
      for (const rukn of ruknMaster) {
        if (rukn.mobile && mobilesMatch(rukn.mobile, mobileNorm)) push(fromRukn(rukn))
      }
    }
  }

  for (const person of allRegistryPeople()) {
    if (person.registryNumber && person.registryNumber.toLowerCase() === trimmed.toLowerCase()) {
      push(fromRegistryRecord(person))
    }
  }

  // 3) Canonical digit-aware / multi-field matcher across full people registry.
  for (const person of allRegistryPeople()) {
    if (matchesKarkunRegistrySearch(person, trimmed) || matchesConnectionOrAssignmentIds(person, trimmed)) {
      push(fromRegistryRecord(person))
    }
  }

  if (includeRukns) {
    for (const rukn of ruknMaster) {
      if (matchesRuknSearch(rukn, trimmed)) push(fromRukn(rukn))
    }
  }

  // Prefer requested category when ranking (stable unique set already built).
  if (options.preferCategory) {
    results.sort((a, b) => {
      const aMatch = a.category === options.preferCategory ? 0 : 1
      const bMatch = b.category === options.preferCategory ? 0 : 1
      return aMatch - bMatch
    })
  }

  return results.slice(0, limit)
}

/** Unique hit helper for Global Search → profile navigation. */
export function resolveUniquePerson(query: string): ResolvedPerson | null {
  const hits = searchPeople(query, { limit: 2, includeRukns: false })
  if (hits.length === 1) return hits[0]!
  return null
}

/** Registry list search pool: full people set while a query is active (category silo for browse only). */
export function getPeopleSearchPool(preferCategory?: 'Karkun' | 'Muttafiq'): KarkunRegistryRecord[] {
  const all = allRegistryPeople()
  if (!preferCategory) return all
  return [...all].sort((a, b) => {
    const aMatch = getPersonCategory(a) === preferCategory ? 0 : 1
    const bMatch = getPersonCategory(b) === preferCategory ? 0 : 1
    return aMatch - bMatch
  })
}

/** Filter a registry pool with the canonical matcher (shared by Registry Quick / Advanced Search). */
export function personMatchesSearchQuery(
  person: KarkunRegistryRecord,
  query: string,
): boolean {
  return matchesKarkunRegistrySearch(person, query)
}

/** Communication recipient from a resolved person (Muttafiq maps to karkun kind for message APIs). */
export function toMessageRecipient(person: ResolvedPerson): MessageRecipient | null {
  if (!person.mobile.trim()) return null
  return {
    personId: person.personId,
    personKind: person.kind === 'rukn' ? 'rukn' : 'karkun',
    name: person.name,
    mobile: person.mobile,
    whatsapp: person.whatsapp,
  }
}

/** Free-text match helper for nested mapping rows (Rukn + connected Karkuns). */
export function mappingRowMatchesSearch(
  input: {
    ruknName: string
    mobile: string
    area: string
    karkuns: { assignmentNumber: string; karkun?: KarkunRegistryRecord | null }[]
  },
  query: string,
): boolean {
  const trimmed = query.trim()
  if (!trimmed) return true

  const digitQuery = trimmed.replace(/\D/g, '')
  if (digitQuery.length >= 3) {
    if (normalizeMobile(input.mobile).includes(digitQuery)) return true
  }

  const ruknHaystack = [input.ruknName, input.mobile, input.area].join(' ').toLowerCase()
  const term = trimmed.toLowerCase()
  if (term.split(/\s+/).every((token) => token.length > 0 && ruknHaystack.includes(token))) {
    return true
  }

  return input.karkuns.some(({ assignmentNumber, karkun }) => {
    if (assignmentNumber.toLowerCase().includes(term)) return true
    if (!karkun) return false
    return matchesKarkunRegistrySearch(karkun, trimmed)
  })
}
