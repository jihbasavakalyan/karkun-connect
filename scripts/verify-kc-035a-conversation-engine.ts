/**
 * KC-035A — Conversation engine foundation contracts.
 */
import {
  buildPersonClarification,
  CONVERSATION_ENGINE_STATES,
  CONVERSATION_ENGINE_TRANSITIONS,
  createConversationEngine,
  createConversationStateMachine,
  createEmptyConversationContext,
  forgetCompletedWorkflow,
  getConversationEngine,
  isLegalConversationTransition,
  resetConversationEngineForTests,
  SECRETARY_URDU,
  type ConversationPersonRef,
} from '../src/conversation/engine'
import {
  clearSession,
  getOrCreateSession,
  rememberPerson,
} from '../src/conversation/mvp/session'

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

function testStateMachine(): void {
  assert(CONVERSATION_ENGINE_STATES.length === 9, 'expected 9 states')
  assert(isLegalConversationTransition('idle', 'listening'), 'idle→listening')
  assert(isLegalConversationTransition('understanding', 'clarifying'), 'understanding→clarifying')
  assert(isLegalConversationTransition('executing', 'responding'), 'executing→responding')
  assert(isLegalConversationTransition('responding', 'waiting'), 'responding→waiting')
  assert(isLegalConversationTransition('waiting', 'listening'), 'waiting→listening')
  assert(isLegalConversationTransition('completed', 'idle'), 'completed→idle')
  assert(isLegalConversationTransition('cancelled', 'idle'), 'cancelled→idle')
  assert(!isLegalConversationTransition('idle', 'executing'), 'idle→executing illegal')
  assert(!isLegalConversationTransition('listening', 'responding'), 'listening→responding illegal')

  const sm = createConversationStateMachine()
  const ok = sm.transition('idle', 'listening')
  assert(ok.ok, 'sm idle→listening')
  const bad = sm.transition('idle', 'completed')
  assert(!bad.ok && bad.reason === 'illegal_transition', 'sm rejects illegal')

  for (const from of CONVERSATION_ENGINE_STATES) {
    assert(Array.isArray(CONVERSATION_ENGINE_TRANSITIONS[from]), `transitions for ${from}`)
  }
}

function testSessionPersistence(): void {
  resetConversationEngineForTests()
  const engine = createConversationEngine({ historyLimit: 4 })
  const a = engine.sessions.createSession({
    sessionId: 'kc035a-s1',
    activeUserRole: 'rukn',
    activeUserId: 'rukn-1',
  })
  assert(a.context.conversationState === 'idle', 'starts idle')
  assert(a.context.activeUserRole === 'rukn', 'role stored')

  const t1 = engine.sessions.transition('kc035a-s1', 'listening')
  assert(t1.result.ok, 'to listening')
  assert(t1.session?.context.conversationState === 'listening', 'state listening')

  engine.sessions.setActivePerson('kc035a-s1', {
    personId: 'p1',
    displayName: 'عبدالرحمن',
    kind: 'karkun',
    disambiguator: 'وارڈ ٤',
  })
  engine.sessions.appendHistory('kc035a-s1', {
    role: 'user',
    text: 'عبدالرحمن کی تفصیلات پیش کریں۔',
  })
  engine.sessions.appendHistory('kc035a-s1', {
    role: 'rafeeq',
    text: SECRETARY_URDU.situationBrief,
  })

  const again = engine.sessions.getSession('kc035a-s1')
  assert(again?.context.activePerson?.personId === 'p1', 'person persists')
  assert(again?.history.length === 2, 'history length')

  // Bound history
  engine.sessions.appendHistory('kc035a-s1', { role: 'user', text: '3' })
  engine.sessions.appendHistory('kc035a-s1', { role: 'user', text: '4' })
  engine.sessions.appendHistory('kc035a-s1', { role: 'user', text: '5' })
  assert(engine.sessions.getSession('kc035a-s1')?.history.length === 4, 'history bounded')

  const illegal = engine.sessions.transition('kc035a-s1', 'completed')
  assert(!illegal.result.ok, 'illegal from listening rejected')
  assert(
    engine.sessions.getSession('kc035a-s1')?.context.conversationState === 'listening',
    'state unchanged on illegal',
  )
}

