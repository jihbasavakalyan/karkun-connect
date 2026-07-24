/**
 * KC-0108 — Monthly Baitul Maal + shared lifecycle regression with KC-0107.
 * Run: npx vite-node scripts/verify-kc0108-monthly-baitul-maal.ts
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { clearWeeklyIjtemaStore } from '../src/stores/weeklyIjtemaStore'
import { clearMonthlyBaitulMaalStore } from '../src/stores/monthlyBaitulMaalStore'
import {
  closeWeeklyIjtemaAttendance,
  createWeeklyIjtemaEvent,
  getWeeklyIjtemaDashboardKpi,
  reopenWeeklyIjtemaAttendance,
} from '../src/services/weeklyIjtemaService'
import {
  closeMonthlyBaitulMaalCycle,
  createMonthlyBaitulMaalCycle,
  getMonthlyBaitulMaalDashboardKpi,
  getMonthlyBaitulMaalReport,
  reopenMonthlyBaitulMaalCycle,
  saveMonthlyBaitulMaalSubmission,
} from '../src/services/monthlyBaitulMaalService'
import { canRuknEditCycle } from '../src/lib/campaignCycle/lifecycle'
import { defaultMonthlyBaitulMaalDeadline } from '../src/types/monthlyBaitulMaal'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`)
  console.log(`OK: ${message}`)
}

clearWeeklyIjtemaStore()
clearMonthlyBaitulMaalStore()

// --- Shared lifecycle module present ---
const lifecycle = readFileSync(resolve('src/lib/campaignCycle/lifecycle.ts'), 'utf8')
assert(lifecycle.includes('canRuknEditCycle'), 'shared canRuknEditCycle present')
assert(lifecycle.includes('applyCycleStatusChange'), 'shared applyCycleStatusChange present')
assert(lifecycle.includes('defaultSubmissionDeadline'), 'shared deadline helper present')

const weeklyService = readFileSync(resolve('src/services/weeklyIjtemaService.ts'), 'utf8')
assert(weeklyService.includes('canRuknEditCycle'), 'Weekly Ijtema uses shared edit gate')
assert(weeklyService.includes('buildBinaryCycleReport'), 'Weekly Ijtema uses shared report builder')

const baitulService = readFileSync(resolve('src/services/monthlyBaitulMaalService.ts'), 'utf8')
assert(baitulService.includes('canRuknEditCycle'), 'Baitul Maal uses shared edit gate')
assert(baitulService.includes('buildBinaryCycleReport'), 'Baitul Maal uses shared report builder')

// --- KC-0107 regression ---
const ijtema = createWeeklyIjtemaEvent({
  meetingDate: '2026-07-24',
  createdBy: 'Admin Test',
})
assert(ijtema.success, 'KC-0107 create still works')
const closedIjtema = closeWeeklyIjtemaAttendance(ijtema.event.id, 'Admin Test')
assert(closedIjtema.success && !canRuknEditCycle(closedIjtema.event), 'KC-0107 close locks edits')
const reopenedIjtema = reopenWeeklyIjtemaAttendance(ijtema.event.id, 'Admin Test')
assert(reopenedIjtema.success && canRuknEditCycle(reopenedIjtema.event), 'KC-0107 reopen unlocks')
assert(getWeeklyIjtemaDashboardKpi().eventId === ijtema.event.id, 'KC-0107 KPI still binds')

// --- KC-0108 ---
const created = createMonthlyBaitulMaalCycle({
  monthKey: '2026-07',
  createdBy: 'Admin Test',
})
assert(created.success, 'Admin can create Monthly Baitul Maal cycle')
assert(created.success && created.cycle.status === 'Open', 'new cycle opens')
assert(
  created.success &&
    created.cycle.submissionDeadline === defaultMonthlyBaitulMaalDeadline('2026-07'),
  'default deadline is month-end + 24h',
)

const duplicate = createMonthlyBaitulMaalCycle({ monthKey: '2026-07', createdBy: 'Admin Test' })
assert(!duplicate.success, 'duplicate month cycle rejected')

const closed = closeMonthlyBaitulMaalCycle(created.cycle.id, 'Admin Test')
assert(closed.success && closed.cycle.status === 'Closed', 'Admin can close cycle')
assert(!canRuknEditCycle(closed.cycle), 'closed cycle not editable')

const reopened = reopenMonthlyBaitulMaalCycle(created.cycle.id, 'Admin Test')
assert(reopened.success && reopened.cycle.status === 'Open', 'Admin can reopen cycle')

const incomplete = saveMonthlyBaitulMaalSubmission({
  cycleId: created.cycle.id,
  ruknId: 'rukn-test',
  ruknName: 'Test Rukn',
  marks: [{ karkunId: 'k1', karkunName: 'One', status: 'Contributed' }],
  submittedBy: 'rukn-test',
})
assert(!incomplete.success, 'submit rejected when assigned set empty/incomplete')

const kpi = getMonthlyBaitulMaalDashboardKpi()
assert(kpi.cycleId === created.cycle.id, 'dashboard KPI binds to current cycle')
assert(typeof kpi.completionPct === 'number', 'dashboard KPI has completion %')
assert(typeof kpi.ruknsSubmitted === 'number', 'dashboard KPI has submitted count')

const report = getMonthlyBaitulMaalReport(created.cycle.id)
assert(Boolean(report), 'monthly report available')
assert(report!.cycle.monthKey === '2026-07', 'report includes month')

const types = readFileSync(resolve('src/types/monthlyBaitulMaal.ts'), 'utf8')
assert(types.includes("MonthlyBaitulMaalMarkStatus = 'Contributed' | 'Pending'"), 'Contributed/Pending only')
assert(!/\bamount\s*[?:]/i.test(types), 'no amount field in cycle model')

const adminPage = readFileSync(resolve('src/pages/admin/AdminMonthlyBaitulMaalPage.tsx'), 'utf8')
assert(adminPage.includes('Create Monthly Cycle'), 'admin management page present')
assert(adminPage.includes('Reopen Cycle'), 'admin reopen present')

const reportPage = readFileSync(
  resolve('src/pages/admin/AdminMonthlyBaitulMaalReportPage.tsx'),
  'utf8',
)
assert(reportPage.includes('Monthly Summary'), 'report page present')
assert(reportPage.includes('Rukn-wise Completion'), 'rukn-wise % present')

const ruknPage = readFileSync(resolve('src/pages/rukn/RuknMonthlyBaitulMaalPage.tsx'), 'utf8')
assert(ruknPage.includes('Contributed'), 'rukn contributed status')
assert(ruknPage.includes('Pending'), 'rukn pending status')
assert(
  ruknPage.includes('Please mark contribution status for all assigned Karkuns before submitting.'),
  'incomplete submit message',
)

const kpiCard = readFileSync(
  resolve('src/components/mission-control/MonthlyBaitulMaalDashboardKpiCard.tsx'),
  'utf8',
)
assert(kpiCard.includes('Completion'), 'dashboard KPI shows completion')
assert(kpiCard.includes('Submitted'), 'dashboard KPI shows submitted')

const ops = readFileSync(
  resolve('src/lib/missionControl/campaignOperationsCommandCenter.ts'),
  'utf8',
)
assert(ops.includes('getMonthlyBaitulMaalDashboardKpi'), 'Campaign Health reuses Monthly Baitul Maal KPI')
assert(ops.includes('getWeeklyIjtemaDashboardKpi'), 'Weekly Ijtema KPI still wired into Campaign Health')
assert(ops.includes('Contributed ÷ Assigned'), 'Monthly Baitul Maal Contributed÷Assigned contract')

const command = readFileSync(
  resolve('src/components/mission-control/AdminCommandCenter.tsx'),
  'utf8',
)
assert(command.includes('CampaignHealthPanel'), 'dashboard mounts Campaign Health (includes Baitul Maal %)')
assert(!command.includes('MonthlyBaitulMaalDashboardKpiCard'), 'no duplicate Baitul Maal KPI card on dashboard')
assert(!command.includes('WeeklyIjtemaDashboardKpiCard'), 'Weekly Ijtema KPI card still not duplicated')

const routes = readFileSync(resolve('src/constants/routes.ts'), 'utf8')
assert(routes.includes('ADMIN_MONTHLY_BAITUL_MAAL'), 'admin baitul maal route present')
assert(routes.includes('RUKN_MONTHLY_BAITUL_MAAL'), 'rukn baitul maal route present')

console.log('KC-0108 Monthly Baitul Maal verification passed (with KC-0107 regression).')
