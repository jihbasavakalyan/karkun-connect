/**
 * Dashboard information architecture contract — KC-0109 Scope 1.
 * Run: npx vite-node scripts/verify-dashboard-ia-structure.ts
 *
 * Order: Campaign Health → Today's Mission → Top Priority Rukns → Progress Trends → Activity Timeline
 * Previous three-column layout is retained in AdminOpsThreeColumnLayout.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`)
  console.log(`OK: ${message}`)
}

const hero = readFileSync(
  resolve('src/components/mission-control/AdminMissionControlHero.tsx'),
  'utf8',
)
const command = readFileSync(
  resolve('src/components/mission-control/AdminCommandCenter.tsx'),
  'utf8',
)
const actionCenter = readFileSync(
  resolve('src/components/mission-control/AdminActionCenter.tsx'),
  'utf8',
)
const threeColumn = readFileSync(
  resolve('src/components/mission-control/AdminOpsThreeColumnLayout.tsx'),
  'utf8',
)
const experiment = readFileSync(
  resolve('src/lib/missionControl/adminDashboardOpsExperiment.ts'),
  'utf8',
)
const ops = readFileSync(
  resolve('src/lib/missionControl/campaignOperationsCommandCenter.ts'),
  'utf8',
)
const routes = readFileSync(resolve('src/constants/routes.ts'), 'utf8')
const sidebar = readFileSync(resolve('src/components/layout/AdminSidebar.tsx'), 'utf8')
const ccHero = readFileSync(
  resolve('src/components/command-center/CommandCenterHero.tsx'),
  'utf8',
)
const css = readFileSync(resolve('src/index.css'), 'utf8')

assert(!hero.includes('Campaign Command Center'), 'Hero has no Campaign Command Center')
assert(!command.includes('Campaign Command Center'), 'Command center has no Campaign Command Center')
assert(!ccHero.includes('Campaign Command Center'), 'legacy hero has no Campaign Command Center')
assert(hero.includes('exdash-hero-banner'), 'Urdu campaign banner present')
assert(hero.includes('dir="rtl"'), 'banner is RTL for Urdu title')
assert(!hero.includes('Campaign Achievement Progress'), 'achievement progress moved out of Hero')
assert(command.includes('Campaign Health'), 'Campaign Health section present')
assert(command.includes('Top Priority Rukns'), 'Top Priority Rukns section present')
assert(command.includes('Progress Trends'), 'Progress Trends section present')
assert(command.includes('ActivityTimeline'), 'Activity Timeline mounted')
assert(!command.includes('Collective Overview'), 'Collective Overview removed (no duplicate surfaces)')
assert(!command.includes('LiveActivityFeed'), 'Live Activity merged into Activity Timeline')
assert(!command.includes('Recent System History'), 'System History merged into Activity Timeline')
assert(!command.includes('WeeklyIjtemaDashboardKpiCard'), 'Weekly Ijtema KPI card not duplicated on dashboard')
assert(!command.includes('MonthlyBaitulMaalDashboardKpiCard'), 'Baitul Maal KPI card not duplicated on dashboard')

assert(
  experiment.includes('USE_ADMIN_ACTION_CENTER_EXPERIMENT = true'),
  'Action Center experiment flag is enabled',
)
assert(experiment.includes('ADMIN_TODAYS_MISSION_TOP_N = 5'), 'homepage shows top 5 mission tasks')
assert(command.includes('AdminActionCenter'), 'Command center renders Today\'s Mission')
assert(command.includes('AdminOpsThreeColumnLayout'), 'previous three-column layout still wired for restore')
assert(actionCenter.includes("Today's Mission"), "Today's Mission title present")
assert(
  actionCenter.includes('Tasks requiring your attention today'),
  "Today's Mission subtitle present",
)
assert(actionCenter.includes('View All Tasks'), 'View All Tasks footer present')
assert(actionCenter.includes('adminAllTasksPath'), 'View All Tasks uses all-tasks path helper')
assert(routes.includes('adminAllTasksPath'), 'adminAllTasksPath route helper present')
assert(routes.includes('view=all-tasks'), 'all-tasks query route present')
assert(command.includes("view') === 'all-tasks'"), 'command center handles all-tasks view')
assert(experiment.includes('buildAdminActionCenterItems'), 'Action Center item builder present')
assert(ops.includes('buildCampaignOperationsHealthMetrics'), 'Campaign Health builder present')
assert(ops.includes('buildTodaysMissionOperationalItems'), "Today's Mission ops builder present")
assert(ops.includes('buildTopPriorityRukns'), 'Top Priority Rukns builder present')
assert(ops.includes('Visits = Completed'), 'Visits contract documented')
assert(ops.includes('Present ÷ Assigned'), 'Weekly Ijtema contract documented')
assert(ops.includes('Contributed ÷ Assigned'), 'Monthly Baitul Maal contract documented')
assert(ops.includes('Registered ÷ Eligible'), 'App Registration contract documented')
assert(ops.includes('getWeeklyIjtemaDashboardKpi'), 'Weekly Ijtema KPI reused for health/mission')
assert(ops.includes('getMonthlyBaitulMaalDashboardKpi'), 'Monthly Baitul Maal KPI reused for health/mission')

assert(threeColumn.includes('Immediate Priorities'), 'previous Immediate Priorities retained')
assert(threeColumn.includes('Attention Required'), 'previous Attention Required retained')
assert(threeColumn.includes('Pending Actions'), 'previous Pending Actions retained')
assert(threeColumn.includes('exdash-ops-command'), 'previous ops grid retained')
assert(
  /grid-cols-1[\s\S]*md:grid-cols-2[\s\S]*xl:grid-cols-3/.test(css),
  'ops grid is 1 / 2 / 3 columns by breakpoint',
)
assert(css.includes('exdash-action-center'), 'Action Center styles present')
assert(css.includes('exdash-action-center-compact'), 'compact mission card styles present')
assert(css.includes('exdash-action-footer'), 'mission footer styles present')
assert(css.includes('exdash-health-pct-grid'), 'Campaign Health percentage grid styles present')

const returnIdx = command.indexOf('return (')
const healthJsxIdx = command.indexOf('<CampaignHealthPanel', returnIdx)
const missionMarkerIdx = command.indexOf("Today's Mission", healthJsxIdx)
const priorityJsxIdx = command.indexOf('Top Priority Rukns', healthJsxIdx)
const trendsJsxIdx = command.indexOf('<ProgressTrendsPanel', healthJsxIdx)
const timelineJsxIdx = command.indexOf('<ActivityTimeline', healthJsxIdx)
assert(healthJsxIdx > returnIdx, 'Campaign Health rendered in JSX')
assert(missionMarkerIdx > healthJsxIdx, "Today's Mission after Campaign Health")
assert(priorityJsxIdx > missionMarkerIdx, 'Top Priority Rukns after Today\'s Mission')
assert(trendsJsxIdx > priorityJsxIdx, 'Progress Trends after Top Priority Rukns')
assert(timelineJsxIdx > trendsJsxIdx, 'Activity Timeline after Progress Trends')
assert(
  command.indexOf('<AdminActionCenter', healthJsxIdx) > healthJsxIdx,
  "Today's Mission AdminActionCenter after Campaign Health in main stack",
)

assert(sidebar.includes('<Icon name={helpItem.icon}'), 'Help uses Icon component (not raw icon name text)')
assert(
  !sidebar.includes('{helpItem.icon}</span>'),
  'Help no longer renders icon name string beside label',
)

console.log('Dashboard IA structure verification passed (KC-0109 Scope 1).')
