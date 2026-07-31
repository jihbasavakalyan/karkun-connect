/**
 * KC-035R1 — Digital Rafeeq Operational Recovery verification.
 * Proves: transcript → intent → dialogue → navigation/search → secretary Urdu.
 */
import { resetConversationEngineForTests } from '../src/conversation/engine'
import { resetDialogueEngineForTests } from '../src/dialogue'
import { resetWorkflowEngineForTests } from '../src/workflows'
import { resetVoiceNavigationEngineForTests } from '../src/navigation'
import { IntentCode, recognizeIntent } from '../src/intents'
import { getDigitalRafeeqService } from '../src/runtime/service'
import { intentToNavigationTarget } from '../src/navigation'
import { classifyDialogueMove } from '../src/dialogue'
import { emptyIntentEntities, IntentCategory } from '../src/intents'
import type { IntentRecognitionResult } from '../src/intents'

type CaseResult = { name: string; passed: boolean; detail: string }

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function run(name: string, fn: () => void | Promise<void>): Promise<CaseResult> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => ({ name, passed: true, detail: 'ok' }))
    .catch((error) => ({
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }))
}

function resetAll() {
  resetDialogueEngineForTests()
  resetWorkflowEngineForTests()
  resetConversationEngineForTests()
  resetVoiceNavigationEngineForTests()
  getDigitalRafeeqService().resetForTests()
}

function expectIntent(utterance: string, code: string): void {
  const result = recognizeIntent(utterance)
  assert(
    result.intent === code,
    `"${utterance}" → ${code} (got ${result.intent} / ${result.normalizedUtterance})`,
  )
}

async function testEnglishAcceptanceIntents(): Promise<void> {
  expectIntent('Open Dashboard', IntentCode.NAVIGATE_DASHBOARD)
  expectIntent('Open Karkun Registry', IntentCode.NAVIGATE_WORKERS)
  expectIntent('Open Weekly Ijtema', IntentCode.NAVIGATE_ATTENDANCE)
  expectIntent('Open Monthly Baitul Maal', IntentCode.NAVIGATE_PAYMENT)
  expectIntent('Open Reports', IntentCode.NAVIGATE_REPORTS)
  expectIntent('Open Activities', IntentCode.NAVIGATE_ACTIVITIES)
  expectIntent('Search Mohammad Aslam', IntentCode.FIND_PERSON)
  expectIntent('Show Pending Follow-up', IntentCode.SHOW_PENDING_TASKS)

  const search = recognizeIntent('Search Mohammad Aslam')
  assert(
    search.entities.personName?.toLowerCase().includes('mohammad') ||
      search.entities.personName?.toLowerCase().includes('aslam'),
    `personName extracted (got ${search.entities.personName})`,
  )
}

async function testNavigationTargets(): Promise<void> {
  assert(intentToNavigationTarget(IntentCode.NAVIGATE_DASHBOARD) === 'dashboard', 'dash')
  assert(intentToNavigationTarget(IntentCode.NAVIGATE_WORKERS) === 'registry', 'reg')
  assert(intentToNavigationTarget(IntentCode.NAVIGATE_ATTENDANCE) === 'attendance', 'att')
  assert(intentToNavigationTarget(IntentCode.NAVIGATE_PAYMENT) === 'baitul_maal', 'bm')
  assert(intentToNavigationTarget(IntentCode.NAVIGATE_REPORTS) === 'reports', 'rep')
  assert(intentToNavigationTarget(IntentCode.NAVIGATE_ACTIVITIES) === 'activities', 'act')
  assert(intentToNavigationTarget(IntentCode.SHOW_PENDING_TASKS) === 'follow_up', 'fu')
  assert(intentToNavigationTarget(IntentCode.SHOW_WEEKLY_IJTEMA) === 'attendance', 'ijtema')
}

function synth(
  partial: Partial<IntentRecognitionResult> &
    Pick<IntentRecognitionResult, 'intent' | 'originalUtterance'>,
): IntentRecognitionResult {
  return {
    category: IntentCategory.NAVIGATION,
    confidence: 0.95,
    confidenceBand: 'execute',
    entities: emptyIntentEntities(),
    normalizedUtterance: partial.originalUtterance,
    requiredClarifications: [],
    matchedPatterns: [],
    conversationContext: null,
    ...partial,
  }
}

