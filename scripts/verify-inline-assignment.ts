/**
 * Verifies changeKarkunRuknAssignment assign / replace / unassign flows.
 * Run: npx vite-node scripts/verify-inline-assignment.ts
 */
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { ruknMaster } from '@/data/ruknMaster'
import {
  changeKarkunRuknAssignment,
  getCurrentAssignmentForKarkun,
} from '@/lib/assignmentEngine'
import { getCompatibleRuknsForKarkun } from '@/lib/peopleStore'
import {
  clearAssignmentStore,
  getAssignmentHistoryForKarkun,
} from '@/stores/assignmentStore'
import { clearActivityLogStore, getRecentActivity } from '@/stores/activityLogStore'
import type { KarkunRegistryRecord, PersonGender } from '@/types/karkun-registry.types'

const now = new Date().toISOString()

function createKarkun(id: string, gender: PersonGender): KarkunRegistryRecord {
  return {
    id,
    name: `Test ${gender} Karkun`,
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

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function activeRukns(gender: PersonGender) {
  return ruknMaster.filter((rukn) => rukn.status === 'active' && rukn.gender === gender)
}

function reset(): void {
  clearAssignmentStore()
  clearActivityLogStore()
  MOCK_KARKUN_REGISTRY.length = 0
}

function verifyGenderFlow(gender: PersonGender): void {
  const karkun = createKarkun(`verify-${gender.toLowerCase()}`, gender)
  const rukns = activeRukns(gender)
  const ruknA = rukns[0]
  const ruknB = rukns[1]
  assert(Boolean(ruknA && ruknB), `Need at least two active ${gender} Rukns`)

  MOCK_KARKUN_REGISTRY.push(karkun)

  const compatible = getCompatibleRuknsForKarkun(karkun.id)
  assert(
    compatible.every((rukn) => rukn.gender === gender),
    `${gender} Karkun must only see ${gender} Rukns`,
  )

  const assignResult = changeKarkunRuknAssignment(karkun.id, ruknA!.id)
  assert(assignResult.success, `Assign failed: ${assignResult.success ? '' : assignResult.error}`)
  assert(karkun.assignmentStatus === 'Assigned', 'Assignment status should be Assigned')
  assert(karkun.assignedRuknId === ruknA!.id, 'Assigned Rukn id should match')

  const replaceResult = changeKarkunRuknAssignment(karkun.id, ruknB!.id)
  assert(
    replaceResult.success,
    `Replace failed: ${replaceResult.success ? '' : replaceResult.error}`,
  )
  assert(karkun.assignedRuknId === ruknB!.id, 'Replaced Rukn id should match')

  const history = getAssignmentHistoryForKarkun(karkun.id)
  assert(history.length >= 2, 'Assignment history should preserve prior records')
  assert(
    history.some((record) => record.status === 'Unassigned'),
    'History should contain ended assignment records',
  )

  const unassignResult = changeKarkunRuknAssignment(karkun.id, '')
  assert(
    unassignResult.success,
    `Unassign failed: ${unassignResult.success ? '' : unassignResult.error}`,
  )
  assert(karkun.assignmentStatus === 'Available', 'Assignment status should be Available')
  assert(!getCurrentAssignmentForKarkun(karkun.id), 'No active assignment should remain')

  const activity = getRecentActivity(10)
  assert(activity.some((entry) => entry.type === 'assign'), 'Activity log should record assign')
  assert(activity.some((entry) => entry.type === 'remove'), 'Activity log should record removal')
}

reset()
verifyGenderFlow('Male')
reset()
verifyGenderFlow('Female')

console.log('Inline assignment verification passed for Male and Female flows.')
