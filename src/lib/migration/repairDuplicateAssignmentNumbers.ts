/**
 * KC-002 — One-time repair of duplicate assignmentNumber values.
 * Keeps every assignmentId; reassigns new ASNs to collision losers.
 */

import {
  ASN_REPAIR_VERSION,
  assertUniqueAssignmentNumbers,
  planAsnCollisionRepair,
  type AsnRepairReport,
} from '@/lib/connections/assignmentNumber'
import { canonicalizeConnectionRecords } from '@/lib/connections/canonicalizeConnectionRecords'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'
import type { AssignmentRecord } from '@/types/assignment'

export type DuplicateAsnMigrationSummary = {
  applied: boolean
  alreadyRepaired: boolean
  report: AsnRepairReport
  asnRepairVersion: number
}

export function buildDuplicateAsnRepair(
  records: readonly AssignmentRecord[],
  minimumNextSequence = 1,
): { records: AssignmentRecord[]; report: AsnRepairReport; needsWrite: boolean } {
  const { records: identityCanonical } = canonicalizeConnectionRecords([...records])
  const { records: repaired, report } = planAsnCollisionRepair(
    identityCanonical,
    minimumNextSequence,
  )
  return {
    records: repaired,
    report,
    needsWrite: report.reassigned > 0,
  }
}

/**
 * Repair duplicates in the live connection repository and advance nextSequence.
 * Idempotent when no collisions remain.
 */
export async function repairDuplicateAssignmentNumbers(options?: {
  force?: boolean
  currentRepairVersion?: number | null
}): Promise<DuplicateAsnMigrationSummary> {
  const repos = getRepositories()
  const loaded = unwrapRepository(repos.connection.loadState(), {
    assignments: [],
    nextSequence: 1,
  })

  const currentVersion = options?.currentRepairVersion ?? null
  const alreadyRepaired =
    !options?.force &&
    currentVersion !== null &&
    currentVersion >= ASN_REPAIR_VERSION &&
    buildDuplicateAsnRepair(loaded.assignments, loaded.nextSequence).report.reassigned === 0

  const planned = buildDuplicateAsnRepair(loaded.assignments, loaded.nextSequence)

  if (!planned.needsWrite && alreadyRepaired) {
    return {
      applied: false,
      alreadyRepaired: true,
      report: planned.report,
      asnRepairVersion: ASN_REPAIR_VERSION,
    }
  }

  if (!planned.needsWrite) {
    if (repos.connection.setNextSequence) {
      await repos.connection.setNextSequence(planned.report.nextSequence, {
        asnRepairVersion: ASN_REPAIR_VERSION,
      })
    }
    return {
      applied: false,
      alreadyRepaired: true,
      report: planned.report,
      asnRepairVersion: ASN_REPAIR_VERSION,
    }
  }

  assertUniqueAssignmentNumbers(planned.records)

  unwrapRepository(
    repos.connection.saveState({
      assignments: planned.records,
      nextSequence: planned.report.nextSequence,
    }),
    undefined,
  )

  if (repos.connection.setNextSequence) {
    await repos.connection.setNextSequence(planned.report.nextSequence, {
      asnRepairVersion: ASN_REPAIR_VERSION,
    })
  }

  return {
    applied: true,
    alreadyRepaired: false,
    report: planned.report,
    asnRepairVersion: ASN_REPAIR_VERSION,
  }
}
