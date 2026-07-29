/**
 * Verify Digital Rafeeq Campaign Intelligence MVP.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  classifyMvpUtterance,
  clearSession,
  deriveCampaignInsights,
  getOrCreateSession,
  getTurnMetricsBundle,
  resetTurnMetricsCache,
  runRafeeqTurn,
} from '../src/conversation/mvp'

type CaseResult = { name: string; passed: boolean; detail: string }

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function run(name: string, fn: () => void): CaseResult {
  try {
    fn()
    return { name, passed: true, detail: 'ok' }
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

function ctx(sessionId: string) {
  return {
    role: 'rukn' as const,
    ruknId: 'rukn-1',
    locale: 'ur' as const,
    sessionId,
  }
}

function testCampaignSummary(): void {
  resetTurnMetricsCache()
  const result = runRafeeqTurn('How is the campaign progressing?', ctx('ci-summary'))
  assert(result.intentCode === 'REPORT', 'report intent')
  assert(result.readOnly === true, 'readOnly')
  assert(result.usedStack === true, 'stack')
  assert(String(result.metadata['summaryTitle'] ?? '').length > 0, 'title')
  const metrics = result.metadata['metrics'] as unknown[]
  assert(Array.isArray(metrics) && metrics.length > 0, 'metrics')
}

function testConnectedMetrics(): void {
  const result = runRafeeqTurn('How many Karkuns are connected?', ctx('ci-conn'))
  assert(result.intentCode === 'REPORT', 'intent')
  assert(/connected|منسلک|Connected/i.test(result.text), 'connected text')
}

function testVisitMetrics(): void {
  assert(
    runRafeeqTurn('How many visits are pending?', ctx('ci-vp')).metadata['topic'] ===
      'visits_pending',
    'pending topic',
  )
  assert(
    runRafeeqTurn('How many visits completed?', ctx('ci-vc')).metadata['topic'] ===
      'visits_completed',
    'completed topic',
  )
}

function testAttendanceAndRegistration(): void {
  assert(
    runRafeeqTurn('Show Weekly Ijtema progress', ctx('ci-ij')).metadata['topic'] === 'ijtema',
    'ijtema',
  )
  assert(
    runRafeeqTurn('Show app registration progress', ctx('ci-reg')).metadata['topic'] ===
      'registration',
    'registration',
  )
  assert(
    runRafeeqTurn('Show Baitul Maal progress', ctx('ci-bm')).metadata['topic'] ===
      'baitul_maal',
    'baitul',
  )
}

function testInsightGeneration(): void {
  resetTurnMetricsCache()
  const insights = deriveCampaignInsights(getTurnMetricsBundle())
  assert(Array.isArray(insights) && insights.length > 0, 'insights')
  const result = runRafeeqTurn('Which campaign metrics need attention?', ctx('ci-att'))
  assert(result.metadata['topic'] === 'attention', 'attention topic')
  assert(Array.isArray(result.metadata['insights']), 'insights meta')
}

function testNavigationActions(): void {
  const result = runRafeeqTurn('Campaign overview', ctx('ci-nav'))
  assert(result.actions.length >= 1, 'actions')
  assert(
    result.actions.some((action) => /campaign|report|registry|ijtema/i.test(action.id)),
    'nav actions',
  )
}

function testArchitectureAndReuse(): void {
  const result = runRafeeqTurn('Show campaign summary', ctx('ci-arch'))
  for (const layer of [
    'intent',
    'secretary',
    'execution_orchestrator',
    'confirmation_orchestrator',
    'execution_pipeline',
    'service_integration_contract',
    'execution_adapter',
    'metrics_service',
  ]) {
    assert(result.layersVisited.includes(layer), layer)
  }
  assert(result.readOnly === true, 'readOnly')
  const sources = result.metadata['sources'] as string[]
  assert(sources.some((s) => /MetricsService|DashboardMetricsService/i.test(s)), 'sources')
}

function testFollowUpContext(): void {
  clearSession('ci-follow')
  runRafeeqTurn('How many visits are pending?', ctx('ci-follow'))
  const memory = getOrCreateSession('ci-follow')
  assert(memory.lastCampaignTopic === 'visits_pending', 'topic memory')
  const why = runRafeeqTurn('Why?', ctx('ci-follow'))
  assert(why.intentCode === 'REPORT', 'why report')
  assert(classifyMvpUtterance('What about attendance?').mvpKind === 'CAMPAIGN_INTEL', 'attendance follow')
}

function testDocs(): void {
  assert(existsSync(resolve('docs/features/rafeeq-campaign-intelligence.md')), 'feature doc')
  assert(
    existsSync(resolve('docs/architecture/kc-rafeeq-campaign-intelligence-arch009-gate.md')),
    'gate',
  )
}

const results = [
  run('campaign summary', testCampaignSummary),
  run('connected metrics', testConnectedMetrics),
  run('visit metrics', testVisitMetrics),
  run('attendance and registration', testAttendanceAndRegistration),
  run('insight generation', testInsightGeneration),
  run('navigation actions', testNavigationActions),
  run('architecture and reuse', testArchitectureAndReuse),
  run('follow-up context', testFollowUpContext),
  run('documentation', testDocs),
]

let failed = 0
for (const result of results) {
  console.log(`[${result.passed ? 'PASS' : 'FAIL'}] ${result.name} — ${result.detail}`)
  if (!result.passed) failed += 1
}
console.log(
  `\nRafeeq campaign intelligence verify: ${results.length - failed}/${results.length} passed`,
)
process.exit(failed === 0 ? 0 : 1)
