/**
 * KC-0129 — Gender-aware per-Rukn Available Capacity.
 *
 * availableCapacity must equal getAvailableKarkunan(ruknId) (same-gender pool),
 * not the unscoped campaign selectable pool.
 */
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { ruknMaster } from '../src/data/ruknMaster'
import {
  getAvailableKarkunan,
  getRuknAssignmentEngineStats,
} from '../src/lib/assignmentEngine'
import { getPeopleStatistics } from '../src/lib/peopleStore'
import { getCampaignConnectionMetrics } from '../src/services/metricsService'
import { appendAssignment, clearAssignmentStore } from '../src/stores/assignmentStore'
import { clearActivityLogStore } from '../src/stores/activityLogStore'
import type { AssignmentRecord } from '../src/types/assignment'
import type { KarkunRegistryRecord, PersonGender } from '../src/types/karkun-registry.types'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const now = new Date().toISOString()
const today = now.slice(0, 10)

function createKarkun(id: string, gender: PersonGender, mobile: string): KarkunRegistryRecord {
  return {
    id,
    name: `KC0129 ${gender} ${id}`,
    gender,
    mobile,
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
    category: 'Karkun',
  }
}

clearAssignmentStore()
clearActivityLogStore()
MOCK_KARKUN_REGISTRY.length = 0

const maleRukn = ruknMaster.find((r) => r.status === 'active' && !r.isArchived && r.gender === 'Male')
const femaleRukn = ruknMaster.find(
  (r) => r.status === 'active' && !r.isArchived && r.gender === 'Female',
)

assert(Boolean(maleRukn), 'need an active Male Rukn')
assert(Boolean(femaleRukn), 'need an active Female Rukn')

const maleId = maleRukn!.id
const femaleId = femaleRukn!.id

// 3 Male + 2 Female available connectable Karkuns
MOCK_KARKUN_REGISTRY.push(
  createKarkun('K-0129-M1', 'Male', '8123310101'),
  createKarkun('K-0129-M2', 'Male', '8123310102'),
  createKarkun('K-0129-M3', 'Male', '8123310103'),
  createKarkun('K-0129-F1', 'Female', '8123310201'),
  createKarkun('K-0129-F2', 'Female', '8123310202'),
)

const unscopedPool = getAvailableKarkunan().length
const malePool = getAvailableKarkunan(maleId).length
const femalePool = getAvailableKarkunan(femaleId).length

assert(unscopedPool === 5, `expected unscoped pool 5, got ${unscopedPool}`)
assert(malePool === 3, `expected male pool 3, got ${malePool}`)
assert(femalePool === 2, `expected female pool 2, got ${femalePool}`)

const maleStats = getRuknAssignmentEngineStats(maleId)
const femaleStats = getRuknAssignmentEngineStats(femaleId)

assert(
  maleStats.availableCapacity === malePool,
  `Male capacity ${maleStats.availableCapacity} !== male pool ${malePool}`,
)
assert(
  femaleStats.availableCapacity === femalePool,
  `Female capacity ${femaleStats.availableCapacity} !== female pool ${femalePool}`,
)
assert(
  maleStats.availableCapacity !== unscopedPool,
  'Male capacity must not equal unscoped campaign pool',
)
assert(
  femaleStats.availableCapacity !== unscopedPool,
  'Female capacity must not equal unscoped campaign pool',
)
assert(
  maleStats.availableCapacity !== femaleStats.availableCapacity,
  'Male and Female capacity must differ with asymmetric pools',
)
assert(
  malePool + femalePool === unscopedPool,
  `gender pools ${malePool}+${femalePool} must sum to unscoped ${unscopedPool}`,
)

const remainingBefore = getCampaignConnectionMetrics().remaining
const peopleUnassigned = getPeopleStatistics().unassignedKarkuns
assert(
  remainingBefore === peopleUnassigned,
  `campaign remaining ${remainingBefore} must equal people unassigned ${peopleUnassigned}`,
)

// Simulate a same-gender connection (store + registry) — no auth required
const connected = MOCK_KARKUN_REGISTRY.find((k) => k.id === 'K-0129-M1')!
connected.assignmentStatus = 'Assigned'
connected.assignedRuknId = maleId
connected.assignedRukn = maleRukn!.name
connected.campaignStatus = 'assigned'

const active: AssignmentRecord = {
  assignmentId: 'asgn-0129-m1',
  assignmentNumber: 'ASN-0129-M1',
  ruknId: maleId,
  karkunId: 'K-0129-M1',
  assignedDate: today,
  effectiveFrom: today,
  status: 'Active',
  assignedBy: 'Administrator',
  createdAt: now,
  updatedAt: now,
}
appendAssignment(active)

const maleAfter = getRuknAssignmentEngineStats(maleId)
const femaleAfter = getRuknAssignmentEngineStats(femaleId)
assert(
  maleAfter.availableCapacity === 2,
  `Male capacity after connect expected 2, got ${maleAfter.availableCapacity}`,
)
assert(
  femaleAfter.availableCapacity === 2,
  `Female capacity must stay 2 after Male connect, got ${femaleAfter.availableCapacity}`,
)
assert(
  maleAfter.assignedCount === 1,
  `Male assignedCount expected 1, got ${maleAfter.assignedCount}`,
)

const remainingAfter = getCampaignConnectionMetrics().remaining
assert(
  remainingAfter === remainingBefore - 1,
  `campaign remaining should drop by 1 (${remainingBefore} → ${remainingAfter})`,
)

console.log('KC-0129 gender-aware capacity OK', {
  maleId,
  femaleId,
  maleCapacity: maleStats.availableCapacity,
  femaleCapacity: femaleStats.availableCapacity,
  maleCapacityAfterConnect: maleAfter.availableCapacity,
  femaleCapacityAfterConnect: femaleAfter.availableCapacity,
  unscopedPool,
  campaignRemainingBefore: remainingBefore,
  campaignRemainingAfter: remainingAfter,
})
