/**
 * KC-002 — One-time duplicate ASN repair (admin).
 * Run against the active repository provider (local or Firestore).
 *
 *   npx vite-node --env-file=.env.local scripts/admin/repair-duplicate-asns.ts
 *   npx vite-node --env-file=.env.local scripts/admin/repair-duplicate-asns.ts --dry-run
 */

import { findAssignmentNumberCollisions } from '../../src/lib/connections/assignmentNumber'
import {
  buildDuplicateAsnRepair,
  repairDuplicateAssignmentNumbers,
} from '../../src/lib/migration/repairDuplicateAssignmentNumbers'
import { getRepositories, getRepositoryProviderMode } from '../../src/repositories/provider'
import { unwrapRepository } from '../../src/repositories/errors'

const dryRun = process.argv.includes('--dry-run')

async function main(): Promise<void> {
  const mode = getRepositoryProviderMode()
  console.log(`[KC-002] provider=${mode} dryRun=${dryRun}`)

  const loaded = unwrapRepository(getRepositories().connection.loadState(), {
    assignments: [],
    nextSequence: 1,
  })
  const collisions = findAssignmentNumberCollisions(loaded.assignments)
  console.log(`[KC-002] connections=${loaded.assignments.length} collisionGroups=${collisions.length}`)

  const planned = buildDuplicateAsnRepair(loaded.assignments, loaded.nextSequence)
  console.log(JSON.stringify(planned.report, null, 2))

  if (dryRun) {
    console.log('[KC-002] dry-run complete — no writes')
    return
  }

  if (!planned.needsWrite) {
    console.log('[KC-002] no ASN collisions to repair')
    return
  }

  const summary = await repairDuplicateAssignmentNumbers({ force: true })
  console.log('[KC-002] repair applied', {
    applied: summary.applied,
    reassigned: summary.report.reassigned,
    nextSequence: summary.report.nextSequence,
    asnRepairVersion: summary.asnRepairVersion,
  })
}

await main()
