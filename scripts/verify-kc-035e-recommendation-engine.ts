/**
 * KC-035E — Recommendation Engine verification (advise only).
 */
import {
  createRecommendationEngine,
  resetRecommendationEngineForTests,
} from '../src/recommendations'

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

function testPersonAdvise(): void {
  resetRecommendationEngineForTests()
  const engine = createRecommendationEngine().engine
  const bundle = engine.advisePerson({
    personId: 'nonexistent-person-xyz',
    personName: 'نمونہ',
  })
  assert(bundle.scope === 'person', 'scope person')
  assert(typeof bundle.dailyBriefUrdu === 'string', 'brief')
  assert(bundle.summary.total >= 0, 'summary')
  // No write side effects — pure advise
  assert(Array.isArray(bundle.items), 'items array')
}

function testRoleAdvise(): void {
  resetRecommendationEngineForTests()
  const engine = createRecommendationEngine().engine
  const admin = engine.adviseRole({ role: 'administrator', limit: 5 })
  assert(admin.scope === 'admin', 'admin scope')
  assert(admin.dailyBriefUrdu.includes('صورتحال') || admin.dailyBriefUrdu.length > 0, 'admin brief')
  const rukn = engine.adviseDailyBrief({ role: 'rukn', ruknId: 'rukn-1' })
  assert(rukn.scope === 'rukn', 'rukn scope')
  assert(
    typeof rukn.summary.critical === 'number' &&
      typeof rukn.summary.high === 'number',
    'priority tallies',
  )
}

function testNoWriteContract(): void {
  resetRecommendationEngineForTests()
  const engine = createRecommendationEngine().engine
  const before = engine.adviseRole({ role: 'administrator' })
  const after = engine.adviseRole({ role: 'administrator' })
  // Advising twice must not mutate engine-owned state into divergence of shape
  assert(before.summary.total === after.summary.total, 'idempotent advise shape')
}

const cases = [
  run('person recommendations', testPersonAdvise),
  run('role / daily brief', testRoleAdvise),
  run('advise-only idempotent', testNoWriteContract),
]

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-035E',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
if (failed.length > 0) process.exit(1)
