/**
 * KC-003.1 — Active Connected presentation excludes historical statuses.
 * Run: npx vite-node scripts/verify-kc003-1-active-list.ts
 */

import { partitionConnectionPresentation } from '../src/lib/connections/partitionConnectionPresentation'
import { getConnectedAssignmentsForRukn } from '../src/lib/connections/getConnectedKarkunsForRukn'
import { getRuknAssignmentSummary } from '../src/services/assignmentService'
import {
  clearAssignmentStore,
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
    Pick<AssignmentRecord, 'assignmentId' | 'assignmentNumber' | 'ruknId' | 'karkunId' | 'status'>,
): AssignmentRecord {
  return {
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

for (const [id, name, mobile] of [
  ['kr-bilal', 'Bilal Miyan', '9343406601'],
  ['kr-141', 'Md Kaleemuddin Mamu', '9343406606'],
] as const) {
  MOCK_KARKUN_REGISTRY.push({
    id,
    name,
    gender: 'Male',
    mobile,
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
}

const history: AssignmentRecord[] = [
  makeAssignment({
    assignmentId: 'asgn-bilal',
    assignmentNumber: 'ASN-000050',
    ruknId,
    karkunId: 'kr-bilal',
    status: 'Active',
    createdAt: '2026-07-18T12:00:00.000Z',
  }),
  makeAssignment({
    assignmentId: 'asgn-kaleem-active',
    assignmentNumber: 'ASN-000036',
    ruknId,
    karkunId: 'kr-141',
    status: 'Active',
    createdAt: '2026-07-18T11:45:38.496Z',
  }),
  makeAssignment({
    assignmentId: 'asgn-kaleem-replaced',
    assignmentNumber: 'ASN-000017',
    ruknId,
    karkunId: 'kr-141',
    status: 'Replaced',
    createdAt: '2026-07-18T11:45:06.366Z',
    endedDate: today,
    removalReason: 'Duplicate',
  }),
]

replaceAllAssignments(history, 51)

const summary = getRuknAssignmentSummary(ruknId)
assert(summary.activeAssignments.length === 2, 'Connected list must have Bilal + Kaleem Active only')
assert(
  summary.activeAssignments.every((record) => record.status === 'Active'),
  'Connected list must be Active-only',
)
assert(
  !summary.activeAssignments.some((record) => record.assignmentId === 'asgn-kaleem-replaced'),
  'Replaced Kaleem must not appear in activeAssignments',
)
assert(
  getConnectedAssignmentsForRukn(ruknId).map((r) => r.karkunId).sort().join() ===
    'kr-141,kr-bilal',
  'unique Active karkuns: Bilal once, Kaleem once',
)

const { current, historical } = partitionConnectionPresentation(summary.assignmentHistory, {
  activeAssignments: summary.activeAssignments,
  currentAssignment: summary.currentAssignment,
})

assert(current.length === 2, `current connections expected 2, got ${current.length}`)
assert(
  current.every((record) => record.status === 'Active'),
  'timeline current section Active-only',
)
assert(
  historical.length === 1 && historical[0]!.assignmentId === 'asgn-kaleem-replaced',
  'Replaced Kaleem only in History',
)
assert(
  !historical.some((record) => record.status === 'Active'),
  'History must never contain Active rows',
)
assert(
  summary.assignmentHistory.some((record) => record.assignmentId === 'asgn-kaleem-replaced'),
  'historical record preserved in assignmentHistory',
)

console.log('PASS  Connected list Active-only (Bilal once, Kaleem once)')
console.log('PASS  Replaced visible only in History partition')
console.log('PASS  no Active rows in History')
console.log('')
console.log('KC-003.1 verify: PASS')
