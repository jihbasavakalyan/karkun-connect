/**
 * Dashboard information architecture contract (structure only).
 * Run: npx vite-node scripts/verify-dashboard-ia-structure.ts
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
const sidebar = readFileSync(resolve('src/components/layout/AdminSidebar.tsx'), 'utf8')
const ccHero = readFileSync(
  resolve('src/components/command-center/CommandCenterHero.tsx'),
  'utf8',
)

assert(!hero.includes('Campaign Command Center'), 'Hero has no Campaign Command Center')
assert(!command.includes('Campaign Command Center'), 'Command center has no Campaign Command Center')
assert(!ccHero.includes('Campaign Command Center'), 'legacy hero has no Campaign Command Center')
assert(hero.includes('exdash-hero-banner'), 'Urdu campaign banner present')
assert(hero.includes('dir="rtl"'), 'banner is RTL for Urdu title')
assert(hero.includes('Campaign Achievement Progress'), 'achievement progress remains in Hero')
assert(!command.includes('Campaign Health'), 'Campaign Health section removed')
assert(!command.includes('Campaign Pulse'), 'Campaign Pulse section removed')
assert(command.includes('Collective Overview'), 'Collective Overview present')
assert(command.includes('Immediate Priorities'), 'Immediate Priorities present')
assert(command.includes('Attention Required'), 'Attention Required present')
assert(command.includes('Pending Actions'), 'Pending Actions present')
assert(command.includes('exdash-ops-command'), 'operational sections use command-center grid')
assert(command.includes('exdash-ops-column'), 'each operational section is a column')
assert(command.includes('exdash-ops-column-body'), 'each column has independent scroll body')
assert(
  /grid-cols-1[\s\S]*md:grid-cols-2[\s\S]*xl:grid-cols-3/.test(
    readFileSync(resolve('src/index.css'), 'utf8'),
  ),
  'ops grid is 1 / 2 / 3 columns by breakpoint',
)

const collectiveIdx = command.indexOf('Collective Overview')
const immediateIdx = command.indexOf('Immediate Priorities')
const attentionIdx = command.indexOf('Attention Required')
const pendingIdx = command.indexOf('Pending Actions')
assert(collectiveIdx > 0, 'Collective Overview found')
assert(immediateIdx > collectiveIdx, 'Immediate Priorities after Collective Overview')
assert(attentionIdx > immediateIdx, 'Attention Required after Immediate Priorities')
assert(pendingIdx > attentionIdx, 'Pending Actions after Attention Required')

assert(sidebar.includes('<Icon name={helpItem.icon}'), 'Help uses Icon component (not raw icon name text)')
assert(
  !sidebar.includes('{helpItem.icon}</span>'),
  'Help no longer renders icon name string beside label',
)

console.log('Dashboard IA structure verification passed.')
