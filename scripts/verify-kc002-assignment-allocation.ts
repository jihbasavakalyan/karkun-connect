/**
 * KC-002 — Regression: repository identity + atomic ASN allocation + migration.
 * Run: npx vite-node scripts/verify-kc002-assignment-allocation.ts
 */

import {
  assertUniqueAssignmentNumbers,
  deriveNextSequenceFromRecords,
  findAssignmentNumberCollisions,
  formatAssignmentNumber,
  planAsnCollisionRepair,
} from '../src/lib/connections/assignmentNumber'
import {
  assertNoConnectionDuplicates,
  canonicalizeConnectionRecords,
} from '../src/lib/connections/canonicalizeConnectionRecords'
import { getCanonicalConnectedKarkunCount } from '../src/lib/connections/getConnectedKarkunsForRukn'
import { buildDuplicateAsnRepair } from '../src/lib/migration/repairDuplicateAssignmentNumbers'
import { getAssignmentDashboardMetrics, assignRukn } from '../src/services/assignmentService'
import { getRepositories, resetRepositoryProviderForTests } from '../src/repositories/provider'
import {
  appendAssignment,
  clearAssignmentStore,
  generateAssignmentNumber,
  getAllAssignments,
  reloadAssignmentStoreFromPersistence,
  replaceAllAssignments,
} from '../src/stores/assignmentStore'
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { ruknMaster } from '../src/data/ruknMaster'
import type { AssignmentRecord } from '../src/types/assignment'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const now = new Date().toISOString()
const today = now.slice(0, 10)

