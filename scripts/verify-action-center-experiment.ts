/**
 * Action Center experiment contract (presentation only).
 * Run: npx vite-node scripts/verify-action-center-experiment.ts
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildAdminActionCenterItems } from '../src/lib/missionControl/adminDashboardOpsExperiment'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`)
  console.log(`OK: ${message}`)
}

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
  ordered.some((item) => item.title === 'Overdue follow-ups aggregate'),
  'distinct intervention titles still included',
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

const baitul = ordered.find((item) => item.title === 'Monthly Baitul Maal')
assert(Boolean(baitul), 'intervention-only items included')
assert(baitul?.actionLabel === 'Review', 'baitul maal uses Review action')
assert(baitul?.count === 17, 'count badge extracted from description')

const overdue = ordered.find((item) => item.title === 'Overdue Follow-ups')
assert(overdue?.actionLabel === 'View', 'overdue critical uses View')
assert(overdue?.severityLabel === 'Critical', 'high alert maps to Critical label')

const command = readFileSync(
  resolve('src/components/mission-control/AdminCommandCenter.tsx'),
  'utf8',
)
assert(
  command.includes('buildAdminInterventionQueue'),
  'interventions still built from existing helper',
)
assert(
  readFileSync(resolve('src/components/mission-control/AdminOpsThreeColumnLayout.tsx'), 'utf8')
    .includes('Immediate Priorities'),
  'previous three-column implementation preserved',
)

console.log('Action Center experiment verification passed.')
