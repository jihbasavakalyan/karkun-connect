/**
 * KC-037C2G — Duplicate Open Weekly Ijtema events for the same meeting key
 * must not inflate Admin Connected / KPI (unique per meetingDate+audience).
 */
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { ruknMaster } from '../src/data/ruknMaster'
import {
  createWeeklyIjtemaEvent,
  getCurrentWeeklyIjtemaEvent,
  getWeeklyIjtemaDashboardKpi,
  listOpenWeeklyIjtemaEvents,
  upsertWeeklyIjtemaKarkunMark,
} from '../src/services/weeklyIjtemaService'
import { uniqueWeeklyIjtemaMeetingsForDisplay } from '../src/lib/weeklyIjtemaPresentation'
import { clearAssignmentStore, replaceAllAssignments } from '../src/stores/assignmentStore'
import { clearIjtemaAttendanceStore } from '../src/stores/ijtemaAttendanceStore'
import {
  clearWeeklyIjtemaStore,
  upsertWeeklyIjtemaEvent,
} from '../src/stores/weeklyIjtemaStore'
import type { AssignmentRecord } from '../src/types/assignment'
import type { KarkunRegistryRecord } from '../src/types/karkun-registry.types'
import type { WeeklyIjtemaEvent } from '../src/types/weeklyIjtema'

type CaseResult = { name: string; passed: boolean; detail: string }

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function run(name: string, fn: () => void): CaseResult {
  try {
    fn()
    return { name, passed: true, detail: 'ok' }
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

function testDuplicateOpenDoesNotInflateKpi(): void {
  clearWeeklyIjtemaStore()
  clearIjtemaAttendanceStore()
  clearAssignmentStore()
  MOCK_KARKUN_REGISTRY.length = 0

  const rukn = ruknMaster.find((r) => r.status === 'active' && r.gender === 'Male')
  assert(Boolean(rukn), 'male rukn')
  const meetingDate = new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()

  const first = createWeeklyIjtemaEvent({
    meetingDate,
    title: 'Men canonical',
    createdBy: 'Admin',
    audienceGender: 'Male',
  })
  assert(first.success, 'first open')
  if (!first.success) return

  const karkunId = 'K-037C2G-1'
  MOCK_KARKUN_REGISTRY.push({
    id: karkunId,
    name: 'C2G Fixture',
    gender: 'Male',
    mobile: '030037C2G1',
    place: 'Karachi',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    updatedBy: 'Verification',
    address: '',
    area: '',
    assignedRukn: rukn!.name,
    assignedRuknId: rukn!.id,
    assignmentStatus: 'Assigned',
    campaignStatus: 'not_assigned',
    visitStatus: 'none',
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: '',
    isArchived: false,
  } satisfies KarkunRegistryRecord)

  const assignment: AssignmentRecord = {
    assignmentId: 'asn-c2g-1',
    assignmentNumber: 'ASN-C2G-1',
    karkunId,
    ruknId: rukn!.id,
    status: 'Active',
    assignedAt: now,
    assignedBy: 'Verification',
    updatedAt: now,
    updatedBy: 'Verification',
  }
  replaceAllAssignments([assignment])

  const mark = upsertWeeklyIjtemaKarkunMark({
    eventId: first.event.id,
    ruknId: rukn!.id,
    ruknName: rukn!.name,
    karkunId,
    karkunName: 'C2G Fixture',
    status: 'Present',
    reminded: true,
    submittedBy: rukn!.id,
  })
  assert(mark.success, 'mark present on canonical')

  // Inject a newer empty Open duplicate (simulate auto-window race).
  const emptyDup: WeeklyIjtemaEvent = {
    ...first.event,
    id: 'wij_c2g_empty_dup',
    title: 'Men empty duplicate',
    createdAt: new Date(Date.now() + 60_000).toISOString(),
    updatedAt: new Date(Date.now() + 60_000).toISOString(),
    status: 'Open',
  }
  upsertWeeklyIjtemaEvent(emptyDup)

  const openListed = listOpenWeeklyIjtemaEvents({ audienceGender: 'Male' })
  assert(openListed.length === 1, `expected 1 unique Open, got ${openListed.length}`)
  assert(openListed[0]!.id === first.event.id, 'canonical is mark-rich event')

  const display = uniqueWeeklyIjtemaMeetingsForDisplay([first.event, emptyDup])
  assert(display.length === 1, 'display unique')
  assert(display[0]!.id === first.event.id, 'display prefers marks')

  const current = getCurrentWeeklyIjtemaEvent({
    audienceGender: 'Male',
    meetingDate,
  })
  assert(current?.id === first.event.id, 'current binds canonical')

  const kpi = getWeeklyIjtemaDashboardKpi({ audienceGender: 'Male' })
  assert(kpi.eventId === first.event.id, 'KPI event is canonical')
  assert(kpi.present === 1, `present=1 got ${kpi.present}`)
  assert(kpi.totalAssigned === 1, `connected not doubled: got ${kpi.totalAssigned}`)

  // Archived duplicate must be ignored if present.
  upsertWeeklyIjtemaEvent({
    ...emptyDup,
    id: 'wij_c2g_archived_dup',
    status: 'archived',
    mergedInto: first.event.id,
    archivedReason: 'duplicate_open_event',
  })
  const afterArchive = listOpenWeeklyIjtemaEvents({ audienceGender: 'Male' })
  assert(afterArchive.length === 1, 'archived ignored')
  assert(afterArchive[0]!.id === first.event.id, 'still canonical')
}

const results = [
  run('duplicate Open does not inflate KPI / binds canonical', testDuplicateOpenDoesNotInflateKpi),
]

const failed = results.filter((r) => !r.passed)
for (const result of results) {
  console.log(`${result.passed ? 'PASS' : 'FAIL'} — ${result.name}: ${result.detail}`)
}
if (failed.length > 0) {
  process.exit(1)
}
console.log(`KC-037C2G verify: ${results.length} passed`)
