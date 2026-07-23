/**
 * KC-0101 — People classification helpers (Karkun | Muttafiq).
 * Single authoritative Person record; classification is metadata only.
 */

import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
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

export function isKarkun(
  person: Pick<KarkunRegistryRecord, 'category' | 'isArchived' | 'archiveKind'>,
): boolean {
  return getPersonCategory(person) === 'Karkun' && !isSoftRemoved(person) && !person.isArchived
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

/** Parse MT-001 style Muttafiqeen registry display numbers. */
export function parseMuttafiqRegistryNum(value: string | undefined): number | null {
  if (!value?.trim()) return null
  const match = /^mt-(\d+)$/i.exec(value.trim())
  if (!match) return null
  const num = Number.parseInt(match[1]!, 10)
  return Number.isFinite(num) && num > 0 ? num : null
}

export function formatMuttafiqRegistryNumber(num: number): string {
  return `MT-${String(num).padStart(3, '0')}`
}

export function getMaxMuttafiqRegistryNum(
  records: Iterable<Pick<KarkunRegistryRecord, 'registryNumber'>> = MOCK_KARKUN_REGISTRY,
): number {
  let max = 0
  for (const record of records) {
    const num = parseMuttafiqRegistryNum(record.registryNumber)
    if (num != null && num > max) max = num
  }
  return max
}

/**
 * Next free Muttafiqeen display number (MT-*).
 * Does not allocate Firestore / Person document ids.
 */
export function allocateNextMuttafiqRegistryNumber(
  records: Iterable<Pick<KarkunRegistryRecord, 'registryNumber'>> = MOCK_KARKUN_REGISTRY,
): string {
  return formatMuttafiqRegistryNumber(getMaxMuttafiqRegistryNum(records) + 1)
}

/** Assign MT-* display number when missing; never changes Person id. */
export function ensureMuttafiqRegistryNumber(person: KarkunRegistryRecord): string {
  const existing = parseMuttafiqRegistryNum(person.registryNumber)
  if (existing != null) {
    const normalized = formatMuttafiqRegistryNumber(existing)
    person.registryNumber = normalized
    return normalized
  }
  const next = allocateNextMuttafiqRegistryNumber()
  person.registryNumber = next
  return next
}

/** Display label for Muttafiqeen registry rows (never the Firestore id). */
export function getMuttafiqDisplayNumber(
  person: Pick<KarkunRegistryRecord, 'registryNumber' | 'category' | 'isArchived' | 'archiveKind'>,
): string | undefined {
  if (getPersonCategory(person) !== 'Muttafiq') return undefined
  const num = parseMuttafiqRegistryNum(person.registryNumber)
  return num != null ? formatMuttafiqRegistryNumber(num) : person.registryNumber
}
