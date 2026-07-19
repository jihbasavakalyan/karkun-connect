/**
 * KC-0059 — Daily Report Engine contract checks.
 * Ensures the feature stays a read-only consumer and does not touch hydration.
 * Run: npx vite-node scripts/verify-kc0059-daily-report.ts
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ARKAAN_DAILY_REPORT_TEMPLATES,
  getArkaanDailyReportTemplate,
} from '../src/data/dailyReports/arkanTemplates'
import { renderDailyReportBody } from '../src/lib/dailyReports/renderDailyReport'
import { toDailyReportPlaceholders } from '../src/services/dailyReportService'
import type { DailyReportMetricsSnapshot } from '../src/types/dailyReport'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const serviceSource = readFileSync(resolve('src/services/dailyReportService.ts'), 'utf8')
const initializeSource = readFileSync(
  resolve('src/repositories/firestore/initialize.ts'),
  'utf8',
)
const metricsSource = readFileSync(resolve('src/services/metricsService.ts'), 'utf8')
const authSource = readFileSync(resolve('src/providers/AuthProvider.tsx'), 'utf8')
const adminHomeSource = readFileSync(resolve('src/pages/admin/AdminHomePage.tsx'), 'utf8')

assert(
  serviceSource.includes('getCampaignConnectionMetrics'),
  'DailyReportService must consume MetricsService',
)
assert(
  !serviceSource.includes('saveState') &&
    !serviceSource.includes('replaceAll') &&
    !serviceSource.includes('clearAssignment'),
  'DailyReportService must remain read-only',
)
assert(
  !initializeSource.includes('dailyReport') &&
    !initializeSource.includes('DailyReport'),
  'initialize.ts must not be coupled to Daily Reports',
)
assert(
  !metricsSource.includes('dailyReport') && !metricsSource.includes('DailyReport'),
  'MetricsService must not be modified for Daily Reports',
)
assert(
  !authSource.includes('dailyReport') && !authSource.includes('DailyReport'),
  'AuthProvider must not be modified for Daily Reports',
)
assert(
  !adminHomeSource.includes('dailyReport') && !adminHomeSource.includes('DailyReport'),
  'AdminHomePage must not be modified for Daily Reports',
)

assert(ARKAAN_DAILY_REPORT_TEMPLATES.length === 3, 'expected 3 Arkaan templates')
assert(getArkaanDailyReportTemplate('daily-progress'), 'daily-progress template missing')
assert(getArkaanDailyReportTemplate('motivation'), 'motivation template missing')
assert(getArkaanDailyReportTemplate('final-push'), 'final-push template missing')

const sampleMetrics: DailyReportMetricsSnapshot = {
  campaignName: 'Test Campaign',
  day: 3,
  daysLeft: 6,
  dayLabel: 'Day 3 of 9',
  total: 493,
  connected: 46,
  remaining: 447,
  progress: 9,
  todayVisits: 2,
  pendingVisits: 40,
  followUps: 3,
  development: 20,
  compliance: 55,
  sourceOfTruth: 'DailyReportService',
}
const placeholders = toDailyReportPlaceholders(sampleMetrics)
const rendered = renderDailyReportBody(
  getArkaanDailyReportTemplate('daily-progress')!.body,
  placeholders,
)
assert(rendered.includes('Test Campaign'), 'campaignName placeholder failed')
assert(rendered.includes('46'), 'connected placeholder failed')
assert(rendered.includes('447'), 'remaining placeholder failed')
assert(rendered.includes('9٪') || rendered.includes('9%'), 'progress placeholder failed')
assert(!rendered.includes('{{'), 'unresolved placeholders remain')

const navSource = readFileSync(resolve('src/lib/communicationNavigation.ts'), 'utf8')
assert(navSource.includes("'daily-reports'"), 'communication nav must include daily-reports')

console.log('KC-0059 verify OK', {
  templates: ARKAAN_DAILY_REPORT_TEMPLATES.map((t) => t.id),
  readOnly: true,
  hydrationUntouched: true,
})
