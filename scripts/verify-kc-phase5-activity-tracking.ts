/**
 * Phase 5 — Activity tracking integration (TASK-038–041).
 * Run: npm run verify:kc-phase5-activity-tracking
 *
 * Local/non-production only. Does not deploy or write production data.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { ruknMaster } from '../src/data/ruknMaster'
import { getAssignedKarkunanForRukn } from '../src/lib/assignmentEngine'
import { hasOrientationSignal } from '../src/lib/guidance/journeyEngine'
import {
  generateOccurrencesForProgramme,
} from '../src/lib/occurrence/generateOccurrences'
import {
  findMonthlyBaitulMaalCycleForOccurrence,
  findWeeklyIjtemaEventForOccurrence,
  resolveOccurrenceActivitySourceRef,
} from '../src/lib/occurrence/activitySourceLink'
import {
  programmeAttendanceMode,
  programmeRequiresEventAttendance,
  resolveOrientationAttendance,
} from '../src/lib/orientation/orientationAttendance'
import { markWeeklyIjtemaCommitment } from '../src/lib/operations/weeklyIjtemaWriteAdapter'
import {
  getRepositories,
  resetRepositoryProviderForTests,
} from '../src/repositories/provider'
import { clearLocalProgrammesForTests } from '../src/repositories/local/localProgrammeLocalRepositories'
import { clearLocalOccurrencesForTests } from '../src/repositories/local/occurrenceLocalRepositories'
import { clearAssignmentStore, replaceAllAssignments } from '../src/stores/assignmentStore'
import { clearIjtemaAttendanceStore } from '../src/stores/ijtemaAttendanceStore'
import { clearMonthlyBaitulMaalStore } from '../src/stores/monthlyBaitulMaalStore'
import {
  clearWeeklyIjtemaStore,
  getWeeklyIjtemaSubmission,
} from '../src/stores/weeklyIjtemaStore'
import { ACTIVE_CAMPAIGN_ID } from '../src/types/assignment.types'
import type { AssignmentRecord } from '../src/types/assignment'
import type { KarkunRegistryRecord } from '../src/types/karkun-registry.types'
import type { LocalProgramme } from '../src/types/localProgramme.types'
import {
  resolveWeeklyIjtemaRuknAttendanceState,
} from '../src/types/weeklyIjtema'
import {
  createWeeklyIjtemaEvent,
  getWeeklyIjtemaReport,
  upsertWeeklyIjtemaKarkunMark,
  upsertWeeklyIjtemaRuknAttendance,
} from '../src/services/weeklyIjtemaService'
import { createMonthlyBaitulMaalCycle } from '../src/services/monthlyBaitulMaalService'

const root = resolve(process.cwd())
const now = new Date().toISOString()

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `expected ${label}: ${needle}`)
}

function assertNotIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(!haystack.includes(needle), `did not expect ${label}: ${needle}`)
}

console.log('▶ TASK-037 decision recorded in Phase 5 gate')
{
  const gate = read('docs/architecture/kc-phase5-activity-tracking-arch009-gate.md')
  assertIncludes(gate, 'Invited → Present / Absent', 'Rukn state')
  assertIncludes(gate, 'Committed ≠ Present', 'Committed distinct')
  assertIncludes(gate, 'Fourth Weekly Ijtema writer', 'no fourth writer')
  assertIncludes(gate, 'Generic participation entity', 'no generic participation')
  assertIncludes(gate, 'TASK-038', 'TASK-038')
  assertIncludes(gate, 'TASK-039', 'TASK-039')
  assertIncludes(gate, 'TASK-040', 'TASK-040')
  assertIncludes(gate, 'TASK-041', 'TASK-041')
}

console.log('▶ no fourth WI writer / no participation entity')
{
  const writeAdapter = read('src/lib/operations/weeklyIjtemaWriteAdapter.ts')
  assertIncludes(writeAdapter, 'export function markWeeklyIjtemaAttendance', 'karkun attendance writer')
  assertIncludes(writeAdapter, 'export function markWeeklyIjtemaCommitment', 'commitment writer')
  assertNotIncludes(
    writeAdapter,
    'export function upsertWeeklyIjtemaRuknAttendance',
    'Rukn attendance is not a write-adapter fourth writer',
  )
  const service = read('src/services/weeklyIjtemaService.ts')
  assertIncludes(service, 'upsertWeeklyIjtemaSubmission(submission)', 'canonical submission writer')
  assertIncludes(service, 'export function upsertWeeklyIjtemaRuknAttendance', 'Rukn attendance extends canonical writer')
  assertIncludes(
    service,
    'marks: existing?.marks ?? []',
    'Rukn attendance preserves karkun marks',
  )

  const participationHits = [
    'src/types/participation.ts',
    'src/types/programmeParticipation.ts',
    'src/lib/participation.ts',
  ]
  for (const rel of participationHits) {
    assert.equal(existsSync(resolve(root, rel)), false, `did not expect ${rel}`)
  }
}

function resetPeopleFixture(): { ruknId: string; karkunId: string; eventId: string } {
  clearWeeklyIjtemaStore()
  clearIjtemaAttendanceStore()
  clearAssignmentStore()

  const rukn = ruknMaster.find((row) => row.status === 'active' && row.gender === 'Male')
  assert.ok(rukn, 'active male rukn')
  const karkunId = 'K-PHASE5-1'
  const existingIndex = MOCK_KARKUN_REGISTRY.findIndex((row) => row.id === karkunId)
  const karkun: KarkunRegistryRecord = {
    id: karkunId,
    name: 'Phase 5 Fixture',
    gender: 'Male',
    mobile: '03000000001',
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
  }
  if (existingIndex >= 0) MOCK_KARKUN_REGISTRY[existingIndex] = karkun
  else MOCK_KARKUN_REGISTRY.push(karkun)

  const assignment: AssignmentRecord = {
    assignmentId: 'A-PHASE5-1',
    assignmentNumber: 'ASN-PHASE5-1',
    ruknId: rukn!.id,
    karkunId,
    assignedDate: now.slice(0, 10),
    effectiveFrom: now.slice(0, 10),
    status: 'Active',
    assignedBy: 'Administrator',
    createdAt: now,
    updatedAt: now,
  }
  replaceAllAssignments([assignment], 2)
  assert.ok(
    getAssignedKarkunanForRukn(rukn!.id).some((row) => row.id === karkunId),
    'fixture assigned',
  )

  const meetingDate = now.slice(0, 10)
  const created = createWeeklyIjtemaEvent({
    meetingDate,
    title: 'Phase 5 WI',
    createdBy: 'Admin Test',
    audienceGender: 'Male',
  })
  assert.equal(created.success, true, 'event created')
  return { ruknId: rukn!.id, karkunId, eventId: created.success ? created.event.id : '' }
}

console.log('▶ TASK-038 — Rukn Invited → Present / Absent on canonical WI event')
{
  const { ruknId, karkunId, eventId } = resetPeopleFixture()
  assert.equal(
    resolveWeeklyIjtemaRuknAttendanceState(undefined),
    'Invited',
    'default Invited without submission',
  )
  assert.equal(
    resolveWeeklyIjtemaRuknAttendanceState(getWeeklyIjtemaSubmission(eventId, ruknId)),
    'Invited',
  )

  const present = upsertWeeklyIjtemaRuknAttendance({
    eventId,
    ruknId,
    ruknName: 'Fixture Rukn',
    status: 'Present',
    submittedBy: ruknId,
  })
  assert.equal(present.success, true)
  assert.equal(resolveWeeklyIjtemaRuknAttendanceState(present.success ? present.submission : null), 'Present')
  assert.equal(present.success && present.submission.ruknAttendance?.invited, true)

  const karkunMark = upsertWeeklyIjtemaKarkunMark({
    eventId,
    ruknId,
    ruknName: 'Fixture Rukn',
    karkunId,
    karkunName: 'Phase 5 Fixture',
    status: 'Absent',
    reminded: true,
    submittedBy: ruknId,
  })
  assert.equal(karkunMark.success, true)
  assert.equal(
    resolveWeeklyIjtemaRuknAttendanceState(karkunMark.success ? karkunMark.submission : null),
    'Present',
    'karkun mark preserves Rukn Present',
  )
  assert.equal(
    karkunMark.success && karkunMark.submission.marks.find((mark) => mark.karkunId === karkunId)?.status,
    'Absent',
  )

  const absent = upsertWeeklyIjtemaRuknAttendance({
    eventId,
    ruknId,
    ruknName: 'Fixture Rukn',
    status: 'Absent',
    submittedBy: ruknId,
  })
  assert.equal(absent.success, true)
  assert.equal(resolveWeeklyIjtemaRuknAttendanceState(absent.success ? absent.submission : null), 'Absent')
  assert.equal(
    absent.success && absent.submission.marks.find((mark) => mark.karkunId === karkunId)?.status,
    'Absent',
    'Rukn attendance preserves karkun marks',
  )

  const commitment = markWeeklyIjtemaCommitment({
    karkunId,
    commitment: 'committed',
    ruknId,
    updatedBy: 'Admin Test',
  })
  assert.equal(commitment.success, true)
  assert.equal(commitment.success && commitment.source, 'legacy')
  assert.equal(
    resolveWeeklyIjtemaRuknAttendanceState(getWeeklyIjtemaSubmission(eventId, ruknId)),
    'Absent',
    'Matrix Committed does not change Rukn attendance',
  )
  const report = getWeeklyIjtemaReport(eventId)
  const row = report?.ruknRows.find((item) => item.ruknId === ruknId)
  assert.equal(row?.ruknAttendance, 'Absent')
  assert.notEqual(row?.ruknAttendance, 'Committed')
}

console.log('▶ TASK-039 — Occurrence sourceRef links WI event; WI not mutated')
{
  const eventId = 'wi-event-phase5'
  const sourceRef = resolveOccurrenceActivitySourceRef({
    programmeKind: 'weekly_ijtema',
    occurrenceDate: '2026-08-09',
    audienceGender: 'Male',
    catalog: {
      weeklyIjtemaEvents: [
        { id: eventId, meetingDate: '2026-08-09', audienceGender: 'Male', status: 'Open' },
      ],
    },
  })
  assert.deepEqual(sourceRef, { kind: 'weekly_ijtema_event', eventId })
  assert.equal(
    findWeeklyIjtemaEventForOccurrence('2026-08-09', 'Female', [
      { id: eventId, meetingDate: '2026-08-09', audienceGender: 'Male', status: 'Open' },
    ])?.id,
    undefined,
    'does not cross-link Male WI event to Female occurrence',
  )
  assert.equal(
    resolveOccurrenceActivitySourceRef({
      programmeKind: 'follow_up',
      occurrenceDate: '2026-08-09',
      catalog: {
        weeklyIjtemaEvents: [
          { id: eventId, meetingDate: '2026-08-09', audienceGender: 'Male', status: 'Open' },
        ],
      },
    }),
    undefined,
    'non-WI programmes do not get WI sourceRef',
  )

  resetRepositoryProviderForTests()
  clearLocalProgrammesForTests()
  clearLocalOccurrencesForTests()
  clearWeeklyIjtemaStore()
  const createdEvent = createWeeklyIjtemaEvent({
    meetingDate: '2026-08-09',
    title: 'Men WI',
    createdBy: 'verify',
    audienceGender: 'Male',
  })
  assert.equal(createdEvent.success, true)
  const wiIdBefore = createdEvent.success ? createdEvent.event.id : ''
  const wiStatusBefore = createdEvent.success ? createdEvent.event.status : ''

  const repos = getRepositories()
  const programme: LocalProgramme = {
    id: 'lp-wi-phase5',
    campaignId: ACTIVE_CAMPAIGN_ID,
    name: 'Weekly Ijtema',
    kind: 'weekly_ijtema',
    status: 'active',
    startDate: '2026-08-09',
    endDate: '2026-08-09',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const savedProgramme = await repos.localProgramme.saveDurable(programme)
  assert.equal(savedProgramme.ok, true)

  const generated = await generateOccurrencesForProgramme(
    programme,
    repos.occurrence,
    undefined,
    {
      weeklyIjtemaEvents: createdEvent.success ? [createdEvent.event] : [],
    },
  )
  const male = generated.created.find((row) => row.audienceGender === 'Male')
  assert.ok(male, 'male WI occurrence created')
  assert.deepEqual(male?.sourceRef, { kind: 'weekly_ijtema_event', eventId: wiIdBefore })
  assert.equal(createdEvent.success && createdEvent.event.id, wiIdBefore, 'WI id unchanged')
  assert.equal(createdEvent.success && createdEvent.event.status, wiStatusBefore, 'WI status unchanged')

  const engine = read('src/lib/weeklyIjtema/attendanceWindowEngine.ts')
  assertNotIncludes(engine, 'activitySourceLink', 'window engine does not link via Occurrence')
  assertNotIncludes(engine, 'generateOccurrences', 'window engine does not generate Occurrences')
}

console.log('▶ TASK-040 — orientation uses existing journey SoT; no generic attendance')
{
  assert.equal(programmeAttendanceMode('weekly_ijtema'), 'weekly_ijtema_event')
  assert.equal(programmeRequiresEventAttendance('weekly_ijtema'), true)
  assert.equal(programmeRequiresEventAttendance('monthly_baitul_maal'), false)
  assert.equal(programmeRequiresEventAttendance('campaign_execution'), false)
  assert.equal(programmeRequiresEventAttendance('follow_up'), false)
  assert.equal(programmeRequiresEventAttendance('other'), false)
  assert.equal(programmeAttendanceMode('other'), 'none')

  const karkun = MOCK_KARKUN_REGISTRY[0]
  if (karkun) {
    assert.equal(resolveOrientationAttendance(karkun), hasOrientationSignal(karkun))
  }
  const orientationMod = read('src/lib/orientation/orientationAttendance.ts')
  assertIncludes(orientationMod, 'hasOrientationSignal', 'reuses journey SoT')
  assertIncludes(orientationMod, 'not a new collection', 'no new orientation collection')
}

console.log('▶ TASK-041 — Bait-ul-Maal SoT + sourceRef; dual-write / Exempt untouched')
{
  const bmAdapter = read('src/lib/operations/monthlyBaitulMaalWriteAdapter.ts')
  assertIncludes(bmAdapter, 'always dual-writes legacy', 'dual-write preserved')
  assertIncludes(bmAdapter, "if (input.status === 'Exempt') return 'remove'", 'Exempt untouched')
  const bmTypes = read('src/types/monthlyBaitulMaal.ts')
  assertIncludes(bmTypes, "export type MonthlyBaitulMaalMarkStatus = 'Contributed' | 'Pending'", 'Paid/Unpaid cycle marks')
  assertNotIncludes(bmTypes, 'Excused', 'no Excused on cycle marks')

  clearMonthlyBaitulMaalStore()
  const monthKey = '2026-08'
  const cycle = createMonthlyBaitulMaalCycle({
    monthKey,
    createdBy: 'verify',
  })
  assert.equal(cycle.success, true)
  const cycleId = cycle.success ? cycle.cycle.id : ''
  const linked = findMonthlyBaitulMaalCycleForOccurrence('2026-08-15', [
    { id: cycleId, monthKey },
  ])
  assert.equal(linked?.id, cycleId)
  assert.deepEqual(
    resolveOccurrenceActivitySourceRef({
      programmeKind: 'monthly_baitul_maal',
      occurrenceDate: '2026-08-15',
      catalog: { baitulMaalCycles: [{ id: cycleId, monthKey }] },
    }),
    { kind: 'monthly_baitul_maal_cycle', cycleId },
  )
  assert.equal(cycle.success && cycle.cycle.status, 'Open', 'BM cycle not mutated by linker')
}

console.log('OK: Phase 5 activity tracking verification passed')
