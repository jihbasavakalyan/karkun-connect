/**
 * Canonical person/registry search matching (digit-aware, multi-field).
 * Used by Karkun Registry Quick Search, Available Karkun, Global Search, etc.
 */

import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import { normalizeMobile } from '@/lib/mobileValidation'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'

export function matchesKarkunRegistrySearch(
  karkun: KarkunRegistryRecord,
  query: string,
): boolean {
  const term = query.trim().toLowerCase()
  if (!term) {
    return true
  }

  const assignments = getActiveAssignmentsForKarkun(karkun.id)
  const connectionIds = assignments.map((row) => row.assignmentNumber).join(' ')

  const haystack = [
    karkun.name,
    karkun.mobile,
    karkun.whatsapp ?? '',
    karkun.fatherHusbandName ?? '',
    karkun.place,
    karkun.area,
    karkun.address,
    karkun.id,
    karkun.registryNumber ?? '',
    karkun.assignedRukn,
    karkun.assignedRuknId,
    karkun.status,
    karkun.assignmentStatus,
    connectionIds,
  ]
    .join(' ')
    .toLowerCase()

  const digitQuery = term.replace(/\D/g, '')
  if (digitQuery.length >= 3) {
    const mobileDigits = normalizeMobile(karkun.mobile)
    const whatsappDigits = normalizeMobile(karkun.whatsapp ?? '')
    if (mobileDigits.includes(digitQuery) || whatsappDigits.includes(digitQuery)) {
      return true
    }
  }

  // Every whitespace-separated token must appear somewhere (order-independent).
  return term.split(/\s+/).every((token) => token.length > 0 && haystack.includes(token))
}

/** Prefer the gender that owns the unique mobile/id hit for tab auto-switch. */
export function resolveSearchGenderHint(
  pool: KarkunRegistryRecord[],
  query: string,
): KarkunRegistryRecord['gender'] | null {
  const trimmed = query.trim()
  if (!trimmed) return null

  const hits = pool.filter((person) => matchesKarkunRegistrySearch(person, trimmed))
  if (hits.length === 0) return null

  const genders = new Set(hits.map((person) => person.gender))
  if (genders.size === 1) {
    return hits[0]!.gender
  }
  return null
}
