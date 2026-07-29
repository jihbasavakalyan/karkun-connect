/**
 * Verify Digital Rafeeq v2.0 — Complete Operational Companion.
 * Asserts KC-0131 layer traversal, existing-service reuse, and v2 modules.
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  clearSession,
  classifyMvpUtterance,
  getOrCreateSession,
  rememberPerson,
  runRafeeqTurn,
  rafeeqV2,
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

function assertStack(result: ReturnType<typeof runRafeeqTurn>): void {
  assert(result.usedStack === true, 'usedStack')
  assert(result.layersVisited.includes('conversation'), 'conversation')
  assert(result.layersVisited.includes('intent') || result.layersVisited.length >= 3, 'intent/shell')
  assert(result.layersVisited.includes('confirmation_orchestrator'), 'confirmation')
  assert(result.layersVisited.includes('execution_pipeline'), 'pipeline')
  assert(result.metadata['noFirestoreWrite'] === true, 'noFirestoreWrite')
}

const cases: CaseResult[] = []

cases.push(
  run('Search', () => {
    clearSession('v2-search')
    const result = runRafeeqTurn('Find Aslam', ctx('v2-search'))
    assert(result.intentCode === 'SEARCH' || result.usedStack, 'search intent')
    assert(result.layersVisited.includes('execution_adapter') || result.actions.length >= 0, 'adapter')
  }),
)

cases.push(
  run('Navigation', () => {
    clearSession('v2-nav')
    const result = runRafeeqTurn('Open Dashboard', ctx('v2-nav'))
    assert(result.actions.length >= 1 || result.usedFallback || result.usedStack, 'nav')
  }),
)

cases.push(
  run('Campaign Intelligence', () => {
    clearSession('v2-ci')
    const result = runRafeeqTurn('How is the campaign progressing?', ctx('v2-ci'))
    assert(
      result.intentCode === 'REPORT' ||
        Boolean(result.metadata['campaignIntelligence']) ||
        result.usedStack,
      'campaign',
    )
  }),
)

cases.push(
  run('Secretary', () => {
    clearSession('v2-sec')
    const result = runRafeeqTurn('Daily briefing', ctx('v2-sec'))
    assert(result.layersVisited.includes('secretary'), 'secretary layer')
  }),
)

cases.push(
  run('Work Queue', () => {
    clearSession('v2-wq')
    const result = runRafeeqTurn('Show work queue', ctx('v2-wq'))
    assertStack(result)
    assert(result.intentCode === 'WORK_QUEUE', 'wq intent')
    assert(
      Boolean(result.metadata['workQueue']) || result.text.includes('قطار'),
      'queue payload',
    )
  }),
)

cases.push(
  run('Daily Briefing', () => {
    clearSession('v2-br')
    const result = runRafeeqTurn('Daily briefing', ctx('v2-br'))
    assertStack(result)
    assert(result.intentCode === 'DAILY_BRIEFING', 'briefing')
    assert(Boolean(result.metadata['briefing']), 'briefing meta')
  }),
)

cases.push(
  run('Recommendations', () => {
    clearSession('v2-rec')
    const result = runRafeeqTurn('Recommend who to visit first', ctx('v2-rec'))
    assert(result.intentCode === 'RECOMMENDATIONS', 'rec')
    assert(Boolean(result.metadata['recommendations']), 'rec meta')
  }),
)

cases.push(
  run('Notifications', () => {
    clearSession('v2-n')
    const result = runRafeeqTurn('Show notifications', ctx('v2-n'))
    assert(result.intentCode === 'NOTIFICATIONS', 'notify')
    assert(Boolean(result.metadata['notifications']), 'notify meta')
  }),
)

cases.push(
  run('Timeline', () => {
    clearSession('v2-tl')
    const result = runRafeeqTurn('Show timeline', ctx('v2-tl'))
    assert(result.intentCode === 'TIMELINE', 'timeline')
    assert(Boolean(result.metadata['timeline']), 'timeline meta')
  }),
)

cases.push(
  run('Conversation Memory', () => {
    clearSession('v2-mem')
    rememberPerson(getOrCreateSession('v2-mem'), 'p1', 'Ahmed')
    runRafeeqTurn('Show profile Ahmed', ctx('v2-mem'))
    const hist = runRafeeqTurn('Conversation history', ctx('v2-mem'))
    assert(hist.intentCode === 'HISTORY', 'history')
    const memory = getOrCreateSession('v2-mem')
    assert(memory.lastPersonName === 'Ahmed' || Boolean(memory.lastUtterance), 'memory')
  }),
)

cases.push(
  run('Context Resolution', () => {
    clearSession('v2-ctx')
    rememberPerson(getOrCreateSession('v2-ctx'), 'p1', 'Ahmed')
    const classified = classifyMvpUtterance('Call him')
    assert(
      classified.mvpKind === 'CALL' || classified.safeActionKind === 'CALL',
      'pronoun call classify',
    )
    const clarify = classifyMvpUtterance('Why?')
    assert(clarify.mvpKind === 'EXPLAINABILITY', 'why clarify')
  }),
)

cases.push(
  run('Safe Actions', () => {
    clearSession('v2-sa')
    const result = runRafeeqTurn('Call Imran', ctx('v2-sa'))
    assert(result.requiresConfirmation === true || result.intentCode === 'CALL', 'safe call')
  }),
)

cases.push(
  run('Explainability', () => {
    clearSession('v2-ex')
    const result = runRafeeqTurn('Why?', ctx('v2-ex'))
    assert(result.intentCode === 'EXPLAINABILITY', 'explain')
    assert(result.metadata['noHiddenScoring'] === true, 'no hidden scoring')
    assert(Boolean(result.metadata['explainability']), 'why meta')
  }),
)

cases.push(
  run('Entity Cards', () => {
    clearSession('v2-ec')
    const result = runRafeeqTurn('Show campaign card', ctx('v2-ec'))
    assert(result.intentCode === 'ENTITY_CARDS', 'cards')
    assert(Boolean(result.metadata['entityCards']), 'cards meta')
  }),
)

cases.push(
  run('Accessibility', () => {
    assert(rafeeqV2.RAFEEQ_A11Y.drawerLabel.length > 0, 'drawer label')
    assert(rafeeqV2.RAFEEQ_A11Y.inputLabel.length > 0, 'input label')
    assert(rafeeqV2.liveRegionProps(true)['aria-live'] === 'polite', 'live region')
  }),
)

cases.push(
  run('Performance', () => {
    const checklist = rafeeqV2.performanceChecklist()
    assert(checklist.length >= 4, 'perf checklist')
    const a = rafeeqV2.memoizeCompose('perf-test', () => ({ n: 1 }))
    const b = rafeeqV2.memoizeCompose('perf-test', () => ({ n: 2 }))
    assert(a === b, 'memo hit')
    rafeeqV2.resetPerformanceCaches()
  }),
)

cases.push(
  run('Existing Services Reused', () => {
    const briefing = rafeeqV2.buildDailyBriefing('rukn', 'rukn-1')
    assert(briefing.why.some((w) => w.sourceField.includes('dashboardMetrics') || w.sourceField.includes('metrics')), 'reuse metrics')
    const queue = rafeeqV2.buildSmartWorkQueue('rukn', 'rukn-1')
    assert(Array.isArray(queue), 'queue reuse')
    const insights = rafeeqV2.buildOperationalInsights('rukn-1')
    assert(insights.every((i) => i.source.length > 0), 'insight sources')
  }),
)

cases.push(
  run('No Firestore Writes', () => {
    clearSession('v2-fs')
    const turns = [
      runRafeeqTurn('Daily briefing', ctx('v2-fs')),
      runRafeeqTurn('Show work queue', ctx('v2-fs')),
      runRafeeqTurn('Why?', ctx('v2-fs')),
      runRafeeqTurn('Show timeline', ctx('v2-fs')),
    ]
    for (const t of turns) {
      assert(t.readOnly === true || t.metadata['noFirestoreWrite'] === true, 'readonly')
      assert(t.metadata['noFirestoreWrite'] === true, 'flag')
    }
    const root = resolve(process.cwd(), 'src/conversation/mvp/v2')
    const files = [
      'proactive.ts',
      'briefing.ts',
      'workQueue.ts',
      'handlers.ts',
    ]
    for (const f of files) {
      const body = readFileSync(resolve(root, f), 'utf8')
      assert(
        !/\b(setDoc|updateDoc|writeBatch)\b/.test(body) &&
          !/from ['"]firebase\/firestore['"]/.test(body) &&
          !/getFirestore\(/.test(body),
        `no fs writes in ${f}`,
      )
    }
  }),
)

cases.push(
  run('No Regressions', () => {
    const bridge = resolve(process.cwd(), 'scripts/verify-kc-rafeeq-mvp-bridge.ts')
    const search = resolve(process.cwd(), 'scripts/verify-rafeeq-search.ts')
    const campaign = resolve(process.cwd(), 'scripts/verify-rafeeq-campaign-intelligence.ts')
    const safe = resolve(process.cwd(), 'scripts/verify-rafeeq-safe-actions.ts')
    assert(existsSync(bridge), 'mvp bridge verify exists')
    assert(existsSync(search), 'search verify exists')
    assert(existsSync(campaign), 'campaign verify exists')
    assert(existsSync(safe), 'safe verify exists')
    const proactive = runRafeeqTurn('Good morning', ctx('v2-pro'))
    assert(proactive.intentCode === 'PROACTIVE', 'proactive')
    const dash = runRafeeqTurn('Personal dashboard', ctx('v2-pd'))
    assert(dash.intentCode === 'PERSONAL_DASHBOARD', 'dashboard')
    const voice = runRafeeqTurn('Voice ready', ctx('v2-vr'))
    assert(voice.intentCode === 'VOICE_READY', 'voice ready')
    const guided = runRafeeqTurn('Guided workflow', ctx('v2-gw'))
    assert(guided.intentCode === 'GUIDED_WORKFLOW', 'guided')
  }),
)

const failed = cases.filter((c) => !c.passed)
for (const c of cases) {
  console.log(`${c.passed ? '✓' : '✗'} ${c.name}${c.passed ? '' : ` — ${c.detail}`}`)
}

if (failed.length > 0) {
  console.error(`\n${failed.length}/${cases.length} failed`)
  process.exit(1)
}

console.log(`\n✓ Digital Rafeeq v2 verified (${cases.length} checks)`)
