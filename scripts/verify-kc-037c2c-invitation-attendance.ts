/**
 * KC-037C2C — Weekly Ijtema Invitation Workflow Option A verification.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { ruknMaster } from '../src/data/ruknMaster'
import { getAssignedKarkunanForRukn } from '../src/lib/assignmentEngine'
import { buildCampaignMatrixRows } from '../src/lib/campaignExecutionMatrix'
import {
  getWeeklyIjtemaCurrentAttendanceView,
  getWeeklyIjtemaInvitationView,
  IJTEMA_CAMPAIGN_INVITED,
} from '../src/lib/operations/weeklyIjtemaReadAdapter'
import {
  markWeeklyIjtemaAttendance,
  markWeeklyIjtemaInvitation,
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
  const karkunId = 'K-037C2C-1'
  MOCK_KARKUN_REGISTRY.length = 0
  const karkun: KarkunRegistryRecord = {
    id: karkunId,
    name: 'KC-037C2C Fixture',
    gender: 'Male',
    mobile: '030037C2C1',
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
    assignmentId: 'A-037C2C-1',
    assignmentNumber: 'ASN-037C2C-1',
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
    title: 'KC-037C2C Window',
    createdBy: 'Admin Test',
    audienceGender: 'Male',
  })
  assert(created.success, 'event created')
  return { ruknId: rukn!.id, karkunId, eventId: created.success ? created.event.id : '' }
}

function testInvitedDoesNotCreateAttendance(): void {
  const { ruknId, karkunId, eventId } = resetFixture()
  const invited = markWeeklyIjtemaInvitation({
    karkunId,
    status: 'Present',
    updatedBy: ruknId,
    ruknId,
  })
  assert(invited.success, 'invited')
  assert(getWeeklyIjtemaInvitationView(karkunId).status === 'Present', 'invitation Present')
  assert(
    (getWeeklyIjtemaInvitationView(karkunId).remarks ?? '').includes(IJTEMA_CAMPAIGN_INVITED),
    'campaign invited remarks',
  )
  assert(
    getWeeklyIjtemaCurrentAttendanceView(karkunId).status === 'Not recorded',
    'attendance still pending',
  )
  const counts = getRuknWeeklyIjtemaInvitationAttendanceCounts(eventId, ruknId)
  assert(counts.invitedOnly === 1, 'invitedOnly=1')
  assert(counts.present === 0 && counts.absent === 0, 'no attendance')
  assert(counts.pending === 0, 'pending=0 when invited-only')
}

function testPresentAutoInvites(): void {
  const { ruknId, karkunId, eventId } = resetFixture()
  assert(getWeeklyIjtemaInvitationView(karkunId).status === 'Not recorded', 'start not invited')
  const marked = markWeeklyIjtemaAttendance({
    karkunId,
    status: 'Present',
    updatedBy: ruknId,
    ruknId,
  })
  assert(marked.success, 'present marked')
  assert(getWeeklyIjtemaCurrentAttendanceView(karkunId).status === 'Present', 'attendance Present')
  assert(getWeeklyIjtemaInvitationView(karkunId).status === 'Present', 'auto Invited')
  assert(
    (getWeeklyIjtemaInvitationView(karkunId).remarks ?? '').includes(IJTEMA_CAMPAIGN_INVITED),
    'auto Campaign: Invited',
  )
  const matrix = buildCampaignMatrixRows(ruknId).find((r) => r.karkunId === karkunId)
  assert(matrix?.ijtema === 'Present', 'Matrix shows Invited')
  const counts = getRuknWeeklyIjtemaInvitationAttendanceCounts(eventId, ruknId)
  assert(counts.present === 1 && counts.invitedTotal === 1, 'present in invitedTotal')
  assert(counts.attendancePct === 100, 'attendance 100%')
  assert(counts.invitationPct === 100, 'invitation 100%')
}

function testAbsentAutoInvitesAndPersists(): void {
  const { ruknId, karkunId } = resetFixture()
  assert(
    markWeeklyIjtemaAttendance({
      karkunId,
      status: 'Absent',
      updatedBy: ruknId,
      ruknId,
    }).success,
    'absent',
  )
  assert(getWeeklyIjtemaInvitationView(karkunId).status === 'Present', 'auto Invited on Absent')
  assert(
    markWeeklyIjtemaAttendance({
      karkunId,
      status: 'Present',
      updatedBy: ruknId,
      ruknId,
    }).success,
    'flip to Present',
  )
  assert(
    getWeeklyIjtemaInvitationView(karkunId).status === 'Present',
    'invitation persists Present↔Absent',
  )
  assert(
    (getWeeklyIjtemaInvitationView(karkunId).remarks ?? '').includes(IJTEMA_CAMPAIGN_INVITED),
    'remarks persist',
  )
  assert(
    markWeeklyIjtemaAttendance({
      karkunId,
      status: 'Absent',
      updatedBy: ruknId,
      ruknId,
    }).success,
    'flip to Absent',
  )
  assert(getWeeklyIjtemaInvitationView(karkunId).status === 'Present', 'still Invited')
}

function testDashboardAndHealthPct(): void {
  const { ruknId, karkunId, eventId } = resetFixture()
  markWeeklyIjtemaInvitation({ karkunId, status: 'Present', updatedBy: ruknId, ruknId })
  const progress = getRuknAttendanceProgress(eventId, ruknId)
  assert(progress.invited === 1, 'dashboard invited bucket')
  assert(progress.present === 0 && progress.absent === 0, 'no attendance yet')
  assert(progress.pending === 0, 'pending formula with invited-only')
  assert(progress.unmarked === 1, 'unmarked for reminders')

  markWeeklyIjtemaAttendance({ karkunId, status: 'Present', updatedBy: ruknId, ruknId })
  const kpi = getWeeklyIjtemaDashboardKpi()
  assert(kpi.attendancePct === 100, 'KPI Present÷Invited')
  assert(kpi.invitationPct === 100, 'KPI Invited÷Connected')
  const health = getDashboardWeeklyIjtemaHealthSlice()
  assert(health.total === 1, 'health total = invitedTotal')
  assert(health.current === 1, 'health current = present')
  assert(health.pct === 100, 'health Present÷Invited')
}

function testMatrixIndependentAndWiring(): void {
  const writeSrc = readFileSync(resolve('src/lib/operations/weeklyIjtemaWriteAdapter.ts'), 'utf8')
  assert(writeSrc.includes('ensureWeeklyIjtemaInvitedFromAttendance'), 'adapter auto-invite')
  assert(writeSrc.includes('markWeeklyIjtemaInvitation'), 'invitation API intact')
  const matrixSrc = readFileSync(resolve('src/components/execution/CampaignExecutionMatrix.tsx'), 'utf8')
  assert(matrixSrc.includes('Invited for Weekly Ijtema'), 'matrix column independent')
  assert(!matrixSrc.includes('subscribeToWeeklyIjtemaStore'), 'matrix not on attendance store')
  const cardSrc = readFileSync(
    resolve('src/components/execution/WeeklyIjtemaAttendanceOpenCard.tsx'),
    'utf8',
  )
  assert(cardSrc.includes('Invited'), 'dashboard Invited metric')
  assert(cardSrc.includes('Present ÷'), 'dashboard explains attendance %')
}

const cases = [
  run('Invited saves; attendance stays Pending', testInvitedDoesNotCreateAttendance),
  run('Present auto-marks Invited', testPresentAutoInvites),
  run('Absent auto-marks Invited; invitation persists', testAbsentAutoInvitesAndPersists),
  run('Dashboard counts + Health Present÷Invited', testDashboardAndHealthPct),
  run('Matrix independent + wiring', testMatrixIndependentAndWiring),
]

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-037C2C',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
process.exit(failed.length === 0 ? 0 : 1)
