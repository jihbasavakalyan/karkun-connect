/**
 * KC-0131.1 — Unit verification for Digital Rafeeq Conversation Foundation.
 *
 * Covers: lifecycle transitions, session lifecycle, placeholder planning,
 * confirmation models, response models. No integration / Firestore / UI.
 */

import {
  createConfirmationRequest,
  createConversationFoundation,
  createConversationResponse,
  createIntent,
  createIntentCollection,
  createPlaceholderPlanner,
  FOUNDATION_CONVERSATION_STATES,
  FOUNDATION_LIFECYCLE_TRANSITIONS,
  isLegalFoundationTransition,
  withConfirmationDecision,
} from '../src/conversation/foundation'

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

function testLifecycleDefinitions(): void {
  assert(FOUNDATION_CONVERSATION_STATES.length === 6, 'expected 6 states')
  assert(
    FOUNDATION_CONVERSATION_STATES.join(',') ===
      'idle,listening,understanding,planning,awaiting_confirmation,completed',
    'state order mismatch',
  )

  assert(isLegalFoundationTransition('idle', 'listening'), 'idle→listening')
  assert(isLegalFoundationTransition('listening', 'understanding'), 'listening→understanding')
  assert(isLegalFoundationTransition('understanding', 'planning'), 'understanding→planning')
  assert(
    isLegalFoundationTransition('planning', 'awaiting_confirmation'),
    'planning→awaiting_confirmation',
  )
  assert(
    isLegalFoundationTransition('awaiting_confirmation', 'completed'),
    'awaiting_confirmation→completed',
  )
  assert(isLegalFoundationTransition('completed', 'idle'), 'completed→idle')

  assert(!isLegalFoundationTransition('idle', 'completed'), 'idle→completed illegal')
  assert(!isLegalFoundationTransition('listening', 'planning'), 'listening→planning illegal')

  for (const from of FOUNDATION_CONVERSATION_STATES) {
    assert(
      Array.isArray(FOUNDATION_LIFECYCLE_TRANSITIONS[from]),
      `missing transitions for ${from}`,
    )
  }
}

function testLifecycleService(): void {
  const foundation = createConversationFoundation()
  let session = foundation.sessionManager.createSession({ role: 'rukn', locale: 'ur' })
  assert(session.state === 'idle', 'start idle')

  session = foundation.sessionManager.driveToAwaitingConfirmation(session)
  assert(session.state === 'awaiting_confirmation', 'driven to awaiting_confirmation')

  const bad = foundation.lifecycle.transition(session, 'listening')
  assert(!bad.result.success, 'illegal transition rejected')
  assert(bad.session.state === 'awaiting_confirmation', 'state unchanged on failure')

  const { session: completed, result } = foundation.lifecycle.transition(
    session,
    'completed',
  )
  assert(result.success, 'awaiting→completed')
  assert(completed.state === 'completed', 'completed state')
}

function testSessionLifecycle(): void {
  const foundation = createConversationFoundation({ sessionTimeoutMs: 1_000 })
  const created = foundation.sessionManager.createSession({
    role: 'administrator',
    route: '/admin',
  })
  assert(created.id.startsWith('fconv_'), 'session id prefix')
  assert(created.endedAt === null, 'not ended')
  assert(created.context.locale === 'ur', 'default locale ur')

  const reset = foundation.sessionManager.resetContext(created, {
    selectedPersonId: 'k1',
    locale: 'en',
  })
  assert(reset.context.selectedPersonId === 'k1', 'context reset person')
  assert(reset.context.locale === 'en', 'context reset locale')
  assert(reset.activePlan === null, 'plan cleared on reset')

  const cancelled = foundation.sessionManager.cancelSession(reset)
  assert(cancelled.endedAt !== null, 'cancelled endedAt')
  assert(cancelled.endReason === 'cancelled', 'cancel reason')
  assert(cancelled.state === 'idle', 'cancel → idle')

  const again = foundation.sessions.cancel(cancelled)
  assert(!again.success, 'double cancel fails')

  const live = foundation.sessionManager.createSession()
  const timed = foundation.sessionManager.timeoutSession(live)
  assert(timed.endReason === 'timeout', 'timeout reason')

  const short = createConversationFoundation({ sessionTimeoutMs: 10 })
  const s = short.sessions.create()
  const aged = { ...s, lastActivityAt: Date.now() - 50 }
  assert(short.sessions.isTimedOut(aged), 'detect timeout')

  const path = foundation.sessionManager.driveToAwaitingConfirmation(
    foundation.sessionManager.createSession(),
  )
  const done = foundation.sessionManager.completeSession(path)
  assert(done.state === 'completed', 'complete → completed')
  assert(done.endReason === 'completed', 'complete reason')
  assert(done.endedAt !== null, 'complete endedAt')
}

