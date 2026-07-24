/**
 * KC-0107 — Weekly Ijtema Attendance Management verification.
 * Run: npx vite-node scripts/verify-kc0107-weekly-ijtema.ts
 */

import { clearWeeklyIjtemaStore } from '../src/stores/weeklyIjtemaStore'
import {
  closeWeeklyIjtemaAttendance,
  createWeeklyIjtemaEvent,
  getCurrentWeeklyIjtemaEvent,
  getRuknWeeklyIjtemaWorkspace,
  getWeeklyIjtemaDashboardKpi,
  getWeeklyIjtemaReport,
  reopenWeeklyIjtemaAttendance,
  saveWeeklyIjtemaSubmission,
} from '../src/services/weeklyIjtemaService'
import { canRuknEditWeeklyIjtema, defaultSubmissionDeadline } from '../src/types/weeklyIjtema'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`)
  console.log(`OK: ${message}`)
}

clearWeeklyIjtemaStore()

const created = createWeeklyIjtemaEvent({
  meetingDate: '2026-07-24',
  title: 'Weekly Ijtema',
  createdBy: 'Admin Test',
})
assert(created.success, 'Admin can create Weekly Ijtema event')
assert(created.success && created.event.status === 'Open', 'new event opens attendance')
assert(
  created.success &&
    created.event.submissionDeadline === defaultSubmissionDeadline('2026-07-24'),
  'default deadline is meeting date + 24h',
)

const event = getCurrentWeeklyIjtemaEvent()
assert(Boolean(event), 'current open event available')

const closed = closeWeeklyIjtemaAttendance(event!.id, 'Admin Test')
assert(closed.success && closed.event.status === 'Closed', 'Admin can close attendance')
assert(!canRuknEditWeeklyIjtema(closed.event), 'closed event is not editable by Rukn')

const reopened = reopenWeeklyIjtemaAttendance(event!.id, 'Admin Test')
assert(reopened.success && reopened.event.status === 'Open', 'Admin can reopen attendance')
assert(Boolean(reopened.event.reopenedAt), 'reopen stamps reopenedAt')

const incomplete = saveWeeklyIjtemaSubmission({
  eventId: event!.id,
  ruknId: 'rukn-test',
  ruknName: 'Test Rukn',
  marks: [{ karkunId: 'k1', karkunName: 'One', status: 'Present' }],
  submittedBy: 'rukn-test',
})
assert(!incomplete.success, 'submit rejected when assigned set empty or incomplete validation path')

const kpi = getWeeklyIjtemaDashboardKpi()
assert(kpi.eventId === event!.id, 'dashboard KPI binds to current event')
assert(typeof kpi.attendancePct === 'number', 'dashboard KPI has attendance %')
assert(typeof kpi.ruknsSubmitted === 'number', 'dashboard KPI has submission progress')

const report = getWeeklyIjtemaReport(event!.id)
assert(Boolean(report), 'weekly report available')
assert(report!.event.meetingDate === '2026-07-24', 'report includes meeting date')

const workspaceMissing = getRuknWeeklyIjtemaWorkspace('missing', 'rukn-1')
assert(!workspaceMissing.success, 'workspace fails for missing event')

const adminPage = readFileSync(resolve('src/pages/admin/AdminWeeklyIjtemaPage.tsx'), 'utf8')
assert(adminPage.includes('Create Weekly Ijtema'), 'admin management page present')
assert(adminPage.includes('Reopen Attendance'), 'admin reopen action present')

const reportPage = readFileSync(resolve('src/pages/admin/AdminWeeklyIjtemaReportPage.tsx'), 'utf8')
assert(reportPage.includes('Weekly Summary'), 'report page present')
assert(reportPage.includes('Rukn-wise Attendance'), 'rukn-wise % present')

const ruknPage = readFileSync(resolve('src/pages/rukn/WeeklyIjtemaRegisterPage.tsx'), 'utf8')
assert(ruknPage.includes('حاضر'), 'rukn page shows Present Urdu')
assert(ruknPage.includes('غیر حاضر'), 'rukn page shows Absent Urdu')
assert(
  ruknPage.includes('Please mark attendance for all assigned Karkuns before submitting.'),
  'rukn incomplete submit message present',
)
assert(!ruknPage.includes('Excused'), 'rukn v1 has no Excused status')

const kpiCard = readFileSync(
  resolve('src/components/mission-control/WeeklyIjtemaDashboardKpiCard.tsx'),
  'utf8',
)
assert(kpiCard.includes('Attendance'), 'dashboard KPI shows attendance')
assert(kpiCard.includes('Submission'), 'dashboard KPI shows submission')
assert(kpiCard.includes('Pending'), 'dashboard KPI shows pending')

const ops = readFileSync(
  resolve('src/lib/missionControl/campaignOperationsCommandCenter.ts'),
  'utf8',
)
assert(ops.includes('getWeeklyIjtemaDashboardKpi'), 'Campaign Health reuses Weekly Ijtema KPI')
assert(ops.includes('Present ÷ Assigned'), 'Weekly Ijtema Present÷Assigned contract')

const command = readFileSync(
  resolve('src/components/mission-control/AdminCommandCenter.tsx'),
  'utf8',
)
assert(command.includes('CampaignHealthPanel'), 'dashboard mounts Campaign Health (includes Weekly Ijtema %)')
assert(!command.includes('WeeklyIjtemaDashboardKpiCard'), 'no duplicate Weekly Ijtema KPI card on dashboard')

const routes = readFileSync(resolve('src/constants/routes.ts'), 'utf8')
assert(routes.includes('ADMIN_WEEKLY_IJTEMA'), 'admin weekly ijtema route constant present')

const router = readFileSync(resolve('src/routes/AppRouter.tsx'), 'utf8')
assert(router.includes('weekly-ijtema/:eventId/report'), 'report route wired')

const types = readFileSync(resolve('src/types/weeklyIjtema.ts'), 'utf8')
assert(types.includes("WeeklyIjtemaMarkStatus = 'Present' | 'Absent'"), 'marks are Present/Absent only')
assert(!/Excused/.test(types.replace(/No Excused[^\n]*/g, '')), 'event model has no Excused status')
assert(types.includes('WeeklyIjtemaEvent'), 'event model present')
assert(types.includes('WeeklyIjtemaSubmission'), 'submission model present')

console.log('KC-0107 Weekly Ijtema verification passed.')
