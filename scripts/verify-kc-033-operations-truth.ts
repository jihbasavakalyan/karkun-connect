/**
 * KC-033 — Operations Truth Convergence verification.
 * Asserts production decision paths use canonical providers (not legacy IJ/BM/Health).
 *
 * Run: npm run verify:kc-033
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  CanonicalMetricProviders,
  getCanonicalCampaignHealthOverallPct,
} from '../src/lib/operations/canonicalCampaignMetrics'
import { getCampaignProgress } from '../src/services/campaignService'
import { getDashboardHealthSlices } from '../src/services/dashboardMetricsService'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`)
  console.log(`OK: ${message}`)
}

const ROOT = resolve('.')

function readSrc(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8')
}

// --- Runtime contract ---
const slices = getDashboardHealthSlices()
assert(slices.length === 4, 'Campaign Health exposes four slices')
assert(
  slices.every((s) =>
    ['visits', 'weekly-ijtema', 'monthly-baitul-maal', 'app-registration'].includes(s.id),
  ),
  'Health slice ids match registry',
)

const overall = getCanonicalCampaignHealthOverallPct()
assert(overall >= 0 && overall <= 100, 'canonical overall health pct in range')
assert(
  typeof CanonicalMetricProviders.weeklyIjtema.getKpi === 'function',
  'WI KPI provider registered',
)
assert(
  typeof CanonicalMetricProviders.baitulMaal.getKpi === 'function',
  'BM KPI provider registered',
)

const progress = getCampaignProgress()
assert(progress >= 0 && progress <= 100, 'getCampaignProgress returns pct in range')

// --- Static: automation must not import legacy IJ/BM/Health for decisions ---
const automation = readSrc('src/services/campaignAutomationEngine.ts')
assert(
  !automation.includes('getCampaignHealthFromAnnexure1'),
  'automation does not import annexure Health overall',
)
assert(
  !automation.includes('getIjtemaAttendanceDashboardMetrics'),
  'automation does not use legacy IJ dashboard metrics',
)
assert(
  !automation.includes('getAllIjtemaAttendanceSummaries'),
  'automation does not use legacy IJ summaries',
)
assert(
  !automation.includes('getBaitulMaalDashboardMetrics'),
  'automation does not use legacy BM dashboard metrics',
)
assert(
  !automation.includes('getAllBaitulMaalSummaries'),
  'automation does not use legacy BM summaries',
)
assert(
  automation.includes('canonicalCampaignMetrics') ||
    automation.includes('CanonicalMetricProviders'),
  'automation imports canonical metric providers',
)

// --- Static: campaign progress aligned to canonical Health ---
const campaignService = readSrc('src/services/campaignService.ts')
assert(
  campaignService.includes('getCanonicalCampaignHealthOverallPct'),
  'getCampaignProgress uses canonical Health overall',
)
assert(
  !campaignService.includes('getCampaignHealthFromAnnexure1'),
  'campaignService no longer calls annexure Health overall',
)

// --- Static: turn metrics cache ---
const turnCache = readSrc('src/conversation/mvp/turnMetricsCache.ts')
assert(
  !turnCache.includes('getIjtemaAttendanceDashboardMetrics'),
  'turnMetricsCache does not use legacy IJ dashboard metrics',
)
assert(
  turnCache.includes('getDashboardWeeklyIjtemaHealthSlice'),
  'turnMetricsCache keeps canonical WI Health slice',
)

// --- Facade present ---
const facade = readSrc('src/lib/operations/canonicalCampaignMetrics.ts')
assert(facade.includes('CanonicalMetricProviders'), 'canonical facade exports registry')
assert(facade.includes('getCanonicalCampaignHealthOverallPct'), 'overall helper present')

// --- Registry doc ---
const registry = readSrc('docs/architecture/kc-033-canonical-metric-registry.md')
assert(registry.includes('getDashboardHealthSlices'), 'registry documents Health provider')
assert(registry.includes('weeklyIjtemaReadAdapter'), 'registry documents WI adapter')
assert(registry.includes('monthlyBaitulMaalReadAdapter'), 'registry documents BM adapter')

console.log('\nKC-033 Operations Truth Convergence — PASS')
