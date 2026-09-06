/**
 * KC-007.6 — Connection integrity: ONE KARKUN = ONE ACTIVE RUKN
 */
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { ruknMaster } from '../src/data/ruknMaster'
import {
  assignKarkun,
  getAssignedKarkunanForRukn,
  getAvailableKarkunan,
} from '../src/lib/assignmentEngine'
import { getCompatibleKarkunsForRukn } from '../src/lib/peopleStore'
import { setJwtRoleClaimOverrideForTests } from '../src/lib/auth/ensureJwtRoleClaim'
import {
  appendAssignment,
  clearAssignmentStore,
  getActiveAssignmentsForKarkun,
  getAssignmentHistoryForKarkun,
} from '../src/stores/assignmentStore'
import type { AssignmentRecord } from '../src/types/assignment'
import type { KarkunRegistryRecord, PersonGender } from '../src/types/karkun-registry.types'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const now = new Date().toISOString()
const today = now.slice(0, 10)

function createKarkun(id: string, gender: PersonGender): KarkunRegistryRecord {
  return {
    id,
    name: `Integrity ${gender} Karkun`,
    gender,
    mobile: '0300123456',
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
  }
}

clearAssignmentStore()
MOCK_KARKUN_REGISTRY.length = 0
setJwtRoleClaimOverrideForTests({
  ok: true,
  role: 'administrator',
  ruknId: null,
  forceRefreshed: false,
  timeline: {
    t1GetIdTokenCalled: 0,
    t2GetIdTokenResolved: 0,
    forceRefreshed: false,
    role: 'administrator',
    ruknId: null,
    issuedAtTime: null,
    expirationTime: null,
  },
})

const maleRukns = ruknMaster.filter((r) => r.status === 'active' && r.gender === 'Male')
assert(maleRukns.length >= 2, 'need two active male rukns')
const ruknA = maleRukns[0]!.id
const ruknB = maleRukns[1]!.id

const karkun = createKarkun('K-INTEGRITY-1', 'Male')
MOCK_KARKUN_REGISTRY.push(karkun)

assert(
  getAvailableKarkunan().some((item) => item.id === karkun.id),
  'karkun must appear in Connect list before assign',
)

const first = await assignKarkun(karkun.id, ruknA, 'Administrator')
assert(first.success === true, `first assign failed: ${!first.success ? first.error : ''}`)

const second = await assignKarkun(karkun.id, ruknB, 'Administrator')
assert(second.success === true, `second assign failed: ${!second.success ? second.error : ''}`)

assert(
  getActiveAssignmentsForKarkun(karkun.id).length === 1,
  'must have exactly one active assignment',
)
assert(
  getActiveAssignmentsForKarkun(karkun.id)[0]?.ruknId === ruknB,
  'new connection replaces the previous active Rukn',
)
assert(
  getAssignmentHistoryForKarkun(karkun.id).some((row) => row.ruknId === ruknA && row.status !== 'Active'),
  'previous connection remains in history',
)

assert(
  !getAvailableKarkunan().some((item) => item.id === karkun.id),
  'connected karkun must leave Connect list',
)

assert(
  !getCompatibleKarkunsForRukn(ruknB).some((item) => item.id === karkun.id),
  'connected karkun must leave compatible Connect list',
)

const connected = getAssignedKarkunanForRukn(ruknB)
assert(
  connected.filter((item) => item.id === karkun.id).length === 1,
  'connected list must not duplicate',
)

const rogue: AssignmentRecord = {
  assignmentId: 'asgn-rogue-test',
  assignmentNumber: 'ASN-ROGUE',
  ruknId: ruknB,
  karkunId: karkun.id,
  assignedDate: today,
  effectiveFrom: today,
  status: 'Active',
  assignedBy: 'Administrator',
  createdAt: now,
  updatedAt: now,
}

let threw = false
try {
  await appendAssignment(rogue)
} catch {
  threw = true
}
assert(threw, 'appendAssignment must refuse second Active for same karkun')
assert(
  getActiveAssignmentsForKarkun(karkun.id).length === 1,
  'store guard must not create a second Active',
)

console.log('[PASS] KC-007.6 connection integrity ok')
console.log(` karkun ${karkun.id} → single active on ${ruknB}`)
