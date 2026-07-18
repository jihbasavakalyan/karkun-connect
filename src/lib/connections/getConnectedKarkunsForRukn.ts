/**
 * KC-028A / KC-003 — Canonical connected-Karkun set.
 *
 * Source of truth: assignmentStore ↔ ConnectionRepository (Firestore `connections`).
 * Definition: Active assignment, unique by karkunId, Karkun exists and is not archived.
 * When multiple Active rows exist for one Karkun, the newest is counted (integrity repair
 * should supersede the rest — see activeConnectionIntegrity).
 *
 * Dashboard Connections KPI uses this unique-Karkun count — not raw assignment document count.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { preferNewestActive } from '@/lib/connections/activeConnectionIntegrity'
import { getActiveAssignmentsForRukn, getAllAssignments } from '@/stores/assignmentStore'
import type { AssignmentRecord } from '@/types/assignment'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

function isCanonicalActiveConnection(record: AssignmentRecord): boolean {
  if (record.status !== 'Active') return false
  const karkun = getKarkunById(record.karkunId)
  return Boolean(karkun && !karkun.isArchived)
}

function collectUniqueActiveByKarkun(records: readonly AssignmentRecord[]): AssignmentRecord[] {
  const byKarkun = new Map<string, AssignmentRecord>()
  for (const record of records) {
    if (!isCanonicalActiveConnection(record)) continue
    const existing = byKarkun.get(record.karkunId)
    if (!existing) {
      byKarkun.set(record.karkunId, record)
      continue
    }
    byKarkun.set(record.karkunId, preferNewestActive(existing, record))
  }
  return [...byKarkun.values()]
}

/** Campaign-wide Active connections (unique Karkun, non-archived). */
export function getCanonicalConnectedAssignments(): AssignmentRecord[] {
  return collectUniqueActiveByKarkun(getAllAssignments())
}

export function getCanonicalConnectedKarkunCount(): number {
  return getCanonicalConnectedAssignments().length
}

/** Active connection rows for a Rukn (deduped, non-archived Karkuns only). */
export function getConnectedAssignmentsForRukn(ruknId: string): AssignmentRecord[] {
  if (!ruknId.trim()) return []
  return collectUniqueActiveByKarkun(getActiveAssignmentsForRukn(ruknId))
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
