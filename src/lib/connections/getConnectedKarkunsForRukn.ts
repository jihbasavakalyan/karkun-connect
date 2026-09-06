/**
 * KC-028A / KC-003 — Canonical connected-Karkun set.
 *
 * Source of truth: assignmentStore ↔ ConnectionRepository (Firestore `connections`).
 * Definition: Active assignment, unique by karkunId, Karkun exists and is campaign-eligible
 * (category=Karkun; Muttafiqeen excluded).
 * When multiple Active rows exist for one Karkun, only a uniquely newest current
 * is counted. Equal timestamps are omitted from counts (do not guess).
 *
 * Dashboard Connections KPI uses this unique-Karkun count — not raw assignment document count.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { pickUniqueNewestActive } from '@/lib/connections/oneActiveRukn'
import { isCampaignEligible } from '@/lib/peopleClassification'
import { getAllAssignments } from '@/stores/assignmentStore'
import type { AssignmentRecord } from '@/types/assignment'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

function isCanonicalActiveConnection(record: AssignmentRecord): boolean {
  if (record.status !== 'Active') return false
  const karkun = getKarkunById(record.karkunId)
  return Boolean(karkun && isCampaignEligible(karkun))
}

/**
 * One person = one counted Active Rukn. Ambiguous duplicate Actives are
 * omitted from counts (reported separately; never guessed).
 */
function collectAuthoritativeActiveByKarkun(
  records: readonly AssignmentRecord[],
): AssignmentRecord[] {
  const byKarkun = new Map<string, AssignmentRecord[]>()
  for (const record of records) {
    if (!isCanonicalActiveConnection(record)) continue
    const list = byKarkun.get(record.karkunId) ?? []
    list.push(record)
    byKarkun.set(record.karkunId, list)
  }
  const authoritative: AssignmentRecord[] = []
  for (const group of byKarkun.values()) {
    const pick = pickUniqueNewestActive(group)
    if (pick.status === 'one') {
      authoritative.push(pick.current)
    }
  }
  return authoritative
}

/** Campaign-wide Active connections (unique Karkun, non-archived). */
export function getCanonicalConnectedAssignments(): AssignmentRecord[] {
  return collectAuthoritativeActiveByKarkun(getAllAssignments())
}

export function getCanonicalConnectedKarkunCount(): number {
  return getCanonicalConnectedAssignments().length
}

/** Active connection rows for a Rukn (authoritative current only). */
export function getConnectedAssignmentsForRukn(ruknId: string): AssignmentRecord[] {
  if (!ruknId.trim()) return []
  return getCanonicalConnectedAssignments().filter((record) => record.ruknId === ruknId)
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