function makeAssignment(
  overrides: Partial<AssignmentRecord> &
    Pick<AssignmentRecord, 'assignmentId' | 'assignmentNumber' | 'ruknId' | 'karkunId'>,
): AssignmentRecord {
  return {
    status: 'Active',
    assignedDate: today,
    effectiveFrom: today,
    assignedBy: 'Administrator',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

resetRepositoryProviderForTests()
clearAssignmentStore()
MOCK_KARKUN_REGISTRY.length = 0

const rukn = ruknMaster.find((item) => item.status === 'active')
assert(Boolean(rukn), 'need an active rukn')
const ruknId = rukn!.id

for (let i = 0; i < 5; i += 1) {
  MOCK_KARKUN_REGISTRY.push({
    id: `K-KC002-${i}`,
    name: `KC002 Karkun ${i}`,
    gender: rukn!.gender,
    mobile: `030011122${i}`,
    place: 'Karachi',
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
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: '',
    isArchived: false,
  })
}

// --- PHASE 1: identity does not discard ASN collisions ---
const colliding: AssignmentRecord[] = [
  makeAssignment({
    assignmentId: 'asgn-a',
    assignmentNumber: 'ASN-000010',
    ruknId,
    karkunId: 'K-KC002-0',
    createdAt: '2026-07-18T11:00:00.000Z',
  }),
  makeAssignment({
    assignmentId: 'asgn-b',
    assignmentNumber: 'ASN-000010',
    ruknId,
    karkunId: 'K-KC002-1',
    createdAt: '2026-07-18T12:00:00.000Z',
  }),
]
const { records: kept, duplicates } = canonicalizeConnectionRecords(colliding)
assert(duplicates.length === 0, 'ASN collision must not produce identity duplicates')
assert(kept.length === 2, `expected 2 records kept, got ${kept.length}`)
assert(findAssignmentNumberCollisions(kept).length === 1, 'collision detector should see ASN-000010')

// --- PHASE 3: migration repair ---
const planned = planAsnCollisionRepair(kept, 1)
assert(planned.report.reassigned === 1, 'exactly one ASN should be reassigned')
assert(planned.records[0]!.assignmentNumber !== planned.records[1]!.assignmentNumber, 'ASNs unique after repair')
assertUniqueAssignmentNumbers(planned.records)
assert(planned.report.nextSequence === deriveNextSequenceFromRecords(planned.records), 'nextSequence matches max+1')

const build = buildDuplicateAsnRepair(colliding, 1)
assert(build.needsWrite, 'repair should need write')
assert(build.report.collisionGroups === 1, 'one collision group')

// --- PHASE 2: concurrent local allocation ---
clearAssignmentStore()
const allocated = await Promise.all([
  generateAssignmentNumber(),
  generateAssignmentNumber(),
  generateAssignmentNumber(),
  generateAssignmentNumber(),
])
const uniqueAllocated = new Set(allocated)
assert(uniqueAllocated.size === 4, `concurrent allocate collided: ${allocated.join(',')}`)
assert(allocated.includes(formatAssignmentNumber(1)), 'should include ASN-000001')

// --- Create via assignRukn (async atomic path) ---
clearAssignmentStore()
for (const karkun of MOCK_KARKUN_REGISTRY) {
  karkun.assignmentStatus = 'Available'
  karkun.assignedRuknId = ''
  karkun.assignedRukn = ''
  karkun.campaignStatus = 'not_assigned'
}
// Concurrent allocation under create: three parallel assigns with distinct karkuns.
const created = await Promise.all(
  ['K-KC002-0', 'K-KC002-1', 'K-KC002-2'].map((karkunId) =>
    assignRukn({
      ruknId,
      karkunId,
      effectiveFrom: today,
      assignedBy: 'Administrator',
    }),
  ),
)
const failures = created.filter((item) => !item.success).map((item) => item.error)
assert(created.every((item) => item.success), `all assigns should succeed: ${failures.join('; ')}`)
const numbers = created.map((item) => item.assignment!.assignmentNumber)
assert(new Set(numbers).size === 3, `assignRukn ASN collision: ${numbers.join(',')}`)

// --- Refresh / hydration ---
const beforeReload = getAllAssignments().length
reloadAssignmentStoreFromPersistence()
assert(getAllAssignments().length === beforeReload, 'reload must preserve connections')
assertNoConnectionDuplicates(getAllAssignments())
assertUniqueAssignmentNumbers(getAllAssignments())

// --- Dashboard counts ---
const metrics = getAssignmentDashboardMetrics()
assert(
  metrics.activeAssignments === getCanonicalConnectedKarkunCount(),
  'dashboard active must equal canonical connected count',
)
assert(metrics.activeAssignments === 3, `expected 3 active, got ${metrics.activeAssignments}`)

// --- Repository allocate + setNextSequence ---
const repos = getRepositories()
const a1 = await repos.connection.allocateNextAssignmentNumber()
const a2 = await repos.connection.allocateNextAssignmentNumber()
assert(a1.ok && a2.ok, 'repository allocate must succeed')
assert(a1.data.assignmentNumber !== a2.data.assignmentNumber, 'repo allocate must be unique')
if (repos.connection.setNextSequence) {
  const setResult = await repos.connection.setNextSequence(a2.data.nextSequence + 5)
  assert(setResult.ok, 'setNextSequence must succeed')
  const a3 = await repos.connection.allocateNextAssignmentNumber()
  assert(a3.ok, 'allocate after setNextSequence')
  const seq = Number.parseInt(a3.data.assignmentNumber.replace(/\D/g, ''), 10)
  assert(seq >= a2.data.nextSequence + 5, 'sequence must be monotonic after setNextSequence')
}

// --- PHASE 4: append rejects duplicate ASN ---
let rejected = false
try {
  appendAssignment(
    makeAssignment({
      assignmentId: 'dup-asn-x',
      assignmentNumber: numbers[0]!,
      ruknId,
      karkunId: 'K-KC002-3',
    }),
  )
} catch {
  rejected = true
}
assert(rejected, 'append must reject duplicate ASN')

// --- Migration replaceAll with unique set ---
replaceAllAssignments(planned.records, planned.report.nextSequence)
assertUniqueAssignmentNumbers(getAllAssignments())
assert(getAllAssignments().length === 2, 'replaceAll keeps both identity-distinct rows')

console.log('PASS  canonicalize keeps distinct assignmentIds with shared ASN')
console.log('PASS  ASN collision repair reassigns losers')
console.log('PASS  concurrent allocateNextAssignmentNumber unique')
console.log('PASS  concurrent assignRukn unique ASNs')
console.log('PASS  reload preserves repository connections')
console.log('PASS  dashboard counts match canonical')
console.log('PASS  runtime append rejects duplicate ASN')
console.log('')
console.log('KC-002 verify: PASS')
