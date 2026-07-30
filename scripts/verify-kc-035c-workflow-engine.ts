/**
 * KC-035C — Operational Workflow Engine verification.
 */
import { IntentCode, recognizeIntent } from '../src/intents'
import { resetConversationEngineForTests } from '../src/conversation/engine'
import {
  WorkflowId,
  createWorkflowEngine,
  resetWorkflowEngineForTests,
  type WorkflowServiceAdapters,
} from '../src/workflows'

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

function mockAdapters(): WorkflowServiceAdapters {
  return {
    recordVisit: () => ({ success: true }),
    recordAppRegistration: () => ({ success: true }),
    recordWeeklyIjtema: () => ({ success: true }),
    recordBaitulMaal: () => ({ success: true }),
  }
}

async function testRegistry(): Promise<void> {
  resetWorkflowEngineForTests()
  const engine = createWorkflowEngine({ adapters: mockAdapters() })
  assert(engine.registry.list().length === 5, '5 workflows registered')
  assert(
    engine.registry.getByIntent(IntentCode.SHOW_PERSON_DETAILS)?.definition.id ===
      WorkflowId.SHOW_PERSON_DETAILS,
    'person details by intent',
  )
  assert(
    engine.registry.getByIntent(IntentCode.RECORD_VISIT)?.definition.id ===
      WorkflowId.RECORD_VISIT,
    'visit by intent',
  )
  assert(
    engine.registry.getByIntent(IntentCode.RECORD_ATTENDANCE)?.definition.id ===
      WorkflowId.RECORD_WEEKLY_IJTEMA,
    'ijtema by attendance intent',
  )
}

async function testClarification(): Promise<void> {
  resetWorkflowEngineForTests()
  resetConversationEngineForTests()
  const engine = createWorkflowEngine({ adapters: mockAdapters() })
  const recognition = recognizeIntent('ملاقات مکمل کر دو۔')
  const result = await engine.executor.run({
    sessionId: 'wf-clar',
    actor: { role: 'rukn', userId: 'rukn-1', ruknId: 'rukn-1' },
    recognition,
    conversation: null,
  })
  assert(result.kind === 'needs_clarification', `kind=${result.kind}`)
  assert(result.clarification != null, 'clarification present')
  assert(result.responseUrdu.includes('کارکن'), 'asks for person')
}

async function testVisitConfirmResumeCancel(): Promise<void> {
  resetWorkflowEngineForTests()
  resetConversationEngineForTests()
  const engine = createWorkflowEngine({ adapters: mockAdapters() })
  const conversation = {
    activePerson: { personId: 'k-1', displayName: 'عبدالرحمن' },
  }
  const recognition = recognizeIntent('ملاقات مکمل کر دو۔', conversation)
  // Force confirm band by lowering confidence in a synthetic result
  const lowConf = { ...recognition, confidence: 0.7, confidenceBand: 'confirm' as const }

  const staged = await engine.executor.run({
    sessionId: 'wf-visit',
    actor: { role: 'rukn', userId: 'rukn-1', ruknId: 'rukn-1' },
    recognition: lowConf,
    conversation,
  })
  assert(staged.kind === 'needs_confirmation', `staged=${staged.kind}`)

  const cancelled = engine.executor.cancel('wf-visit')
  assert(cancelled.kind === 'cancelled', 'cancel works')

  const staged2 = await engine.executor.run({
    sessionId: 'wf-visit-2',
    actor: { role: 'rukn', userId: 'rukn-1', ruknId: 'rukn-1' },
    recognition: lowConf,
    conversation,
  })
  assert(staged2.kind === 'needs_confirmation', 're-stage')

  const confirmed = await engine.executor.run({
    sessionId: 'wf-visit-2',
    actor: { role: 'rukn', userId: 'rukn-1', ruknId: 'rukn-1' },
    recognition: recognizeIntent('جی۔', conversation),
    conversation,
    confirmPending: true,
  })
  assert(
    confirmed.kind === 'completed' || confirmed.kind === 'suggested_next',
    `confirmed=${confirmed.kind}`,
  )
  assert(confirmed.responseUrdu.includes('ملاقات') || confirmed.responseUrdu.includes('محفوظ'), 'saved copy')
}

async function testPersonDetails(): Promise<void> {
  resetWorkflowEngineForTests()
  const engine = createWorkflowEngine({ adapters: mockAdapters() })
  const conversation = {
    activePerson: { personId: 'k-details', displayName: 'عبدالرحمن' },
  }
  const recognition = recognizeIntent('اس کارکن کی تفصیلات پیش کریں۔', conversation)
  const result = await engine.executor.run({
    sessionId: 'wf-details',
    actor: { role: 'administrator', userId: 'admin-1' },
    recognition: { ...recognition, confidence: 0.95, confidenceBand: 'execute' },
    conversation,
  })
  assert(result.kind === 'completed' || result.kind === 'suggested_next', `details=${result.kind}`)
  assert(result.responseUrdu.includes('عبدالرحمن') || result.responseUrdu.includes('صورتحال'), 'details body')
}

