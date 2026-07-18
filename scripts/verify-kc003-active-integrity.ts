/**
 * KC-003 — Active connection integrity + dashboard reconciliation.
 * Run: npx vite-node scripts/verify-kc003-active-integrity.ts
 */

import {
  assertAtMostOneActivePerKarkun,
  planActiveConnectionIntegrity,
} from '../src/lib/connections/activeConnectionIntegrity'
import {
  DASHBOARD_CONNECTED_RULE,
  explainCanonicalExclusions,
} from '../src/lib/connections/explainCanonicalExclusions'
import {
  getCanonicalConnectedKarkunCount,
  getConnectedAssignmentsForRukn,
} from '../src/lib/connections/getConnectedKarkunsForRukn'
import { getAssignmentDashboardMetrics } from '../src/services/assignmentService'
import {
  appendAssignment,
  clearAssignmentStore,
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

clearAssignmentStore()
MOCK_KARKUN_REGISTRY.length = 0

const rukn = ruknMaster.find((item) => item.status === 'active' && item.gender === 'Male')
assert(Boolean(rukn), 'need active male rukn')
const ruknId = rukn!.id

MOCK_KARKUN_REGISTRY.push({
  id: 'kr-141',
  name: 'Md Kaleemuddin Mamu',
  gender: 'Male',
  mobile: '9343406606',
  place: 'Basavakalyan',
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
MOCK_KARKUN_REGISTRY.push({
  id: 'kr-999',
  name: 'Other Karkun',
  gender: 'Male',
  mobile: '9343406607',
  place: 'Basavakalyan',
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

// ISSUE 1 — same karkunId, two Active (Kaleem production pattern)
const kaleemDupes: AssignmentRecord[] = [
  makeAssignment({
    assignmentId: 'asgn-1784375106366-9zli2',
    assignmentNumber: 'ASN-000017',
    ruknId,
    karkunId: 'kr-141',
    createdAt: '2026-07-18T11:45:06.366Z',
    updatedAt: '2026-07-18T11:45:06.366Z',
  }),
  makeAssignment({
    assignmentId: 'asgn-1784375138496-2ndut',
    assignmentNumber: 'ASN-000036',
    ruknId,
    karkunId: 'kr-141',
    createdAt: '2026-07-18T11:45:38.496Z',
    updatedAt: '2026-07-18T11:45:38.496Z',
  }),
  makeAssignment({
    assignmentId: 'asgn-other-1',
    assignmentNumber: 'ASN-000040',
    ruknId,
    karkunId: 'kr-999',
    createdAt: '2026-07-18T12:00:00.000Z',
  }),
]

assert(
  kaleemDupes[0]!.karkunId === kaleemDupes[1]!.karkunId,
  'root cause A: same karkunId (not display-name collision)',
)

const planned = planActiveConnectionIntegrity(kaleemDupes)
assert(planned.needsWrite, 'integrity must detect Kaleem duplicate Active')
assert(planned.report.superseded === 1, 'exactly one Active should be superseded')
assert(
  planned.records.find((r) => r.assignmentId === 'asgn-1784375138496-2ndut')?.status === 'Active',
  'newest Kaleem assignment remains Active',
)
assert(
  planned.records.find((r) => r.assignmentId === 'asgn-1784375106366-9zli2')?.status === 'Replaced',
  'older Kaleem assignment becomes Replaced (historical preserved)',
)
assertAtMostOneActivePerKarkun(planned.records)

// Persist via replaceAll — store must enforce integrity
replaceAllAssignments(kaleemDupes, 41)
assertAtMostOneActivePerKarkun(getAllAssignments())
assert(
  getAllAssignments().filter((r) => r.karkunId === 'kr-141' && r.status === 'Active').length === 1,
  'store keeps one Active Kaleem',
)
assert(
  getAllAssignments().some((r) => r.assignmentId === 'asgn-1784375106366-9zli2' && r.status === 'Replaced'),
  'historical Kaleem row preserved as Replaced',
)
assert(getConnectedAssignmentsForRukn(ruknId).length === 2, 'rukn connected unique karkuns = 2')

// ISSUE 2 — dashboard reconciliation: 3 rows, 1 superseded → canonical 2
const explained = explainCanonicalExclusions(getAllAssignments())
assert(explained.rule === DASHBOARD_CONNECTED_RULE, 'dashboard rule documented')
assert(explained.included.length === 2, `expected 2 included, got ${explained.included.length}`)
assert(
  explained.exclusions.some((e) => e.reason === 'status_not_active'),
  'Replaced row excluded as status_not_active',
)
assert(
  getAssignmentDashboardMetrics().activeAssignments === getCanonicalConnectedKarkunCount(),
  'dashboard matches canonical',
)
assert(getCanonicalConnectedKarkunCount() === 2, 'dashboard unique active karkuns = 2')

// Append guard still blocks second Active for same karkun
let rejected = false
try {
  appendAssignment(
    makeAssignment({
      assignmentId: 'asgn-should-fail',
      assignmentNumber: 'ASN-000099',
      ruknId,
      karkunId: 'kr-141',
    }),
  )
} catch {
  rejected = true
}
assert(rejected, 'append must reject second Active for same karkun')

reloadAssignmentStoreFromPersistence()
assertAtMostOneActivePerKarkun(getAllAssignments())

console.log('PASS  Kaleem duplicate is same karkunId (accidental double Active)')
console.log('PASS  older Active superseded to Replaced; history preserved')
console.log('PASS  dashboard counts unique Active Karkuns with full exclusion reasons')
console.log('PASS  append rejects duplicate Active')
console.log('')
console.log('KC-003 verify: PASS')
