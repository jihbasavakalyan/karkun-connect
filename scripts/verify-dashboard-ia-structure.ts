/**
 * Dashboard information architecture contract (structure only).
 * Run: npx vite-node scripts/verify-dashboard-ia-structure.ts
 *
 * Action Center is an experiment. Previous three-column layout is retained
 * in AdminOpsThreeColumnLayout for easy restore.
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
assert(command.includes('AdminActionCenter'), 'Command center renders Action Center experiment')
assert(command.includes('AdminOpsThreeColumnLayout'), 'previous three-column layout still wired for restore')
assert(actionCenter.includes('Action Center'), 'Action Center title present')
assert(
  actionCenter.includes('Everything requiring action, ordered by urgency.'),
  'Action Center subtitle present',
)
assert(experiment.includes('buildAdminActionCenterItems'), 'Action Center item builder present')
assert(experiment.includes("'Critical'"), 'Critical severity label present')
assert(experiment.includes("'High'"), 'High severity label present')
assert(experiment.includes("'Medium'"), 'Medium severity label present')

assert(threeColumn.includes('Immediate Priorities'), 'previous Immediate Priorities retained')
assert(threeColumn.includes('Attention Required'), 'previous Attention Required retained')
assert(threeColumn.includes('Pending Actions'), 'previous Pending Actions retained')
assert(threeColumn.includes('exdash-ops-command'), 'previous ops grid retained')
assert(threeColumn.includes('exdash-ops-column'), 'previous ops columns retained')
assert(threeColumn.includes('exdash-ops-column-body'), 'previous column scroll bodies retained')
assert(
  /grid-cols-1[\s\S]*md:grid-cols-2[\s\S]*xl:grid-cols-3/.test(css),
  'ops grid is 1 / 2 / 3 columns by breakpoint',
)
assert(css.includes('exdash-action-center'), 'Action Center styles present')
assert(css.includes('exdash-action-list'), 'Action Center list styles present')

const collectiveIdx = command.indexOf('Collective Overview')
const actionCenterImportIdx = command.indexOf('AdminActionCenter')
assert(collectiveIdx > 0, 'Collective Overview found')
assert(actionCenterImportIdx > 0, 'Action Center referenced in command center')

assert(sidebar.includes('<Icon name={helpItem.icon}'), 'Help uses Icon component (not raw icon name text)')
assert(
  !sidebar.includes('{helpItem.icon}</span>'),
  'Help no longer renders icon name string beside label',
)

console.log('Dashboard IA structure verification passed.')
