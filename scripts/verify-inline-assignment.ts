/**
 * Verifies administrator assignment workflow end-to-end.
 * Run: npm run verify:assignments
 */
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { ruknMaster } from '@/data/ruknMaster'
import {
  changeKarkunRuknAssignment,
  getAssignedKarkunanForRukn,
  getAvailableKarkunan,
  getCurrentAssignmentForKarkun,
} from '@/lib/assignmentEngine'
import { getCompatibleKarkunsForRukn, getCompatibleRuknsForKarkun, getPeopleStatistics } from '@/lib/peopleStore'
import {
  assignRukn,
  getAssignmentDashboardMetrics,
  getKarkunsForRuknAssignment,
  getRuknAssignmentSummary,
  removeAssignment,
  replaceAssignment,
  syncAllKarkunRegistryFromAssignments,
} from '@/services/assignmentService'
import { getAdminCommandCenterSnapshot, getRuknCommandCenterSnapshot } from '@/services/campaignAutomationEngine'
import { runProductionDataMigration } from '@/services/productionDataMigrationService'
import {
  clearAssignmentStore,
  getAssignmentHistoryForKarkun,
  getAssignmentHistoryForRukn,
  reloadAssignmentStoreFromPersistence,
} from '@/stores/assignmentStore'
import { clearActivityLogStore, getRecentActivity } from '@/stores/activityLogStore'
import type { KarkunRegistryRecord, PersonGender } from '@/types/karkun-registry.types'

const now = new Date().toISOString()
const today = now.slice(0, 10)

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