function testPlanningAbstraction(): void {
  const planner = createPlaceholderPlanner()
  const intents = createIntentCollection([
    createIntent({ code: 'daily_briefing', utterance: 'آج کا خلاصہ' }),
    createIntent({ code: 'prepare_call', status: 'raw' }),
  ])
  const plan = planner.plan(intents, {
    role: 'rukn',
    ruknId: 'r1',
    activeCampaignId: null,
    route: null,
    selectedPersonId: null,
    selectedConnectionId: null,
    locale: 'ur',
    channel: 'text',
    extensions: {},
  })

  assert(plan.isPlaceholder, 'plan is placeholder')
  assert(plan.steps.length === 2, 'two steps')
  assert(
    plan.steps.every((step) => step.status === 'placeholder'),
    'all steps placeholder',
  )
  assert(plan.steps[0]?.operationCode.startsWith('placeholder:'), 'opaque op code')

  const empty = planner.plan(createIntentCollection([]), {
    role: null,
    ruknId: null,
    activeCampaignId: null,
    route: null,
    selectedPersonId: null,
    selectedConnectionId: null,
    locale: 'ur',
    channel: 'system',
    extensions: {},
  })
  assert(empty.steps.length === 1, 'empty plan has placeholder step')
  assert(empty.isPlaceholder, 'empty still placeholder')
}

function testConfirmationModels(): void {
  const foundation = createConversationFoundation()
  const plan = foundation.planner.plan(
    createIntentCollection([createIntent({ code: 'navigate' })]),
    foundation.sessionManager.createSession().context,
  )
  const request = foundation.confirmation.requestForPlan(plan)
  assert(request.decision === 'pending', 'pending decision')
  assert(request.planId === plan.id, 'plan linked')
  assert(request.prompt.length > 0, 'prompt present')

  const accepted = foundation.confirmation.accept(request)
  assert(accepted.decision === 'accepted', 'accepted')
  const declined = foundation.confirmation.decline(request)
  assert(declined.decision === 'declined', 'declined')

  const manual = createConfirmationRequest(plan.id, 'confirm?')
  assert(withConfirmationDecision(manual, 'expired').decision === 'expired', 'expired')
}

function testResponseModels(): void {
  const foundation = createConversationFoundation()
  const kinds = [
    foundation.response.informational('info'),
    foundation.response.clarification('clarify'),
    foundation.response.confirmation('confirm?', 'c1', 'p1'),
    foundation.response.completion('done', 'p1'),
    foundation.response.error('error'),
  ] as const

  assert(kinds[0].kind === 'informational', 'informational')
  assert(kinds[1].kind === 'clarification', 'clarification')
  assert(kinds[2].kind === 'confirmation', 'confirmation')
  assert(kinds[2].confirmationId === 'c1', 'confirmation id')
  assert(kinds[2].planId === 'p1', 'confirmation plan')
  assert(kinds[3].kind === 'completion', 'completion')
  assert(kinds[4].kind === 'error', 'error')

  const raw = createConversationResponse('informational', 'x')
  assert(raw.text === 'x', 'factory text')
}

function testNoExecutionSideEffects(): void {
  const foundation = createConversationFoundation()
  const session = foundation.sessionManager.driveToAwaitingConfirmation(
    foundation.sessionManager.createSession({ role: 'rukn' }),
  )
  const plan = foundation.planner.plan(
    createIntentCollection([createIntent({ code: 'send_whatsapp' })]),
    session.context,
  )
  const confirmation = foundation.confirmation.requestForPlan(plan)
  const accepted = foundation.confirmation.accept(confirmation)

  // Architecture-only: accepting confirmation must not mutate business state.
  assert(accepted.decision === 'accepted', 'decision recorded in model only')
  assert(plan.isPlaceholder, 'still placeholder — no execution')
  assert(session.activePlan === null, 'session plan not auto-executed')
}

async function main(): Promise<void> {
  const results: CaseResult[] = [
    run('lifecycle definitions & transitions', testLifecycleDefinitions),
    run('lifecycle service', testLifecycleService),
    run('session lifecycle', testSessionLifecycle),
    run('planning abstraction (placeholder)', testPlanningAbstraction),
    run('confirmation models', testConfirmationModels),
    run('response models', testResponseModels),
    run('no execution side effects', testNoExecutionSideEffects),
  ]

  const failed = results.filter((r) => !r.passed)
  for (const result of results) {
    const mark = result.passed ? 'PASS' : 'FAIL'
    console.log(`[${mark}] ${result.name} — ${result.detail}`)
  }

  if (failed.length > 0) {
    console.error(`\nKC-0131.1 foundation verify failed: ${failed.length}/${results.length}`)
    process.exit(1)
  }

  console.log(`\nKC-0131.1 conversation foundation verify: ${results.length}/${results.length} passed`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
