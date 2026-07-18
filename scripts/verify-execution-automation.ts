/**
 * KC-020 — Execution Context & Automation Framework verification.
 * Run: npx vite-node scripts/verify-execution-automation.ts
 */

import {
  createAutomationEngine,
  deriveNextBestAction,
  evaluateCampaignObjective,
  presentNextBestActionForRafeeq,
  resetAutomationEngineForTests,
  resetExecutionEventBusForTests,
  type ExecutionEvent,
} from '@/execution'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

type Scenario = { name: string; passed: boolean; detail: string }

function runScenario(name: string, fn: () => string): Scenario {
  try {
    const detail = fn()
    return { name, passed: true, detail }
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

const scenarios: Scenario[] = []

scenarios.push(
  runScenario('phone call success → schedule meeting + Rafeeq Urdu', () => {
    resetAutomationEngineForTests()
    resetExecutionEventBusForTests()
    const events: ExecutionEvent['type'][] = []
    const engine = createAutomationEngine({
      enableLogging: false,
      createId: () => 'exec-phone-1',
    })
    engine.eventBus.subscribe((event) => {
      events.push(event.type)
    })

    const started = engine.start({
      executionType: 'phone_call',
      workerId: 'kr-1',
      ruknId: 'rk-1',
      campaignId: 'camp-1',
      objective: {
        kind: 'first_meeting',
        statement: 'Complete first meeting with assigned workers',
      },
    })
    assert(started.status === 'active', 'context must be active')
    assert(events.includes('ExecutionStarted'), 'ExecutionStarted required')
    assert(events.includes('AutomationTriggered'), 'AutomationTriggered required')
    assert(events.includes('PolicyApplied'), 'PolicyApplied required')

    const completed = engine.complete({
      executionContextId: started.id,
      outcome: {
        code: 'success',
        recordedAt: new Date().toISOString(),
        recordedBy: 'verify',
      },
    })

    assert(completed.context.status === 'completed', 'must complete')
    assert(completed.nextBestAction?.code === 'SCHEDULE_MEETING', 'NBA must be SCHEDULE_MEETING')
    assert(
      completed.objectiveEvaluation?.progress === 'unchanged',
      'phone success prepares meeting but does not complete first_meeting',
    )
    assert(events.includes('ExecutionCompleted'), 'ExecutionCompleted required')
    assert(events.includes('NextBestActionGenerated'), 'NextBestActionGenerated required')
    assert(events.includes('ObjectiveEvaluated'), 'ObjectiveEvaluated required')
    assert(events.includes('ExecutionClosed'), 'ExecutionClosed required')

    const urdu = presentNextBestActionForRafeeq(completed.nextBestAction!)
    assert(urdu.urdu.includes('ملاقات'), 'Rafeeq must present Urdu for SCHEDULE_MEETING')
    assert(urdu.actionCode === 'SCHEDULE_MEETING', 'Rafeeq must not invent a new code')

    engine.dispose()
    return `nba=${completed.nextBestAction!.code}; urdu_ok`
  }),
)

scenarios.push(
  runScenario('no answer → retry contact', () => {
    const action = deriveNextBestAction({
      executionContextId: 'exec-2',
      executionType: 'phone_call',
      outcomeCode: 'no_answer',
    })
    assert(action.code === 'RETRY_CONTACT', 'no_answer → RETRY_CONTACT')
    assert((action.suggestedDelayMinutes ?? 0) > 0, 'retry must suggest delay')
    return String(action.code)
  }),
)

scenarios.push(
  runScenario('wrong number → verify contact', () => {
    const action = deriveNextBestAction({
      executionContextId: 'exec-3',
      executionType: 'phone_call',
      outcomeCode: 'wrong_number',
    })
    assert(action.code === 'VERIFY_CONTACT', 'wrong_number → VERIFY_CONTACT')
    return String(action.code)
  }),
)

scenarios.push(
  runScenario('meeting success advances first_meeting objective', () => {
    const evaluation = evaluateCampaignObjective({
      executionContextId: 'exec-4',
      objectiveKind: 'first_meeting',
      executionType: 'meeting',
      outcome: { code: 'success', recordedAt: new Date().toISOString() },
    })
    assert(evaluation.progress === 'advanced', 'meeting success advances first_meeting')
    const action = deriveNextBestAction({
      executionContextId: 'exec-4',
      executionType: 'meeting',
      outcomeCode: 'success',
    })
    assert(action.code === 'CREATE_FOLLOW_UP', 'meeting success → CREATE_FOLLOW_UP')
    return `${evaluation.progress}/${action.code}`
  }),
)

scenarios.push(
  runScenario('generic policy covers non-phone types', () => {
    resetAutomationEngineForTests()
    resetExecutionEventBusForTests()
    const engine = createAutomationEngine({
      enableLogging: false,
      createId: () => 'exec-meeting-1',
    })
    const started = engine.start({
      executionType: 'meeting',
      workerId: 'kr-2',
      objective: { kind: 'worker_development', statement: 'Improve worker engagement' },
    })
    const result = engine.complete({
      executionContextId: started.id,
      outcome: { code: 'success', recordedAt: new Date().toISOString() },
    })
    assert(result.policyResult.policyId === 'GENERIC_EXECUTION', 'meeting uses generic policy')
    assert(result.nextBestAction?.code === 'CREATE_FOLLOW_UP', 'meeting NBA')
    assert(result.objectiveEvaluation?.progress === 'advanced', 'development advanced')
    engine.dispose()
    return String(result.policyResult.policyId)
  }),
)

scenarios.push(
  runScenario('cancel closes context without NBA requirement', () => {
    const engine = createAutomationEngine({
      enableLogging: false,
      createId: () => 'exec-cancel-1',
    })
    const started = engine.start({
      executionType: 'follow_up',
      objective: { kind: 'generic', statement: 'Follow up' },
    })
    const cancelled = engine.cancel({
      executionContextId: started.id,
      reason: 'user-aborted',
    })
    assert(cancelled.status === 'cancelled', 'must cancel')
    engine.dispose()
    return cancelled.status
  }),
)

const failed = scenarios.filter((s) => !s.passed)
for (const scenario of scenarios) {
  console.log(`${scenario.passed ? 'PASS' : 'FAIL'}  ${scenario.name} — ${scenario.detail}`)
}

if (failed.length > 0) {
  console.error(`\nKC-020 verify failed: ${failed.length}/${scenarios.length}`)
  process.exit(1)
}

console.log(`\nKC-020 verify passed: ${scenarios.length}/${scenarios.length}`)
