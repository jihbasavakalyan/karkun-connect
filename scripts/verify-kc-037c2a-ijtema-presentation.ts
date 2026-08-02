/**
 * KC-037C2A — Weekly Ijtema presentation + invitation/attendance decoupling.
 * Run: npx vite-node scripts/verify-kc-037c2a-ijtema-presentation.ts
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { ruknMaster } from '../src/data/ruknMaster'
import { getAssignedKarkunanForRukn } from '../src/lib/assignmentEngine'
import {
  buildCampaignMatrixRows,
  ijtemaStatusChip,
} from '../src/lib/campaignExecutionMatrix'
import {
  getWeeklyIjtemaCurrentAttendanceView,
  getWeeklyIjtemaInvitationView,
  IJTEMA_CAMPAIGN_INVITED,
} from '../src/lib/operations/weeklyIjtemaReadAdapter'
import {
  markWeeklyIjtemaAttendance,
  markWeeklyIjtemaInvitation,
} from '../src/lib/operations/weeklyIjtemaWriteAdapter'
import {
  createWeeklyIjtemaEvent,
  saveWeeklyIjtemaSubmission,
} from '../src/services/weeklyIjtemaService'
import { clearAssignmentStore, replaceAllAssignments } from '../src/stores/assignmentStore'
import { clearIjtemaAttendanceStore } from '../src/stores/ijtemaAttendanceStore'
import {
  clearWeeklyIjtemaStore,
  getWeeklyIjtemaSubmissionsForEvent,
} from '../src/stores/weeklyIjtemaStore'
import type { AssignmentRecord } from '../src/types/assignment'
import type { KarkunRegistryRecord } from '../src/types/karkun-registry.types'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`)
  console.log(`OK: ${message}`)
}

// --- Presentation labels ---
assert(ijtemaStatusChip('Pending').label === 'Pending', 'Pending stays Pending')
assert(ijtemaStatusChip('Present').label === 'Invited', 'Present displays as Invited')
assert(ijtemaStatusChip('Absent').label === 'Not Invited', 'Absent displays as Not Invited')
assert(ijtemaStatusChip('Excused').label === 'Excused', 'Excused stays Excused')

const registerSource = readFileSync(
  resolve('src/pages/rukn/WeeklyIjtemaRegisterPage.tsx'),
  'utf8',
)
assert(
  registerSource.includes("Today's Weekly Ijtema Attendance"),
  "attendance page title is Today's Weekly Ijtema Attendance",
)
assert(
  registerSource.includes("label: 'Present'") && registerSource.includes("label: 'Absent'"),
  'attendance STATUS_OPTIONS keep Present and Absent',
)
assert(
  !registerSource.includes("label: 'Invited'") &&
    !registerSource.includes("label: 'Not Invited'"),
  'attendance register does not use Invited/Not Invited status labels',
)

const matrixSource = readFileSync(
  resolve('src/components/execution/CampaignExecutionMatrix.tsx'),
  'utf8',
)
assert(
  matrixSource.includes('Invited for Weekly Ijtema'),
  'Execution Matrix column uses Invited for Weekly Ijtema',
)
assert(
  !matrixSource.includes('subscribeToWeeklyIjtemaStore'),
  'Matrix does not subscribe to attendance submission store',
)
assert(
  matrixSource.includes('subscribeToIjtemaAttendanceStore'),
  'Matrix still refreshes from invitation (legacy) store',
)

const matrixLib = readFileSync(resolve('src/lib/campaignExecutionMatrix.ts'), 'utf8')
assert(
  matrixLib.includes('getWeeklyIjtemaInvitationView'),
  'Matrix rows read invitation view',
)
assert(
  matrixLib.includes('markWeeklyIjtemaInvitation'),
  'Matrix writes invitation API',
)
assert(
  !matrixLib.includes('getWeeklyIjtemaCurrentAttendanceView'),
  'Matrix no longer reads attendance view',
)

// --- Runtime isolation ---
clearWeeklyIjtemaStore()
clearIjtemaAttendanceStore()
clearAssignmentStore()

const rukn = ruknMaster.find((r) => r.status === 'active' && r.gender === 'Male')
assert(Boolean(rukn), 'active male rukn available for fixture')

const now = new Date().toISOString()
const karkunId = 'K-037C2A-1'
MOCK_KARKUN_REGISTRY.length = 0
const karkun: KarkunRegistryRecord = {
  id: karkunId,
  name: 'KC-037C2A Fixture',
  gender: 'Male',
  mobile: '030037C2A1',
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
MOCK_KARKUN_REGISTRY.push(karkun)
karkun.assignedRuknId = rukn!.id
karkun.assignedRukn = rukn!.name
karkun.assignmentStatus = 'Assigned'
const assignment: AssignmentRecord = {
  assignmentId: 'A-037C2A-1',
  assignmentNumber: 'ASN-037C2A-1',
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
assert(
  Boolean(getAssignedKarkunanForRukn(rukn!.id).find((row) => row.id === karkunId)),
  'fixture karkun assigned',
)

const meetingDate = new Date().toISOString().slice(0, 10)
const created = createWeeklyIjtemaEvent({
  meetingDate,
  title: 'KC-037C2A Isolation',
  createdBy: 'Admin Test',
  audienceGender: 'Male',
})
assert(created.success, 'open attendance event created')
const eventId = created.success ? created.event.id : ''

const invited = markWeeklyIjtemaInvitation({
  karkunId,
  status: 'Present',
  updatedBy: rukn!.id,
  ruknId: rukn!.id,
})
assert(invited.success, 'invitation marked Invited (Present)')
assert(
  getWeeklyIjtemaInvitationView(karkunId).status === 'Present',
  'invitation view is Present/Invited',
)
assert(
  (getWeeklyIjtemaInvitationView(karkunId).remarks ?? '').includes(IJTEMA_CAMPAIGN_INVITED),
  'invitation stamps Campaign: Invited remarks',
)
assert(
  getWeeklyIjtemaSubmissionsForEvent(eventId).length === 0,
  'invitation write does not create attendance submissions',
)

const matrixBefore = buildCampaignMatrixRows(rukn!.id).find((r) => r.karkunId === karkunId)
assert(matrixBefore?.ijtema === 'Present', 'Matrix shows Invited before attendance submit')

const submitted = saveWeeklyIjtemaSubmission({
  eventId,
  ruknId: rukn!.id,
  ruknName: rukn!.name,
  marks: [{ karkunId, karkunName: karkun.name, status: 'Absent' }],
  submittedBy: rukn!.id,
})
assert(submitted.success, 'attendance submission (Absent) succeeds')

assert(
  getWeeklyIjtemaInvitationView(karkunId).status === 'Present',
  'attendance submit does not change invitation',
)
assert(
  getWeeklyIjtemaCurrentAttendanceView(karkunId).status === 'Absent',
  'attendance view reflects submitted Absent',
)

const matrixAfter = buildCampaignMatrixRows(rukn!.id).find((r) => r.karkunId === karkunId)
assert(matrixAfter?.ijtema === 'Present', 'Matrix invitation unchanged after attendance submit')

const attendanceOnly = markWeeklyIjtemaAttendance({
  karkunId,
  status: 'Present',
  updatedBy: rukn!.id,
  ruknId: rukn!.id,
})
assert(attendanceOnly.success, 'attendance adapter can upsert event mark')
assert(
  getWeeklyIjtemaInvitationView(karkunId).status === 'Present',
  'attendance adapter does not clobber invitation',
)
assert(
  (getWeeklyIjtemaInvitationView(karkunId).remarks ?? '').includes(IJTEMA_CAMPAIGN_INVITED),
  'invitation remarks remain Campaign: Invited after attendance write',
)

console.log('\nKC-037C2A presentation + decoupling verification passed.')
