/**
 * KC-0101 — People classification helpers (Karkun | Muttafiq).
 * Single authoritative Person record; classification is metadata only.
 */

import type {
  ClassificationHistoryEntry,
  PersonCategory,
  KarkunRegistryRecord,
} from '@/types/karkun-registry.types'

/** Soft-removed records (duplicate merge / controlled delete) — not Muttafiqeen. */
export function isSoftRemoved(
  person: Pick<KarkunRegistryRecord, 'isArchived' | 'archiveKind'>,
): boolean {
  if (!person.isArchived) return false
  return person.archiveKind === 'duplicate_merge' || person.archiveKind === 'admin_delete'
}

/**
 * Resolve organizational classification.
 * Legacy standard archives (pre-migration) resolve as Muttafiq until migration clears isArchived.
 */
export function getPersonCategory(
  person: Pick<KarkunRegistryRecord, 'category' | 'isArchived' | 'archiveKind'>,
): PersonCategory {
  if (person.category === 'Karkun' || person.category === 'Muttafiq') {
    return person.category
  }
  if (person.isArchived && !isSoftRemoved(person)) {
    return 'Muttafiq'
  }
  return 'Karkun'
}

/** Campaign execution eligibility — Karkuns only, never soft-removed. */
export function isCampaignEligible(
  person: Pick<KarkunRegistryRecord, 'category' | 'isArchived' | 'archiveKind'>,
): boolean {
  return getPersonCategory(person) === 'Karkun' && !isSoftRemoved(person) && !person.isArchived
}

export function isMuttafiq(
  person: Pick<KarkunRegistryRecord, 'category' | 'isArchived' | 'archiveKind'>,
): boolean {
  return getPersonCategory(person) === 'Muttafiq' && !isSoftRemoved(person)
}

export function buildClassificationHistoryEntry(input: {
  previousCategory: PersonCategory
  newCategory: PersonCategory
  changedBy: string
  remarks?: string
  at?: string
}): ClassificationHistoryEntry {
  return {
    previousCategory: input.previousCategory,
    newCategory: input.newCategory,
    changedBy: input.changedBy.trim() || 'Administrator',
    changedAt: input.at ?? new Date().toISOString(),
    remarks: input.remarks?.trim() || undefined,
  }
}