function testContextResolver(): void {
  resetConversationEngineForTests()
  const engine = createConversationEngine()
  engine.sessions.createSession({ sessionId: 'kc035a-r1' })

  const missing = engine.resolver.resolveActivePerson(
    engine.sessions.getSession('kc035a-r1')!.context,
  )
  assert(missing.status === 'missing', 'asks when no person')
  if (missing.status === 'missing') {
    assert(missing.clarification.promptUrdu.includes('کارکن'), 'natural ask')
  }

  engine.sessions.setActivePerson('kc035a-r1', {
    personId: 'abdul',
    displayName: 'عبدالرحمن',
    kind: 'karkun',
  })
  const resolved = engine.resolver.resolveActivePerson(
    engine.sessions.getSession('kc035a-r1')!.context,
  )
  assert(resolved.status === 'resolved', 'resolves without re-ask')
  if (resolved.status === 'resolved') {
    assert(resolved.person.displayName === 'عبدالرحمن', 'same person')
  }

  const candidates: ConversationPersonRef[] = [
    { personId: 'a', displayName: 'عبدالرحمن', kind: 'karkun', disambiguator: 'وارڈ ٤' },
    { personId: 'b', displayName: 'عبدالرحمن', kind: 'karkun', disambiguator: 'وارڈ ٧' },
  ]
  const emptyCtx = createEmptyConversationContext()
  const ambiguous = engine.resolver.resolvePersonAmongCandidates(emptyCtx, candidates)
  assert(ambiguous.status === 'needs_clarification', 'ambiguous needs clarification')
  if (ambiguous.status === 'needs_clarification') {
    assert(
      ambiguous.clarification.promptUrdu.includes(SECRETARY_URDU.ambiguousPersonHeader),
      'header',
    )
    assert(ambiguous.clarification.promptUrdu.includes('وارڈ ٤'), 'option A')
    assert(ambiguous.clarification.promptUrdu.includes('وارڈ ٧'), 'option B')
    assert(ambiguous.clarification.promptUrdu.includes(SECRETARY_URDU.askWhichPerson), 'ask')
  }
}

function testClarificationFramework(): void {
  const clar = buildPersonClarification({
    options: [
      { id: '1', label: 'عبدالرحمن', subtitle: 'وارڈ ٤' },
      { id: '2', label: 'عبدالرحمن', subtitle: 'وارڈ ٧' },
    ],
  })
  assert(clar.reason === 'ambiguous_person', 'reason')
  assert(clar.options.length === 2, 'two options')
  assert(clar.promptUrdu.split('\n').length >= 4, 'multi-line prompt')
}

function testMemoryClear(): void {
  const engine = createConversationEngine()
  engine.sessions.createSession({ sessionId: 'kc035a-m1' })
  engine.sessions.patchContext('kc035a-m1', {
    currentWorkflowId: 'wf-1',
    currentIntent: 'visit.complete',
    lastExecutedAction: 'open',
    nextSuggestedAction: 'save',
    activeCampaignId: 'camp-1',
  })
  engine.sessions.setActivePerson('kc035a-m1', {
    personId: 'p',
    displayName: 'نمونہ',
    kind: 'karkun',
  })
  engine.sessions.completeWorkflow('kc035a-m1')
  const ctx = engine.sessions.getSession('kc035a-m1')!.context
  assert(ctx.currentWorkflowId === null, 'workflow cleared')
  assert(ctx.currentIntent === null, 'intent cleared')
  assert(ctx.activePerson?.personId === 'p', 'person retained')
  assert(ctx.activeCampaignId === 'camp-1', 'campaign retained')

  const forgotten = forgetCompletedWorkflow(ctx)
  assert(forgotten.currentWorkflowId === null, 'helper clears workflow')
}

function testSecretaryStyle(): void {
  assert(SECRETARY_URDU.acknowledge === 'جی۔', 'ack')
  assert(SECRETARY_URDU.saved === 'جی، محفوظ کر دیا گیا۔', 'saved')
  assert(!SECRETARY_URDU.acknowledge.toLowerCase().includes('loading'), 'no loading')
  assert(!Object.values(SECRETARY_URDU).some((v) => /Opening|Processing|Loading/i.test(v)), 'no eng filler')
}

function testMvpBridge(): void {
  resetConversationEngineForTests()
  clearSession('bridge-1')
  clearSession('bridge-2')

  const memory = getOrCreateSession('bridge-1')
  rememberPerson(memory, 'person-9', 'عبدالرحمن')
  assert(memory.lastPersonId === 'person-9', 'mvp person')

  const eng = getConversationEngine().sessions.getSession('bridge-1')
  assert(eng?.context.activePerson?.personId === 'person-9', 'engine synced')
  assert(eng?.context.activePerson?.displayName === 'عبدالرحمن', 'engine name')

  const m2 = getOrCreateSession('bridge-2')
  rememberPerson(m2, 'x', 'ی')
  assert(
    getConversationEngine().sessions.getSession('bridge-2')?.context.activePerson?.personId === 'x',
    'second session',
  )

  clearSession('bridge-1')
  assert(getConversationEngine().sessions.getSession('bridge-1') === null, 'engine cleared')
}

const cases = [
  run('state machine transitions', testStateMachine),
  run('session persistence + history bound', testSessionPersistence),
  run('context resolver', testContextResolver),
  run('clarification framework', testClarificationFramework),
  run('memory clear keeps person/campaign', testMemoryClear),
  run('secretary urdu style', testSecretaryStyle),
  run('mvp bridge sync', testMvpBridge),
]

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-035A',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
if (failed.length > 0) process.exit(1)
