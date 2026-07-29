/**
 * Verify Digital Rafeeq MVP bridge + search + navigation.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  classifyUtterance,
  clearSession,
  createRafeeqMvpFoundation,
  getOrCreateSession,
  isPronounReference,
  rememberPerson,
  resolveNavigationTarget,
  runRafeeqTurn,
  searchPeopleReadOnly,
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
    role: 'administrator' as const,
    ruknId: null,
    locale: 'ur' as const,
    sessionId,
  }
}

function testClassify(): void {
  assert(classifyUtterance('Find Aslam').intentCodes[0] === 'SEARCH', 'search')
  assert(classifyUtterance('Open Dashboard').intentCodes[0] === 'NAVIGATION', 'nav')
  assert(
    classifyUtterance('Open Dashboard').navigationTarget === 'dashboard',
    'nav target',
  )
  assert(classifyUtterance('How many connected?').intentCodes[0] === 'REPORT', 'report')
  assert(classifyUtterance('??? 42 ##').intentCodes[0] === 'UNKNOWN', 'unknown')
}

function testBridgeReport(): void {
  const result = runRafeeqTurn('How many connected?', ctx('t-report'))
  assert(result.usedStack === true, 'stack')
  assert(result.usedFallback === false, 'no fallback')
  assert(result.intentCode === 'REPORT', 'report intent')
  assert(result.readOnly === true, 'readOnly')
  assert(result.layersVisited.includes('metrics_service'), 'metrics layer')
  assert(result.text.includes('منسلک') || result.text.length > 0, 'text')
}

function testSearchPath(): void {
  const result = runRafeeqTurn('Find NobodyXYZ123', ctx('t-search'))
  assert(result.intentCode === 'SEARCH', 'search intent')
  assert(result.usedStack === true, 'stack')
  assert(result.usedFallback === false, 'no fallback')
  assert(result.layersVisited.includes('confirmation_orchestrator'), 'confirm')
  assert(result.layersVisited.includes('execution_pipeline'), 'pipeline')
  assert(result.layersVisited.includes('execution_adapter'), 'adapter')
  assert(Array.isArray(searchPeopleReadOnly('')), 'search fn')
}

function testNavigationPath(): void {
  const result = runRafeeqTurn('Open Settings', ctx('t-nav'))
  assert(result.intentCode === 'NAVIGATION', 'nav intent')
  assert(result.usedFallback === false, 'no fallback')
  assert(result.actions.length === 1, 'one action')
  assert(result.actions[0]!.route.includes('settings'), 'settings route')
  const mapped = resolveNavigationTarget('campaign', 'administrator')
  assert(mapped?.route.includes('campaign'), 'campaign map')
}

function testFallbackUnknown(): void {
  const result = runRafeeqTurn('??? !!! ### 999', ctx('t-unk'))
  assert(result.usedFallback === true, 'fallback')
  assert(result.intentCode === 'UNKNOWN', 'unknown')
}

function testDocs(): void {
  assert(
    existsSync(resolve('docs/architecture/digital-rafeeq-mvp.md')),
    'mvp doc',
  )
  assert(
    existsSync(resolve('docs/architecture/kc-rafeeq-mvp-arch009-gate.md')),
    'gate',
  )
}

function testFoundation(): void {
  const f = createRafeeqMvpFoundation()
  assert(typeof f.runTurn === 'function', 'runTurn')
  assert(f.classify('Go to Registry').intentCodes[0] === 'NAVIGATION', 'classify')
  assert(f.classify('Help').mvpKind === 'HELP', 'help kind')
}

function testHelpTasksSuggest(): void {
  assert(runRafeeqTurn('Help', ctx('t-help')).intentCode === 'HELP', 'help')
  assert(runRafeeqTurn('What should I do today?', ctx('t-task')).intentCode === 'FOLLOW_UP', 'task')
  assert(
    runRafeeqTurn('Suggest who should I contact', ctx('t-sug')).metadata['suggestionsOnly'] ===
      true,
    'suggest',
  )
}

function testSafeCall(): void {
  const result = runRafeeqTurn('Call someone', ctx('t-call'))
  assert(result.intentCode === 'CALL', 'call')
  assert(result.requiresConfirmation === true, 'needs confirm')
  assert(result.layersVisited.includes('confirmation_orchestrator'), 'confirm layer')
}

function testMemoryAndObservability(): void {
  const sessionId = 't-memory'
  clearSession(sessionId)
  const memory = getOrCreateSession(sessionId)
  rememberPerson(memory, 'p1', 'Imran')
  assert(isPronounReference('ان کا'), 'urdu pronoun')
  const call = runRafeeqTurn('Call ان کا', ctx(sessionId))
  assert(call.intentCode === 'CALL', 'pronoun call intent')
  assert(
    typeof (call.metadata['observability'] as { durationMs?: number } | undefined)
      ?.durationMs === 'number',
    'obs duration',
  )
  assert(
    (call.metadata['undo'] as { kind?: string } | undefined)?.kind === 'noop',
    'undo interface',
  )
}

const results = [
  run('classify', testClassify),
  run('bridge report', testBridgeReport),
  run('search path', testSearchPath),
  run('navigation path', testNavigationPath),
  run('fallback unknown', testFallbackUnknown),
  run('help tasks suggest', testHelpTasksSuggest),
  run('safe call', testSafeCall),
  run('memory observability', testMemoryAndObservability),
  run('documentation', testDocs),
  run('foundation', testFoundation),
]

let failed = 0
for (const result of results) {
  console.log(`[${result.passed ? 'PASS' : 'FAIL'}] ${result.name} — ${result.detail}`)
  if (!result.passed) failed += 1
}
console.log(
  `\nKC Rafeeq MVP bridge/search/nav verify: ${results.length - failed}/${results.length} passed`,
)
process.exit(failed === 0 ? 0 : 1)
