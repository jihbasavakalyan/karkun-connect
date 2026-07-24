/**
 * KC-0101.B — Dashboard data integrity: single authoritative Visit / Health aggregation.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildCampaignOperationsHealthMetrics,
  buildTodaysMissionOperationalItems,
  buildTopPriorityRukns,
} from '../src/lib/missionControl/campaignOperationsCommandCenter'
import {
  getDashboardAppRegistrationMetrics,
  getDashboardHealthSlices,
  getDashboardVisitMetrics,
} from '../src/services/dashboardMetricsService'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`)
  console.log(`OK: ${message}`)
}

const root = resolve(process.cwd())

const service = readFileSync(resolve(root, 'src/services/dashboardMetricsService.ts'), 'utf8')
assert(service.includes('sourceOfTruth: \'DashboardMetricsService\''), 'dashboard metrics service present')
assert(service.includes('getCanonicalConnectedAssignments'), 'visits use canonical connections')

const ops = readFileSync(
  resolve(root, 'src/lib/missionControl/campaignOperationsCommandCenter.ts'),
  'utf8',
)
assert(ops.includes('getDashboardHealthSlices'), 'Campaign Health uses dashboard facade')
assert(ops.includes('getDashboardVisitMetricsForRukn'), 'Priority Visits use dashboard facade')
assert(ops.includes('modulePctOrZero'), 'inactive modules use 0% not synthetic 100%')
assert(!ops.includes('modulePctOrNeutral'), 'synthetic 100% helper removed')

const trends = readFileSync(
  resolve(root, 'src/lib/missionControl/adminMissionControlPresentation.ts'),
  'utf8',
)
assert(trends.includes('getDashboardVisitMetrics'), 'Trends daily/weekly use dashboard visits')
assert(trends.includes('getDashboardConnectionProgressPct'), 'Trends connection progress from MetricsService')
assert(trends.includes('Connection progress'), 'engagement label matches connection formula')

const command = readFileSync(
  resolve(root, 'src/components/mission-control/AdminCommandCenter.tsx'),
  'utf8',
)
assert(command.includes('subscribeToFollowUpStore'), 'trends refresh listens to follow-ups')
assert(
  /trends[\s\S]*moduleTick[\s\S]*backgroundReady/.test(command),
  'trends useMemo depends on moduleTick',
)

const health = buildCampaignOperationsHealthMetrics()
const slices = getDashboardHealthSlices()
assert(health.length === 4, 'health has 4 metrics')
for (let i = 0; i < 4; i += 1) {
  assert(health[i]!.pct === slices[i]!.pct, `${health[i]!.id} matches facade pct`)
  assert(health[i]!.current === slices[i]!.current, `${health[i]!.id} matches facade current`)
}

const visits = getDashboardVisitMetrics()
assert(visits.pending === Math.max(visits.planned - visits.completed, 0), 'pending = planned - completed')
assert(visits.pct >= 0 && visits.pct <= 100, 'visit pct bounded')

const app = getDashboardAppRegistrationMetrics()
const mission = buildTodaysMissionOperationalItems()
const overdue = mission.find((item) => item.id === 'mission-overdue-visits')
if (visits.pending > 0) {
  assert(overdue?.count === visits.pending, 'mission overdue visits matches facade pending')
}
const pendingApp = mission.find((item) => item.id === 'mission-pending-app-registration')
if (app.pending > 0) {
  assert(pendingApp?.count === app.pending, 'mission pending app matches facade')
}

void buildTopPriorityRukns(3)

console.log('KC-0101.B verify-kc0101b-dashboard-integrity: OK', {
  visitsPct: visits.pct,
  appPct: app.pct,
  healthIds: health.map((m) => m.id),
})
