/**
 * KC-037C2F — Prefer Open Weekly Ijtema events that already have attendance marks
 * when duplicate Open meetings exist for the same date+audience.
 */
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { ruknMaster } from '../src/data/ruknMaster'
import { getAssignedKarkunanForRukn } from '../src/lib/assignmentEngine'
import { uniqueWeeklyIjtemaMeetingsForDisplay } from '../src/lib/weeklyIjtemaPresentation'
import {
  createWeeklyIjtemaEvent,
  getOpenWeeklyIjtemaEvent,
  getWeeklyIjtemaReport,
  upsertWeeklyIjtemaKarkunMark,
} from '../src/services/weeklyIjtemaService'
import { clearAssignmentStore, replaceAllAssignments } from '../src/stores/assignmentStore'
import { clearIjtemaAttendanceStore } from '../src/stores/ijtemaAttendanceStore'
import { clearWeeklyIjtemaStore, upsertWeeklyIjtemaEvent } from '../src/stores/weeklyIjtemaStore'
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

function testPreferOpenEventWithMarks(): void {
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
    title: 'Men with marks',
    createdBy: 'Admin',
    audienceGender: 'Male',
  })
  assert(first.success, 'first open')
  if (!first.success) return

  const karkunId = 'K-037C2F-1'
  MOCK_KARKUN_REGISTRY.push({
    id: karkunId,
    name: 'C2F Fixture',
    gender: 'Male',
    mobile: '030037C2F1',
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
  replaceAllAssignments(
    [
      {
        assignmentId: 'A-037C2F-1',
        assignmentNumber: 'ASN-037C2F-1',
        ruknId: rukn!.id,
        karkunId,
        assignedDate: now.slice(0, 10),
        effectiveFrom: now.slice(0, 10),
        status: 'Active',
        assignedBy: 'Administrator',
        createdAt: now,
        updatedAt: now,
      } satisfies AssignmentRecord,
    ],
    2,
  )
  assert(Boolean(getAssignedKarkunanForRukn(rukn!.id).find((k) => k.id === karkunId)), 'assigned')

  assert(
    upsertWeeklyIjtemaKarkunMark({
      eventId: first.event.id,
      ruknId: rukn!.id,
      ruknName: rukn!.name,
      karkunId,
      karkunName: 'C2F Fixture',
      status: 'Present',
      reminded: true,
      submittedBy: rukn!.id,
    }).success,
    'mark present on first',
  )

  // Simulate accidental newer empty Open duplicate (production shape).
  const emptyDuplicate: WeeklyIjtemaEvent = {
    ...first.event,
    id: 'wij_c2f_empty_newer',
    createdAt: new Date(Date.now() + 60_000).toISOString(),
    updatedAt: new Date(Date.now() + 60_000).toISOString(),
    title: "Men's Weekly Ijtema (empty newer)",
  }
  upsertWeeklyIjtemaEvent(emptyDuplicate)

  const display = uniqueWeeklyIjtemaMeetingsForDisplay([first.event, emptyDuplicate])
  assert(display.length === 1, 'one card')
  assert(display[0].id === first.event.id, `display prefers marks got ${display[0].id}`)

  const openWrite = getOpenWeeklyIjtemaEvent('Male')
  assert(openWrite?.id === first.event.id, `write binds marks event got ${openWrite?.id}`)

  const report = getWeeklyIjtemaReport(display[0].id)
  assert(report?.present === 1, `report present=1 got ${report?.present}`)
  assert((report?.attendancePct ?? 0) > 0, 'report attendance % > 0')
}

const cases = [run('Prefer Open event with marks over newer empty Open', testPreferOpenEventWithMarks)]
const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-037C2F',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
process.exit(failed.length === 0 ? 0 : 1)
