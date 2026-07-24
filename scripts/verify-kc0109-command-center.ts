/**
 * KC-0109 Scope 1 — Campaign Operations Command Center metric / IA contract.
 * Run: npx vite-node scripts/verify-kc0109-command-center.ts
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildCampaignOperationsHealthMetrics,
  buildTodaysMissionOperationalItems,
  buildTopPriorityRukns,
  buildActivityTimeline,
  buildCampaignOperationsTrends,
} from '../src/lib/missionControl/campaignOperationsCommandCenter'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`)
  console.log(`OK: ${message}`)
}

const health = buildCampaignOperationsHealthMetrics()
assert(health.length === 4, 'Campaign Health has 4 metrics')
assert(
  health.map((m) => m.id).join(',') ===
    'visits,weekly-ijtema,monthly-baitul-maal,app-registration',
  'Campaign Health metric ids match contract',
)
for (const metric of health) {
  assert(typeof metric.pct === 'number' && metric.pct >= 0 && metric.pct <= 100, `${metric.id} pct in range`)
}

const mission = buildTodaysMissionOperationalItems()
const allowedTitles = new Set([
  'Pending Weekly Ijtema submissions',
  'Pending Monthly Baitul Maal submissions',
  'Overdue visits',
  'Pending app registrations',
])
for (const item of mission) {
  assert(allowedTitles.has(item.title), `mission item allowed: ${item.title}`)
}

const priority = buildTopPriorityRukns(5)
for (let i = 1; i < priority.length; i += 1) {
  assert(
    priority[i - 1]!.priorityScore <= priority[i]!.priorityScore,
    'priority Rukns sorted ascending by score',
  )
}

const trends = buildCampaignOperationsTrends()
assert(trends.length >= 1, 'Progress Trends returns items')

const timeline = buildActivityTimeline(5)
assert(Array.isArray(timeline), 'Activity Timeline returns array')

const command = readFileSync(
  resolve('src/components/mission-control/AdminCommandCenter.tsx'),
  'utf8',
)
assert(command.includes('CampaignHealthPanel'), 'Campaign Health panel mounted')
assert(command.includes('Top Priority Rukns'), 'Top Priority Rukns mounted')
assert(command.includes('ProgressTrendsPanel'), 'Progress Trends mounted')
assert(command.includes('ActivityTimeline'), 'Activity Timeline mounted')
assert(!command.includes('Collective Overview'), 'no Collective Overview duplicate')
assert(!command.includes('WeeklyIjtemaDashboardKpiCard'), 'no duplicate Weekly Ijtema card')
assert(!command.includes('MonthlyBaitulMaalDashboardKpiCard'), 'no duplicate Baitul Maal card')

console.log('KC-0109 Campaign Operations Command Center verification passed.')
