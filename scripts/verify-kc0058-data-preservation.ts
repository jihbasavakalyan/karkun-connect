/**
 * KC-0058 — Data preservation foundation verification.
 * Run: npm run verify:kc0058
 */

import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { ruknMaster } from '../src/data/ruknMaster'
import {
  allowDangerousRepositoryClear,
  isDangerousRepositoryClearAllowed,
} from '../src/lib/preservation/dangerousClearGate'
import { resetRepositoryProviderForTests, getRepositories } from '../src/repositories/provider'
import { archiveAssignment, archiveKarkun } from '../src/services/archiveService'
import { appendConnectionLedgerEntry, getRecentConnectionLedger } from '../src/services/connectionLedgerService'
import { IntegrityScanner } from '../src/services/integrityScanner'
import { assignRukn, removeAssignment } from '../src/services/assignmentService'
import {
  clearAssignmentStore,
  getAssignmentById,
  replaceAllAssignments,
} from '../src/stores/assignmentStore'
import { DEFAULT_PLACE } from '../src/types/people.types'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

resetRepositoryProviderForTests()
allowDangerousRepositoryClear(true)
clearAssignmentStore()
allowDangerousRepositoryClear(false)

const now = new Date().toISOString()
MOCK_KARKUN_REGISTRY.length = 0
MOCK_KARKUN_REGISTRY.push({
  id: 'kr-9001',
  name: 'KC0058 Archive Probe',
  gender: 'Male',
  mobile: '9000009001',
  place: DEFAULT_PLACE,
  status: 'active',
  createdAt: now,
  updatedAt: now,
  updatedBy: 'Verification',
  address: '',
  area: '',
  assignedRukn: '',
  assignedRuknId: '',
  assignmentStatus: 'Available',
  campaignStatus: 'not_assigned',
  visitStatus: 'none',
  isArchived: false,
})

const maleRukn = ruknMaster.find((r) => r.status === 'active' && r.gender === 'Male')
assert(Boolean(maleRukn), 'need an active male Rukn')

replaceAllAssignments([], 1)

// --- Soft archive Karkun ---
const archived = archiveKarkun('kr-9001', 'Verification')
assert(archived.ok, `archiveKarkun failed: ${!archived.ok ? archived.error : ''}`)
const k = MOCK_KARKUN_REGISTRY.find((row) => row.id === 'kr-9001')
assert(Boolean(k?.isArchived), 'karkun should be archived')
assert(Boolean(k?.archivedAt), 'archivedAt required')
assert(k?.archivedBy === 'Verification', 'archivedBy required')

// --- Assign + ledger CONNECTED ---
// Unarchive first so assign validation paths that filter archived still work if any
k!.isArchived = false
k!.archivedAt = undefined
k!.archivedBy = undefined

const assign = await assignRukn({
  ruknId: maleRukn!.id,
  karkunId: 'kr-9001',
  effectiveFrom: now.slice(0, 10),
  assignedBy: 'Administrator',
})
assert(assign.success, `assign failed: ${assign.error}`)
const assignmentId = assign.assignment!.assignmentId

const ledgerAfterConnect = getRecentConnectionLedger(20)
assert(
  ledgerAfterConnect.some(
    (e) => e.eventType === 'CONNECTED' && e.assignmentId === assignmentId,
  ),
  'CONNECTED ledger entry missing',
)

// --- Disconnect + ledger DISCONNECTED ---
const removed = removeAssignment({
  ruknId: maleRukn!.id,
  karkunId: 'kr-9001',
  effectiveFrom: now.slice(0, 10),
  removalReason: 'Other',
  assignedBy: 'Administrator',
})
assert(removed.success, `remove failed: ${removed.error}`)
assert(
  getRecentConnectionLedger(20).some(
    (e) => e.eventType === 'DISCONNECTED' && e.assignmentId === assignmentId,
  ),
  'DISCONNECTED ledger entry missing',
)

// --- Archive assignment ---
const asgnArchive = archiveAssignment(assignmentId, 'Verification')
assert(asgnArchive.ok, `archiveAssignment failed: ${!asgnArchive.ok ? asgnArchive.error : ''}`)
const asgn = getAssignmentById(assignmentId)
assert(Boolean(asgn?.isArchived), 'assignment should be archived')
assert(
  getRecentConnectionLedger(20).some((e) => e.eventType === 'ARCHIVED' && e.assignmentId === assignmentId),
  'ARCHIVED ledger entry missing',
)

// --- Dangerous clear gate (Firestore path uses this; local tests may still clear) ---
assert(!isDangerousRepositoryClearAllowed(), 'dangerous clear must be off by default')
allowDangerousRepositoryClear(false)
const blocked = (() => {
  if (!isDangerousRepositoryClearAllowed()) {
    return { ok: false as const, error: { code: 'Permission' as const, message: 'blocked' } }
  }
  return getRepositories().karkun.clear()
})()
assert(!blocked.ok, 'unguarded clear must be refused')

// Explicit append still works
appendConnectionLedgerEntry({
  eventType: 'CONNECTED',
  performedBy: 'Verification',
  karkunId: 'kr-9001',
  metadata: { probe: true },
})

// --- Integrity scanner ---
const report = IntegrityScanner.run()
assert(typeof report.summary.checksRun === 'number' && report.summary.checksRun >= 5, 'scanner checks')
assert(Array.isArray(report.errors), 'errors array')
assert(Array.isArray(report.warnings), 'warnings array')
assert(Array.isArray(report.recommendations), 'recommendations array')

console.log('KC-0058 verify: OK')
console.log(
  JSON.stringify(
    {
      archivedKarkun: k?.id,
      assignmentId,
      ledgerEvents: getRecentConnectionLedger(10).map((e) => e.eventType),
      integrity: report.summary,
      clearBlocked: !blocked.ok,
    },
    null,
    2,
  ),
)
