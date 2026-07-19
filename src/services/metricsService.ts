/**
 * KC-0058.1 — Shared campaign metrics layer.
 *
 * Dashboard cards and IntegrityScanner must derive Connections / Progress
 * from this module so counts cannot drift across independent calculators.
 */

import { ruknMaster } from '@/data/ruknMaster'
import {
  getCanonicalConnectedAssignments,
  getCanonicalConnectedKarkunCount,
} from '@/lib/connections/getConnectedKarkunsForRukn'
import { getPeopleStatistics } from '@/lib/peopleStore'
import { getAllAssignments } from '@/stores/assignmentStore'

export type CampaignConnectionMetrics = {
  /** Raw Firestore/store connection documents (all statuses). */
  connectionDocumentCount: number
  /** Rows with status === Active (before unique-Karkun collapse). */
  activeConnectionRowCount: number
  /** Soft-archived connection rows (isArchived). */
  archivedConnectionCount: number
  /**
   * Dashboard "Connected" KPI — unique Active connections to non-archived Karkuns
   * (KC-028A canonical definition).
   */
  connected: number
  /** Available (unconnected) Karkuns in the campaign pool. */
  remaining: number
  /** connected + remaining (campaign pool denominator). */
  total: number
  /** Round((connected / total) * 100), or 0 when total is 0. */
  progressPct: number
  assignedRukns: number
  unassignedRukns: number
  sourceOfTruth: 'MetricsService'
}

/**
 * Single authoritative campaign connection / progress snapshot.
 */
export function getCampaignConnectionMetrics(): CampaignConnectionMetrics {
  const all = getAllAssignments()
  const activeRows = all.filter((row) => row.status === 'Active' && !row.isArchived)
  const archivedConnectionCount = all.filter((row) => Boolean(row.isArchived)).length
  const connectedAssignments = getCanonicalConnectedAssignments()
  const connected = getCanonicalConnectedKarkunCount()
  const people = getPeopleStatistics()
  const remaining = Math.max(people.unassignedKarkuns, 0)
  const total = connected + remaining
  const assignedRuknIds = new Set(connectedAssignments.map((row) => row.ruknId))
  const activeRukns = ruknMaster.filter((rukn) => rukn.status === 'active' && !rukn.isArchived)

  return {
    connectionDocumentCount: all.length,
    activeConnectionRowCount: activeRows.length,
    archivedConnectionCount,
    connected,
    remaining,
    total,
    progressPct: total > 0 ? Math.round((connected / total) * 100) : 0,
    assignedRukns: assignedRuknIds.size,
    unassignedRukns: activeRukns.filter((rukn) => !assignedRuknIds.has(rukn.id)).length,
    sourceOfTruth: 'MetricsService',
  }
}

/** Convenience alias for callers that prefer a service object. */
export const MetricsService = {
  getCampaignConnectionMetrics,
}