async function testDialogueRoutesShowToNavigation(): Promise<void> {
  const move = classifyDialogueMove({
    recognition: synth({
      intent: IntentCode.SHOW_PENDING_TASKS,
      originalUtterance: 'Show Pending Follow-up',
      category: IntentCategory.INFORMATION,
    }),
    workflow: {
      sessionId: 'x',
      status: 'idle',
      activeWorkflowId: null,
      pendingConfirmation: null,
      pendingNextAction: null,
      lastCompletedWorkflowId: null,
      updatedAt: 0,
    },
    dialogue: {
      sessionId: 'x',
      interruptStack: [],
      lastMove: null,
      repairIntent: null,
      updatedAt: 0,
    },
    activePersonId: null,
  })
  assert(move === 'route_navigation', `pending move=${move}`)
}

async function testOperationalPipelineCommands(): Promise<void> {
  resetAll()
  const service = getDigitalRafeeqService()
  const actor = {
    role: 'administrator' as const,
    userId: 'admin-1',
    ruknId: 'admin-1',
  }

  const cases: Array<{ utterance: string; expectNav?: boolean; expectSearch?: boolean }> = [
    { utterance: 'Open Dashboard', expectNav: true },
    { utterance: 'Open Karkun Registry', expectNav: true },
    { utterance: 'Open Weekly Ijtema', expectNav: true },
    { utterance: 'Open Monthly Baitul Maal', expectNav: true },
    { utterance: 'Open Reports', expectNav: true },
    { utterance: 'Open Activities', expectNav: true },
    { utterance: 'Show Pending Follow-up', expectNav: true },
    { utterance: 'Search Mohammad Aslam', expectSearch: true },
  ]

  for (const row of cases) {
    const result = await service.processDialogueTurn({
      sessionId: `kc035r1-${row.utterance}`,
      utterance: row.utterance,
      actor,
    })
    assert(result.responseUrdu.trim().length > 0, `${row.utterance}: empty reply`)
    assert(!/^جی۔$/.test(result.responseUrdu.trim()), `${row.utterance}: generic ack only`)
    if (row.expectNav) {
      assert(
        result.kind === 'navigated' || Boolean(result.navigation?.ok),
        `${row.utterance}: expected navigation (kind=${result.kind})`,
      )
      assert(
        Boolean(result.navigation?.route) ||
          result.navigation?.action === 'back' ||
          result.navigation?.action === 'home',
        `${row.utterance}: missing route`,
      )
      assert(
        /کھول|پیش|لے چل|فالو/.test(result.responseUrdu),
        `${row.utterance}: secretary tone missing`,
      )
    }
    if (row.expectSearch) {
      assert(
        result.search != null || result.recognition.intent === IntentCode.FIND_PERSON,
        `${row.utterance}: expected search path`,
      )
      assert(
        result.recognition.intent === IntentCode.FIND_PERSON,
        `${row.utterance}: intent=${result.recognition.intent}`,
      )
    }
  }
}

async function testUrduSecretaryNavCopy(): Promise<void> {
  resetAll()
  const dash = await getDigitalRafeeqService().processDialogueTurn({
    sessionId: 'kc035r1-urdu-dash',
    utterance: 'Open Dashboard',
    actor: { role: 'administrator', userId: 'a1', ruknId: 'a1' },
  })
  assert(
    dash.responseUrdu.includes('ڈیش بورڈ') || dash.responseUrdu.includes('ڈیشبورڈ'),
    `dash urdu=${dash.responseUrdu}`,
  )
  const reg = await getDigitalRafeeqService().processDialogueTurn({
    sessionId: 'kc035r1-urdu-reg',
    utterance: 'Open Karkun Registry',
    actor: { role: 'administrator', userId: 'a1', ruknId: 'a1' },
  })
  assert(reg.responseUrdu.includes('رجسٹری'), `reg urdu=${reg.responseUrdu}`)
}

const cases = await Promise.all([
  run('English acceptance intents', testEnglishAcceptanceIntents),
  run('Navigation target map (incl. activities/follow_up)', testNavigationTargets),
  run('SHOW_PENDING routes to navigation', testDialogueRoutesShowToNavigation),
  run('Operational pipeline acceptance commands', testOperationalPipelineCommands),
  run('Secretary Urdu navigation copy', testUrduSecretaryNavCopy),
])

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-035R1',
      passed: cases.filter((c) => c.passed).length,
      total: cases.length,
      cases,
    },
    null,
    2,
  ),
)
process.exit(failed.length === 0 ? 0 : 1)
