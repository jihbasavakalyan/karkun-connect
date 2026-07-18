/**
 * KC-028A — Canonical connected-Karkun set.
 *
 * Source of truth: assignmentStore ↔ ConnectionRepository (Firestore `connections`).
 * Definition: Active assignment, unique by karkunId, Karkun exists and is not archived.
 *
 * All UI surfaces (Dashboard, Profile, Connected page, Automation, Digital Rafeeq)
 * must derive connection counts from these helpers — never from raw Active rows alone.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getActiveAssignmentsForRukn, getAllAssignments } from '@/stores/assignmentStore'
import type { AssignmentRecord } from '@/types/assignment'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

function isCanonicalActiveConnection(record: AssignmentRecord): boolean {
  if (record.status !== 'Active') return false
  const karkun = getKarkunById(record.karkunId)
  return Boolean(karkun && !karkun.isArchived)
}

/** Campaign-wide Active connections (unique Karkun, non-archived). */
export function getCanonicalConnectedAssignments(): AssignmentRecord[] {
  const seen = new Set<string>()
  const result: AssignmentRecord[] = []
  for (const record of getAllAssignments()) {
    if (!isCanonicalActiveConnection(record)) continue
    if (seen.has(record.karkunId)) continue
    seen.add(record.karkunId)
    result.push(record)
  }
  return result
}

export function getCanonicalConnectedKarkunCount(): number {
  return getCanonicalConnectedAssignments().length
}

/** Active connection rows for a Rukn (deduped, non-archived Karkuns only). */
export function getConnectedAssignmentsForRukn(ruknId: string): AssignmentRecord[] {
  if (!ruknId.trim()) return []

  const seen = new Set<string>()
  const result: AssignmentRecord[] = []

  for (const record of getActiveAssignmentsForRukn(ruknId)) {
    if (!isCanonicalActiveConnection(record)) continue
    if (seen.has(record.karkunId)) continue
    seen.add(record.karkunId)
    result.push(record)
  }

  return result
}

/** Connected Karkun registry records for a Rukn. */
export function getConnectedKarkunsForRukn(ruknId: string): KarkunRegistryRecord[] {
  return getConnectedAssignmentsForRukn(ruknId)
    .map((record) => getKarkunById(record.karkunId))
    .filter((karkun): karkun is KarkunRegistryRecord => Boolean(karkun))
}

/** Unique connected Karkun IDs for a Rukn. */
export function getConnectedKarkunIdsForRukn(ruknId: string): string[] {
  return getConnectedAssignmentsForRukn(ruknId).map((record) => record.karkunId)
}

export function getConnectedKarkunCountForRukn(ruknId: string): number {
  return getConnectedAssignmentsForRukn(ruknId).length
}