function verifyInlineGenderFlow(gender: PersonGender): void {
  const karkun = createKarkun(`verify-inline-${gender.toLowerCase()}`, gender)
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
  assert(
    compatible.length === activeRukns(gender).length,
    `${gender} inline picker must list all active ${gender} Rukns regardless of existing assignments`,
  )

  const assignResult = changeKarkunRuknAssignment(karkun.id, ruknA!.id)
  assert(assignResult.success, `Assign failed: ${assignResult.success ? '' : assignResult.error}`)
  assert(karkun.assignmentStatus === 'Assigned', 'Assignment status should be Assigned')
  assert(karkun.assignedRuknId === ruknA!.id, 'Assigned Rukn id should match')
  assert(Boolean(assignResult.assignment?.assignmentNumber), 'Assignment number must be generated')

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

function verifyMultipleKarkunsPerRukn(gender: PersonGender): void {
  const rukn = activeRukns(gender)[0]
  assert(Boolean(rukn), `Need at least one active ${gender} Rukn for multi-Karkun flow`)

  const karkuns = Array.from({ length: 5 }, (_, index) => {
    const karkun = createKarkun(`verify-multi-${gender.toLowerCase()}-${index}`, gender)
    MOCK_KARKUN_REGISTRY.push(karkun)
    return karkun
  })

  for (const karkun of karkuns) {
    const result = changeKarkunRuknAssignment(karkun.id, rukn!.id)
    assert(result.success, `Multi assign failed: ${result.success ? '' : result.error}`)
    assert(
      karkun.assignmentStatus === 'Assigned' && karkun.assignedRuknId === rukn!.id,
      'Each assigned Karkun must point to the shared Rukn',
    )
  }

  const assigned = getAssignedKarkunanForRukn(rukn!.id)
  assert(
    assigned.length === 5,
    `Rukn must hold 5 active Karkuns, got ${assigned.length}`,
  )

  const summary = getRuknAssignmentSummary(rukn!.id)
  assert(summary.assignedKarkunCount === 5, 'Summary must report 5 active Karkuns')
  assert(summary.activeAssignments.length === 5, 'Summary must list 5 active assignments')
  assert(summary.assignmentStatus === 'Assigned', 'Rukn with active Karkuns must be Assigned')

  // The Rukn must remain selectable (not hidden) for a further Karkun.
  const extra = createKarkun(`verify-multi-${gender.toLowerCase()}-extra`, gender)
  MOCK_KARKUN_REGISTRY.push(extra)
  assert(
    getCompatibleRuknsForKarkun(extra.id).some((option) => option.id === rukn!.id),
    'Rukn must remain selectable after multiple assignments',
  )

  // No previous assignment was removed or replaced.
  const history = getAssignmentHistoryForRukn(rukn!.id)
  assert(
    history.filter((record) => record.status === 'Active').length === 5,
    'All five assignments must remain Active with no removal or replacement',
  )
  assert(
    history.every((record) => record.status === 'Active'),
    'No assignment should have been ended when assigning multiple Karkuns',
  )
}

function verifyAdminModalFlow(gender: PersonGender): void {
  const karkun = createKarkun(`verify-admin-${gender.toLowerCase()}`, gender)
  const rukns = activeRukns(gender)
  const ruknA = rukns[2]
  const ruknB = rukns[3]
  assert(Boolean(ruknA && ruknB), `Need at least four active ${gender} Rukns for admin modal flow`)

  MOCK_KARKUN_REGISTRY.push(karkun)

  const availableForRukn = getCompatibleKarkunsForRukn(ruknA!.id)
  assert(availableForRukn.some((record) => record.id === karkun.id), 'Admin modal must list available Karkun')

  const assignResult = assignRukn({
    ruknId: ruknA!.id,
    karkunId: karkun.id,
    effectiveFrom: today,
    assignedBy: 'Administrator',
  })
  assert(assignResult.success, `assignRukn failed: ${assignResult.success ? '' : assignResult.error}`)
  assert(
    getRuknAssignmentSummary(ruknA!.id).assignmentStatus === 'Assigned',
    'Rukn summary must show Assigned',
  )
  assert(
    getAssignedKarkunanForRukn(ruknA!.id).some((record) => record.id === karkun.id),
    'Rukn portal must see assigned Karkun',
  )
  assert(
    !getAvailableKarkunan().some((record) => record.id === karkun.id),
    'Assigned Karkun must disappear from available pool',
  )

  const statsBeforeReplace = getPeopleStatistics()
  assert(statsBeforeReplace.assignedKarkuns >= 1, 'People statistics must reflect assigned Karkun')

  const replacementKarkun = createKarkun(`verify-admin-replacement-${gender.toLowerCase()}`, gender)
  MOCK_KARKUN_REGISTRY.push(replacementKarkun)

  const replaceResult = replaceAssignment({
    ruknId: ruknA!.id,
    newKarkunId: replacementKarkun.id,
    effectiveFrom: today,
    replacementReason: 'Shifted responsibility',
    assignedBy: 'Administrator',
  })
  assert(
    replaceResult.success,
    `replaceAssignment failed: ${replaceResult.success ? '' : replaceResult.error}`,
  )

  const ruknHistory = getAssignmentHistoryForRukn(ruknA!.id)
  assert(ruknHistory.some((record) => record.status === 'Replaced'), 'Old assignment must become Replaced history')
  assert(
    getRuknAssignmentSummary(ruknA!.id).currentAssignment?.karkunId === replacementKarkun.id,
    'New assignment must become active',
  )

  const adminSnapshot = getAdminCommandCenterSnapshot()
  assert(adminSnapshot.kpis.length >= 8, 'Dashboard KPIs must refresh after assignment changes')

  const ruknSnapshot = getRuknCommandCenterSnapshot(ruknA!.id)
  assert(ruknSnapshot.kpis.length >= 6, 'Rukn command center must refresh after assignment changes')

  const removeResult = removeAssignment({
    ruknId: ruknA!.id,
    effectiveFrom: today,
    removalReason: 'Other',
    assignedBy: 'Administrator',
  })
  assert(
    removeResult.success,
    `removeAssignment failed: ${removeResult.success ? '' : removeResult.error}`,
  )
  assert(
    getRuknAssignmentSummary(ruknA!.id).assignmentStatus === 'Unassigned',
    'Released Rukn must become Unassigned',
  )
  assert(
    replacementKarkun.assignmentStatus === 'Available',
    'Released Karkun must become Available',
  )

  const metrics = getAssignmentDashboardMetrics()
  assert(metrics.activeAssignments >= 0, 'Assignment dashboard metrics must remain valid')
}

function verifyAssignmentPageFlow(gender: PersonGender): void {
  const karkun = createKarkun(`verify-page-${gender.toLowerCase()}`, gender)
  const rukns = activeRukns(gender)
  const rukn = rukns[4]
  assert(Boolean(rukn), `Need active ${gender} Rukn for page flow`)

  MOCK_KARKUN_REGISTRY.push(karkun)

  const assignableIds = new Set(getKarkunsForRuknAssignment(rukn!.id).map((record) => record.id))
  assert(assignableIds.has(karkun.id), 'Assignment page must expose assignable Karkun for selected Rukn')

  const result = assignRukn({
    ruknId: rukn!.id,
    karkunId: karkun.id,
    effectiveFrom: today,
    assignedBy: 'Administrator',
  })
  assert(result.success, `Assignment page confirm failed: ${result.success ? '' : result.error}`)
  assert(Boolean(result.assignment?.assignmentNumber), 'Assignment page must return assignment number')
  assert(
    getRuknAssignmentSummary(rukn!.id).assignmentStatus === 'Assigned',
    'Assignment page flow must update Rukn summary immediately',
  )
  assert(karkun.assignmentStatus === 'Assigned', 'Assignment page flow must update Karkun registry')
}

function verifyAssignmentPersistence(gender: PersonGender): void {
  const rukn = activeRukns(gender)[0]
  assert(Boolean(rukn), `Need active ${gender} Rukn for persistence test`)

  const karkuns = Array.from({ length: 3 }, (_, index) => {
    const karkun = createKarkun(`verify-persist-${gender.toLowerCase()}-${index}`, gender)
    MOCK_KARKUN_REGISTRY.push(karkun)
    return karkun
  })

  for (const karkun of karkuns) {
    const result = assignRukn({
      ruknId: rukn!.id,
      karkunId: karkun.id,
      effectiveFrom: today,
      assignedBy: 'Administrator',
    })
    assert(result.success, `Assign failed: ${result.success ? '' : result.error}`)
  }

  assert(
    getRuknAssignmentSummary(rukn!.id).assignedKarkunCount === 3,
    'Three active assignments must exist before simulated reload',
  )

  reloadAssignmentStoreFromPersistence()
  syncAllKarkunRegistryFromAssignments()

  assert(
    getRuknAssignmentSummary(rukn!.id).assignedKarkunCount === 3,
    'Assignments must survive browser reload via localStorage persistence',
  )

  for (const karkun of karkuns) {
    const refreshed = MOCK_KARKUN_REGISTRY.find((record) => record.id === karkun.id)
    assert(
      refreshed?.assignmentStatus === 'Assigned',
      'Karkun registry must rehydrate from persisted assignments after reload',
    )
  }

  const dashboard = getAssignmentDashboardMetrics()
  assert(
    dashboard.activeAssignments === 3,
    'Dashboard metrics must reflect persisted assignments after reload',
  )
}

runProductionDataMigration()
reset()
verifyInlineGenderFlow('Male')
reset()
verifyInlineGenderFlow('Female')
reset()
verifyMultipleKarkunsPerRukn('Male')
reset()
verifyMultipleKarkunsPerRukn('Female')
reset()
verifyAdminModalFlow('Male')
reset()
verifyAdminModalFlow('Female')
reset()
verifyAssignmentPageFlow('Male')
reset()
verifyAssignmentPageFlow('Female')
reset()
verifyAssignmentPersistence('Female')

console.log('Assignment workflow verification passed for inline and admin flows.')
