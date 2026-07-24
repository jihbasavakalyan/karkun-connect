/**
 * Dashboard information architecture contract (structure only).
 * Run: npx vite-node scripts/verify-dashboard-ia-structure.ts
 *
 * Today's Mission is an experiment refinement of Action Center.
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
assert(hero.includes('Campaign Achievement Progress'), 'achievement progress remains in Hero')
assert(!command.includes('Campaign Health'), 'Campaign Health section removed')
assert(!command.includes('Campaign Pulse'), 'Campaign Pulse section removed')
assert(command.includes('Collective Overview'), 'Collective Overview present')

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

const returnIdx = command.indexOf('return (')
const missionJsxIdx = command.indexOf('<AdminActionCenter', returnIdx)
const collectiveJsxIdx = command.indexOf('Collective Overview', returnIdx)
const liveJsxIdx = command.indexOf('<LiveActivityFeed', returnIdx)
assert(missionJsxIdx > returnIdx, "Today's Mission rendered in JSX")
assert(collectiveJsxIdx > missionJsxIdx, 'Collective Overview after Today\'s Mission (execution first)')
assert(liveJsxIdx > collectiveJsxIdx, 'Live Activity after reporting overview')

assert(sidebar.includes('<Icon name={helpItem.icon}'), 'Help uses Icon component (not raw icon name text)')
assert(
  !sidebar.includes('{helpItem.icon}</span>'),
  'Help no longer renders icon name string beside label',
)

console.log('Dashboard IA structure verification passed.')
