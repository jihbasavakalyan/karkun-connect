/**
 * KC-028A / KC-002 — Canonical data integrity verification.
 * Run: npx vite-node scripts/verify-canonical-data-integrity.ts
 */

import {
  assertNoConnectionDuplicates,
  canonicalizeConnectionRecords,
} from '../src/lib/connections/canonicalizeConnectionRecords'
import { assertUniqueAssignmentNumbers, planAsnCollisionRepair } from '../src/lib/connections/assignmentNumber'
import {
  getCanonicalConnectedKarkunCount,
  getConnectedAssignmentsForRukn,
  getConnectedKarkunCountForRukn,
  getConnectedKarkunsForRukn,
} from '../src/lib/connections/getConnectedKarkunsForRukn'
import { getPeopleStatistics } from '../src/lib/peopleStore'
import { getAssignedKarkunanForRukn } from '../src/lib/assignmentEngine'
import {
  getAssignmentDashboardMetrics,
  getRuknAssignmentSummary,
} from '../src/services/assignmentService'
import { buildRuknExecutionSummary } from '../src/lib/executionStatus'
import {
  appendAssignment,
  clearAssignmentStore,
  getAllAssignments,
  getAssignmentHistoryForRukn,
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

clearAssignmentStore()
MOCK_KARKUN_REGISTRY.length = 0

const rukn = ruknMaster.find((item) => item.status === 'active')
assert(Boolean(rukn), 'need an active rukn')
const ruknId = rukn!.id

const karkun = {
  id: 'K-CANON-1',
  name: 'Canonical Test Karkun',
  gender: rukn!.gender,
  mobile: '03001112233',
  place: 'Karachi',
  status: 'active' as const,
  createdAt: now,
  updatedAt: now,
  updatedBy: 'Verification',
  address: '',
  area: '',
  assignedRukn: '',
  assignedRuknId: '',
  assignmentStatus: 'Available' as const,
  campaignStatus: 'not_assigned' as const,
  visitStatus: 'none' as const,
  lastVisit: null,
  commitment: null,
  currentCommitment: '',
  jihAppRegistrationStatus: 'Not Discussed' as const,
  notes: '',
  isArchived: false,
}
MOCK_KARKUN_REGISTRY.push(karkun)
MOCK_KARKUN_REGISTRY.push({
  ...karkun,
  id: 'K-CANON-2',
  name: 'Canonical Test Karkun 2',
  mobile: '03001112234',
})

// Duplicate assignmentId collapses; duplicate ASN does not discard identity.
const rawDuplicates: AssignmentRecord[] = [
  makeAssignment({
    assignmentId: 'asn-dup-a',
    assignmentNumber: 'ASN-000017',
    ruknId,
    karkunId: karkun!.id,
    status: 'Active',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }),
  makeAssignment({
    assignmentId: 'asn-dup-b',
    assignmentNumber: 'ASN-000017',
    ruknId,
    karkunId: 'K-CANON-2',
    status: 'Active',
    updatedAt: '2026-06-01T00:00:00.000Z',
  }),
  makeAssignment({
    assignmentId: 'asn-dup-a',
    assignmentNumber: 'ASN-000017',
    ruknId,
    karkunId: karkun!.id,
    status: 'Completed',
    updatedAt: '2026-03-01T00:00:00.000Z',
  }),
]

const { records, duplicates } = canonicalizeConnectionRecords(rawDuplicates)
assert(duplicates.some((item) => item.kind === 'assignmentId'), 'expected assignmentId duplicate report')
assert(records.length === 2, `expected 2 identity rows, got ${records.length}`)
assert(
  records.some((item) => item.assignmentId === 'asn-dup-a' && item.status === 'Active'),
  'should keep preferred Active for asn-dup-a',
)
assert(
  records.some((item) => item.assignmentId === 'asn-dup-b'),
  'must preserve distinct assignmentId with colliding ASN',
)

const repaired = planAsnCollisionRepair(records)
assert(repaired.report.reassigned === 1, 'repair should reassign one colliding ASN')
assertUniqueAssignmentNumbers(repaired.records)

clearAssignmentStore()
appendAssignment(
  makeAssignment({
    assignmentId: 'asn-unique-1',
    assignmentNumber: 'ASN-000101',
    ruknId,
    karkunId: karkun!.id,
  }),
)

let rejected = false
try {
  appendAssignment(
    makeAssignment({
      assignmentId: 'asn-unique-2',
      assignmentNumber: 'ASN-000101',
      ruknId,
      karkunId: 'K-CANON-2',
    }),
  )
} catch {
  rejected = true
}
assert(rejected, 'append with duplicate ASN must throw')

assertNoConnectionDuplicates(getAllAssignments())
assertUniqueAssignmentNumbers(getAllAssignments())

const summary = getRuknAssignmentSummary(ruknId)
const connectedPage = getAssignedKarkunanForRukn(ruknId)
const connectedCanonical = getConnectedKarkunsForRukn(ruknId)
const history = getAssignmentHistoryForRukn(ruknId)
const asnCounts = new Map<string, number>()
for (const record of history) {
  const key = record.assignmentNumber.trim().toUpperCase()
  asnCounts.set(key, (asnCounts.get(key) ?? 0) + 1)
}
for (const [asn, count] of asnCounts) {
  assert(count === 1, `history renders ASN ${asn} ${count} times`)
}

assert(
  summary.assignedKarkunCount === connectedPage.length,
  `profile count ${summary.assignedKarkunCount} != connected page ${connectedPage.length}`,
)
assert(
  summary.assignedKarkunCount === getConnectedKarkunCountForRukn(ruknId),
  'profile count must match canonical helper',
)
assert(
  connectedPage.map((item) => item.id).join() === connectedCanonical.map((item) => item.id).join(),
  'Connected page must use same canonical set',
)

const executionA = buildRuknExecutionSummary(ruknId)
const executionB = buildRuknExecutionSummary(ruknId)
assert(
  JSON.stringify(executionA.counts) === JSON.stringify(executionB.counts),
  'execution KPIs must be stable across refresh with no data change',
)

const metricsA = getAssignmentDashboardMetrics()
const metricsB = getAssignmentDashboardMetrics()
assert(
  metricsA.activeAssignments === metricsB.activeAssignments,
  'dashboard connection KPI must be stable',
)

const people = getPeopleStatistics()
assert(
  people.assignedKarkuns === metricsA.activeAssignments,
  `people.assignedKarkuns (${people.assignedKarkuns}) != metrics.activeAssignments (${metricsA.activeAssignments})`,
)
assert(
  people.assignedKarkuns === getCanonicalConnectedKarkunCount(),
  'people stats must equal canonical connected count',
)

const connectedIds = new Set(getConnectedAssignmentsForRukn(ruknId).map((r) => r.assignmentId))
assert(connectedIds.size === summary.activeAssignments.length, 'active assignment id set mismatch')

console.log('PASS  canonicalize keeps identity; ASN collisions repaired separately')
console.log('PASS  append rejects duplicate ASN')
console.log('PASS  profile/connected/canonical counts match', {
  profile: summary.assignedKarkunCount,
  connected: connectedPage.length,
  asn: summary.currentAssignment?.assignmentNumber,
})
console.log('PASS  KPI refresh stability', executionA.counts, {
  activeAssignments: metricsA.activeAssignments,
})
console.log('')
console.log('KC-028A/KC-002 verify: PASS')
