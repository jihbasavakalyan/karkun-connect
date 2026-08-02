/**
 * KC-037C2D — Separate Weekly Ijtema Commitment from Reminder/Attendance.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { ruknMaster } from '../src/data/ruknMaster'
import { getAssignedKarkunanForRukn } from '../src/lib/assignmentEngine'
import { buildCampaignMatrixRows } from '../src/lib/campaignExecutionMatrix'
import {
  getWeeklyIjtemaCommitmentView,
  getWeeklyIjtemaCurrentAttendanceView,
  IJTEMA_CAMPAIGN_COMMITTED,
  IJTEMA_CAMPAIGN_INVITED,
} from '../src/lib/operations/weeklyIjtemaReadAdapter'
import {
  markWeeklyIjtemaAttendance,
  markWeeklyIjtemaCommitment,
  markWeeklyIjtemaReminded,
} from '../src/lib/operations/weeklyIjtemaWriteAdapter'
import { getRuknWeeklyIjtemaInvitationAttendanceCounts } from '../src/lib/operations/weeklyIjtemaInvitationAttendance'
import {
  createWeeklyIjtemaEvent,
  getRuknAttendanceProgress,
  getWeeklyIjtemaDashboardKpi,
} from '../src/services/weeklyIjtemaService'
import { getDashboardWeeklyIjtemaHealthSlice } from '../src/services/dashboardMetricsService'
import { clearAssignmentStore, replaceAllAssignments } from '../src/stores/assignmentStore'
import { clearIjtemaAttendanceStore } from '../src/stores/ijtemaAttendanceStore'
import { clearWeeklyIjtemaStore } from '../src/stores/weeklyIjtemaStore'
import { getWeeklyIjtemaSubmission } from '../src/stores/weeklyIjtemaStore'
import type { AssignmentRecord } from '../src/types/assignment'
import type { KarkunRegistryRecord } from '../src/types/karkun-registry.types'

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

function resetFixture(): { ruknId: string; karkunId: string; eventId: string } {
  clearWeeklyIjtemaStore()
  clearIjtemaAttendanceStore()
  clearAssignmentStore()

  const rukn = ruknMaster.find((r) => r.status === 'active' && r.gender === 'Male')
  assert(Boolean(rukn), 'active male rukn')
  const now = new Date().toISOString()
  const karkunId = 'K-037C2D-1'
  MOCK_KARKUN_REGISTRY.length = 0
  const karkun: KarkunRegistryRecord = {
    id: karkunId,
    name: 'KC-037C2D Fixture',
    gender: 'Male',
    mobile: '030037C2D1',
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
  MOCK_KARKUN_REGISTRY.push(karkun)
  const assignment: AssignmentRecord = {
    assignmentId: 'A-037C2D-1',
    assignmentNumber: 'ASN-037C2D-1',
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
  assert(Boolean(getAssignedKarkunanForRukn(rukn!.id).find((r) => r.id === karkunId)), 'assigned')

  const meetingDate = new Date().toISOString().slice(0, 10)
  const created = createWeeklyIjtemaEvent({
    meetingDate,
    title: 'KC-037C2D Window',
    createdBy: 'Admin Test',
    audienceGender: 'Male',
  })
  assert(created.success, 'event created')
  return { ruknId: rukn!.id, karkunId, eventId: created.success ? created.event.id : '' }
}

function testCommitmentUnchangedAfterAttendance(): void {
  const { ruknId, karkunId } = resetFixture()
  assert(
    markWeeklyIjtemaCommitment({
      karkunId,
      commitment: 'discussed',
      updatedBy: ruknId,
      ruknId,
    }).success,
    'set discussed',
  )
  assert(getWeeklyIjtemaCommitmentView(karkunId).commitment === 'discussed', 'discussed start')
  assert(
    markWeeklyIjtemaAttendance({
      karkunId,
      status: 'Present',
      updatedBy: ruknId,
      ruknId,
    }).success,
    'present',
  )
  assert(
    getWeeklyIjtemaCommitmentView(karkunId).commitment === 'discussed',
    'commitment unchanged after Present',
  )
  assert(
    markWeeklyIjtemaAttendance({
      karkunId,
      status: 'Absent',
      updatedBy: ruknId,
      ruknId,
    }).success,
    'absent',
  )
  assert(
    getWeeklyIjtemaCommitmentView(karkunId).commitment === 'discussed',
    'commitment unchanged after Absent',
  )
}

function testPresentAbsentAutoRemind(): void {
  const { ruknId, karkunId, eventId } = resetFixture()
  assert(getWeeklyIjtemaCommitmentView(karkunId).commitment === 'not_discussed', 'no commit')
  assert(
    markWeeklyIjtemaAttendance({
      karkunId,
      status: 'Present',
      updatedBy: ruknId,
      ruknId,
    }).success,
    'present',
  )
  assert(getWeeklyIjtemaCurrentAttendanceView(karkunId).status === 'Present', 'attendance')
  assert(getWeeklyIjtemaCommitmentView(karkunId).commitment === 'not_discussed', 'no Matrix write')
  const submission = getWeeklyIjtemaSubmission(eventId, ruknId)
  const mark = submission?.marks.find((m) => m.karkunId === karkunId)
  assert(mark?.reminded === true, 'mark.reminded')
  assert(mark?.status === 'Present', 'mark Present')
  const counts = getRuknWeeklyIjtemaInvitationAttendanceCounts(eventId, ruknId)
  assert(counts.present === 1 && counts.remindedTotal === 1, 'remindedTotal')
  assert(counts.reminderPct === 100 && counts.attendancePct === 100, 'pcts')
}

function testRemindedWithoutAttendance(): void {
  const { ruknId, karkunId, eventId } = resetFixture()
  assert(
    markWeeklyIjtemaReminded({ karkunId, updatedBy: ruknId, ruknId }).success,
    'reminded',
  )
  assert(
    getWeeklyIjtemaCurrentAttendanceView(karkunId).status === 'Not recorded',
    'attendance pending',
  )
  const counts = getRuknWeeklyIjtemaInvitationAttendanceCounts(eventId, ruknId)
  assert(counts.remindedOnly === 1, 'remindedOnly')
  assert(counts.present === 0 && counts.absent === 0, 'no attendance')
  assert(counts.pending === 0, 'pending=0')
  assert(counts.reminderPct === 100 && counts.attendancePct === 0, 'pcts')
  const progress = getRuknAttendanceProgress(eventId, ruknId)
  assert(progress.reminded === 1 && progress.pending === 0, 'dashboard reminded')
}

function testCommitmentLadderAndLegacyInvite(): void {
  const { ruknId, karkunId } = resetFixture()
  assert(
    markWeeklyIjtemaCommitment({
      karkunId,
      commitment: 'committed',
      updatedBy: ruknId,
      ruknId,
    }).success,
    'committed',
  )
  assert(getWeeklyIjtemaCommitmentView(karkunId).commitment === 'committed', 'committed state')
  assert(
    (getWeeklyIjtemaCommitmentView(karkunId).remarks ?? '').includes(IJTEMA_CAMPAIGN_COMMITTED) ||
      (getWeeklyIjtemaCommitmentView(karkunId).remarks ?? '').includes(IJTEMA_CAMPAIGN_INVITED),
    'commitment remarks',
  )
  const matrix = buildCampaignMatrixRows(ruknId).find((r) => r.karkunId === karkunId)
  assert(matrix?.ijtema === 'committed', 'matrix committed')
}

function testHealthAndWiring(): void {
  const { ruknId, karkunId } = resetFixture()
  markWeeklyIjtemaReminded({ karkunId, updatedBy: ruknId, ruknId })
  markWeeklyIjtemaAttendance({ karkunId, status: 'Present', updatedBy: ruknId, ruknId })
  const kpi = getWeeklyIjtemaDashboardKpi()
  assert(kpi.attendancePct === 100, 'KPI Present÷Reminded')
  assert(kpi.reminderPct === 100, 'KPI Reminder÷Connected')
  const health = getDashboardWeeklyIjtemaHealthSlice()
  assert(health.total === 1 && health.current === 1 && health.pct === 100, 'health')

  const writeSrc = readFileSync(resolve('src/lib/operations/weeklyIjtemaWriteAdapter.ts'), 'utf8')
  assert(!writeSrc.includes('ensureWeeklyIjtemaInvitedFromAttendance({'), 'no auto-ensure calls')
  const matrixSrc = readFileSync(
    resolve('src/components/execution/CampaignExecutionMatrix.tsx'),
    'utf8',
  )
  assert(matrixSrc.includes('Weekly Ijtema Commitment'), 'matrix column rename')
  const cardSrc = readFileSync(
    resolve('src/components/execution/WeeklyIjtemaAttendanceOpenCard.tsx'),
    'utf8',
  )
  assert(cardSrc.includes('Reminded'), 'dashboard Reminded')
  assert(cardSrc.includes('Present ÷'), 'dashboard explains attendance %')
}

const cases = [
  run('Commitment unchanged after Present/Absent', testCommitmentUnchangedAfterAttendance),
  run('Present/Absent set reminded; Matrix untouched', testPresentAbsentAutoRemind),
  run('Reminded without attendance', testRemindedWithoutAttendance),
  run('Commitment ladder + Matrix', testCommitmentLadderAndLegacyInvite),
  run('Health + wiring', testHealthAndWiring),
]

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-037C2D',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
process.exit(failed.length === 0 ? 0 : 1)
