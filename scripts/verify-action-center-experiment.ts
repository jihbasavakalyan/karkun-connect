/**
 * Today's Mission / Action Center experiment contract (presentation only).
 * Run: npx vite-node scripts/verify-action-center-experiment.ts
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ADMIN_TODAYS_MISSION_TOP_N,
  buildAdminActionCenterItems,
} from '../src/lib/missionControl/adminDashboardOpsExperiment'
import { adminAllTasksPath } from '../src/constants/routes'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`)
  console.log(`OK: ${message}`)
}

assert(ADMIN_TODAYS_MISSION_TOP_N === 5, 'top N is 5')
assert(adminAllTasksPath() === '/admin?view=all-tasks', 'all-tasks path is /admin?view=all-tasks')

const ordered = buildAdminActionCenterItems({
  alerts: [
    {
      id: 'a-medium',
      severity: 'medium',
      title: 'Weekly Ijtema Pending',
      message: '23 attendance records need updating.',
      route: '/admin/compliance',
    },
    {
      id: 'a-high',
      severity: 'high',
      title: 'Overdue Follow-ups',
      message: '5 follow-ups are past due.',
      route: '/admin/follow-up',
    },
    {
      id: 'a-low',
      severity: 'low',
      title: 'Visit Reports',
      message: '12 reports awaiting submission.',
      route: '/admin/execution',
    },
    {
      id: 'a-reg',
      severity: 'medium',
      title: 'App Registration',
      message: '8 registrations are pending.',
      route: '/admin/compliance',
    },
    {
      id: 'a-extra',
      severity: 'low',
      title: 'Extra Watch Item',
      message: 'Should be sixth when sorted.',
      route: '/admin/execution',
    },
    {
      id: 'a-extra-2',
      severity: 'low',
      title: 'Another Watch Item',
      message: 'Should be seventh.',
      route: '/admin/execution',
    },
  ],
  interventions: [
    {
      id: 'alert-a-high',
      severity: 'critical',
      title: 'Overdue Follow-ups',
      detail: '5 follow-ups are past due.',
      route: '/admin/follow-up',
    },
    {
      id: 'followups-overdue',
      severity: 'critical',
      title: 'Overdue follow-ups aggregate',
      detail: '5 follow-ups past due',
      route: '/admin/follow-up',
    },
    {
      id: 'baitul',
      severity: 'attention',
      title: 'Monthly Baitul Maal',
      detail: '17 members have not been marked this month.',
      route: '/admin/compliance',
    },
  ],
})

assert(ordered[0]?.severity === 'critical', 'critical items sort first')
assert(ordered.some((item) => item.title === 'Overdue Follow-ups'), 'alert items included')
assert(
  ordered.filter((item) => item.title === 'Overdue Follow-ups').length === 1,
  'alert-prefixed interventions are deduped by title',
)
assert(
  ordered.findIndex((i) => i.severity === 'critical') <
    ordered.findIndex((i) => i.severity === 'high'),
  'critical before high',
)
assert(
  ordered.findIndex((i) => i.severity === 'high') <
    ordered.findIndex((i) => i.severity === 'medium'),
  'high before medium',
)

const top5 = ordered.slice(0, ADMIN_TODAYS_MISSION_TOP_N)
assert(top5.length === 5, 'homepage slice yields 5 items when queue is larger')
assert(ordered.length > 5, 'full queue has more than top 5')

const baitul = ordered.find((item) => item.title === 'Monthly Baitul Maal')
assert(Boolean(baitul), 'intervention-only items included')
assert(baitul?.actionLabel === 'Review', 'baitul maal uses Review action')
assert(baitul?.count === 17, 'count badge extracted from description')

const overdue = ordered.find((item) => item.title === 'Overdue Follow-ups')
assert(overdue?.actionLabel === 'View', 'overdue critical uses View')
assert(overdue?.severityLabel === 'Critical', 'high alert maps to Critical label')

const ui = readFileSync(
  resolve('src/components/mission-control/AdminActionCenter.tsx'),
  'utf8',
)
assert(ui.includes("Today's Mission"), "UI renamed to Today's Mission")
assert(ui.includes('Tasks requiring your attention today'), 'subtitle updated')
assert(ui.includes('View All Tasks →'), 'footer CTA present')
assert(ui.includes("slice(0, ADMIN_TODAYS_MISSION_TOP_N)"), 'summary variant slices to top N')
assert(ui.includes("variant = 'summary'"), 'summary is default variant')
assert(
  readFileSync(resolve('src/components/mission-control/AdminCommandCenter.tsx'), 'utf8').includes(
    'variant="full"',
  ),
  'full queue variant wired from command center',
)

assert(
  readFileSync(resolve('src/components/mission-control/AdminCommandCenter.tsx'), 'utf8').includes(
    'buildAdminInterventionQueue',
  ),
  'interventions still built from existing helper',
)
assert(
  readFileSync(resolve('src/components/mission-control/AdminOpsThreeColumnLayout.tsx'), 'utf8')
    .includes('Immediate Priorities'),
  'previous three-column implementation preserved',
)

console.log('Action Center experiment verification passed.')
