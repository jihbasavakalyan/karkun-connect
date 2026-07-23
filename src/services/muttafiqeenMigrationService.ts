/**
 * KC-0101 — Idempotent migration: restore standard archived people into Muttafiqeen.
 *
 * Investigation summary (pre-migration):
 * - Archived people live in Firestore `karkuns/{id}` with `isArchived: true` (soft flag).
 * - No separate archive collection.
 * - `archiveKind`: `standard` (legacy Archive UI), `duplicate_merge`, `admin_delete`.
 * - Campaign/assignment/comms already exclude archived via `getAllKarkuns()` / `!isArchived`.
 *
 * Migration rules:
 * - standard / missing archiveKind + isArchived → category Muttafiq, clear isArchived (preserve ID).
 * - duplicate_merge / admin_delete → remain soft-removed (not Muttafiqeen).
 * - Already category Muttafiq → no-op (idempotent).
 * - Active Karkuns without category → set category Karkun (normalize).
 */

import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import {
  buildClassificationHistoryEntry,
  getPersonCategory,
  isSoftRemoved,
} from '@/lib/peopleClassification'
import { bumpVersion } from '@/lib/preservation/softDelete'
import { getNextKarkunNum } from '@/lib/peopleStore'
import { persistPeopleRegistry } from '@/lib/peopleRegistryPersistence'
import { notifyPeopleRegistryUiOnly } from '@/lib/peopleStore'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export type MuttafiqeenMigrationSummary = {
  scanned: number
  restoredToMuttafiqeen: number
  normalizedKarkun: number
  skippedSoftRemoved: number
  skippedAlreadyClassified: number
  persisted: boolean
}

const MIGRATION_REMARK = 'KC-0101 migration: restored from legacy Archive'

function nowIso(): string {
  return new Date().toISOString()
}

function shouldRestoreToMuttafiq(person: KarkunRegistryRecord): boolean {
  if (isSoftRemoved(person)) return false
  if (person.category === 'Muttafiq' && !person.isArchived) return false
  // Legacy standard archive (or archived without special kind)
  if (person.isArchived && !isSoftRemoved(person)) return true
  // Explicit Muttafiq still carrying archive flag
  if (person.category === 'Muttafiq' && person.isArchived) return true
  return false
}

/**
 * Apply in-memory classification migration. Idempotent.
 * When `persist` is true, writes the full people registry.
 */
export function migrateArchivedPeopleToMuttafiqeen(
  options: { persist?: boolean; changedBy?: string } = {},
): MuttafiqeenMigrationSummary {
  const changedBy = options.changedBy ?? 'System Migration'
  const at = nowIso()
  let restoredToMuttafiqeen = 0
  let normalizedKarkun = 0
  let skippedSoftRemoved = 0
  let skippedAlreadyClassified = 0

  for (const person of MOCK_KARKUN_REGISTRY) {
    if (isSoftRemoved(person)) {
      skippedSoftRemoved += 1
      continue
    }

    if (shouldRestoreToMuttafiq(person)) {
      const previous = getPersonCategory(person)
      person.category = 'Muttafiq'
      person.isArchived = false
      person.archivedAt = undefined
      person.archivedBy = undefined
      if (person.archiveKind === 'standard') {
        person.archiveKind = undefined
      }
      person.restoredAt = at
      person.restoredBy = changedBy
      person.classificationHistory = [
        ...(person.classificationHistory ?? []),
        buildClassificationHistoryEntry({
          previousCategory: previous === 'Muttafiq' ? 'Karkun' : previous,
          newCategory: 'Muttafiq',
          changedBy,
          remarks: MIGRATION_REMARK,
          at,
        }),
      ]
      person.updatedAt = at
      person.updatedBy = changedBy
      person.version = bumpVersion(person.version)
      restoredToMuttafiqeen += 1
      continue
    }

    if (!person.category) {
      person.category = 'Karkun'
      normalizedKarkun += 1
      continue
    }

    skippedAlreadyClassified += 1
  }

  const summary: MuttafiqeenMigrationSummary = {
    scanned: MOCK_KARKUN_REGISTRY.length,
    restoredToMuttafiqeen,
    normalizedKarkun,
    skippedSoftRemoved,
    skippedAlreadyClassified,
    persisted: false,
  }

  if (options.persist !== false && (restoredToMuttafiqeen > 0 || normalizedKarkun > 0)) {
    persistPeopleRegistry(getNextKarkunNum())
    summary.persisted = true
    notifyPeopleRegistryUiOnly()
  } else if (restoredToMuttafiqeen > 0 || normalizedKarkun > 0) {
    notifyPeopleRegistryUiOnly()
  }

  if (restoredToMuttafiqeen > 0 || normalizedKarkun > 0) {
    console.info('[KC-0101] Muttafiqeen migration', summary)
  }

  return summary
}