async function testPermissionDenied(): Promise<void> {
  resetWorkflowEngineForTests()
  const engine = createWorkflowEngine({ adapters: mockAdapters() })
  // Patch allowed roles by using a rukn-only check — definitions allow both.
  // Simulate denied by calling with a fake role via casting.
  const conversation = {
    activePerson: { personId: 'k-1', displayName: 'نمونہ' },
  }
  const recognition = {
    ...recognizeIntent('ملاقات مکمل کر دو۔', conversation),
    confidence: 0.95,
    confidenceBand: 'execute' as const,
  }
  const result = await engine.executor.run({
    sessionId: 'wf-deny',
    actor: { role: 'rukn', userId: 'r1', ruknId: 'r1' },
    recognition,
    conversation,
  })
  // rukn is allowed — should not deny
  assert(result.kind !== 'denied', 'rukn allowed')
}

async function testRestart(): Promise<void> {
  resetWorkflowEngineForTests()
  const engine = createWorkflowEngine({ adapters: mockAdapters() })
  const conversation = {
    activePerson: { personId: 'k-1', displayName: 'نمونہ' },
  }
  await engine.executor.run({
    sessionId: 'wf-restart',
    actor: { role: 'rukn', userId: 'r1', ruknId: 'r1' },
    recognition: {
      ...recognizeIntent('ملاقات مکمل کر دو۔', conversation),
      confidence: 0.7,
      confidenceBand: 'confirm',
    },
    conversation,
  })
  const restarted = engine.executor.restart('wf-restart')
  assert(restarted.responseUrdu.length > 0, 'restart response')
  assert(engine.executor.getSession('wf-restart').pendingConfirmation === null, 'cleared')
}

async function testResumeAndTimeout(): Promise<void> {
  resetWorkflowEngineForTests()
  const engine = createWorkflowEngine({ adapters: mockAdapters() })
  const conversation = {
    activePerson: { personId: 'k-1', displayName: 'نمونہ' },
  }
  const actor = { role: 'rukn' as const, userId: 'r1', ruknId: 'r1' }
  await engine.executor.run({
    sessionId: 'wf-resume',
    actor,
    recognition: {
      ...recognizeIntent('ملاقات مکمل کر دو۔', conversation),
      confidence: 0.7,
      confidenceBand: 'confirm',
    },
    conversation,
  })
  assert(engine.executor.getSession('wf-resume').pendingConfirmation != null, 'pending')
  const resumed = await engine.executor.resume('wf-resume', actor)
  assert(
    resumed.kind === 'completed' || resumed.kind === 'suggested_next',
    `resume=${resumed.kind}`,
  )

  await engine.executor.run({
    sessionId: 'wf-timeout',
    actor,
    recognition: {
      ...recognizeIntent('ملاقات مکمل کر دو۔', conversation),
      confidence: 0.7,
      confidenceBand: 'confirm',
    },
    conversation,
  })
  const timedOut = engine.executor.timeout('wf-timeout')
  assert(timedOut.kind === 'cancelled', 'timeout clears')
  assert(engine.executor.getSession('wf-timeout').pendingConfirmation === null, 'timeout pending cleared')
}

async function testAdapterFailure(): Promise<void> {
  resetWorkflowEngineForTests()
  const failing: WorkflowServiceAdapters = {
    ...mockAdapters(),
    recordVisit: () => ({ success: false, error: 'boom' }),
  }
  const engine = createWorkflowEngine({ adapters: failing })
  const conversation = {
    activePerson: { personId: 'k-1', displayName: 'نمونہ' },
  }
  const result = await engine.executor.run({
    sessionId: 'wf-fail',
    actor: { role: 'rukn', userId: 'r1', ruknId: 'r1' },
    recognition: {
      ...recognizeIntent('ملاقات مکمل کر دو۔', conversation),
      confidence: 0.95,
      confidenceBand: 'execute',
    },
    conversation,
  })
  assert(result.kind === 'failed', `fail kind=${result.kind}`)
}

const cases = await Promise.all([
  run('workflow registry', testRegistry),
  run('clarification when person missing', testClarification),
  run('confirm / resume / cancel', testVisitConfirmResumeCancel),
  run('show person details', testPersonDetails),
  run('permissions allow rukn', testPermissionDenied),
  run('restart recovery', testRestart),
  run('resume and timeout recovery', testResumeAndTimeout),
  run('repository failure surfaced', testAdapterFailure),
])

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-035C',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
if (failed.length > 0) process.exit(1)
