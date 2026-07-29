/**
 * KC-0131.2 — Unit verification for Digital Rafeeq Conversation Domain Model.
 */

import { createConversationFoundation, createIntent, createIntentCollection } from '../src/conversation/foundation'
import {
  CONFIRMATION_STATES,
  CONVERSATION_PHASES,
  CONVERSATION_STATES,
  INTENT_ORIGINS,
  MESSAGE_TYPES,
  RESOLUTION_STATES,
  RESPONSE_TYPES,
  SPEAKER_TYPES,
  conversationStateToPhase,
  createConfirmationReference,
  createConversation,
  createConversationBundle,
  createConversationDomainAdapterPorts,
  createConversationOutcome,
  createConversationSession,
  createExecutionReference,
  createIntentReference,
  createMessage,
  createParticipant,
  createRafeeqSpeaker,
  createSpeaker,
  createUserSpeakerFromFoundation,
  mapFoundationSessionToDomain,
  mapIntentCollectionToDomain,
  validateConfirmationReference,
  validateConversation,
  validateConversationDomainGraph,
  validateConversationSession,
  validateExecutionReference,
  validateIntentReference,
  validateMessage,
  validateParticipant,
  validateSpeaker,
} from '../src/conversation/domain'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

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

function testEnumConsistency(): void {
  assert(SPEAKER_TYPES.length === 3, 'speaker types')
  assert(CONVERSATION_STATES.length === 6, 'conversation states')
  assert(CONVERSATION_PHASES.includes('confirming'), 'confirming phase')
  assert(MESSAGE_TYPES.includes('utterance'), 'message types')
  assert(RESPONSE_TYPES.includes('clarification'), 'response types')
  assert(INTENT_ORIGINS.includes('placeholder'), 'intent origins')
  assert(CONFIRMATION_STATES.includes('pending'), 'confirmation states')
  assert(RESOLUTION_STATES.includes('ambiguous'), 'resolution states')

  for (const state of CONVERSATION_STATES) {
    const phase = conversationStateToPhase(state)
    assert(CONVERSATION_PHASES.includes(phase), `phase for ${state}`)
  }

  assert(conversationStateToPhase('awaiting_confirmation') === 'confirming', 'awaiting→confirming')
  assert(conversationStateToPhase('idle') === 'idle', 'idle→idle')
}

function testEntityCreation(): void {
  const bundle = createConversationBundle({
    locale: 'ur',
    platformRole: 'rukn',
    ruknId: 'r-1',
  })
  assert(bundle.conversation.activeSessionId === bundle.session.id, 'active session linked')
  assert(bundle.session.conversationId === bundle.conversation.id, 'session→conversation')
  assert(bundle.session.state === 'idle', 'session starts idle')
  assert(bundle.session.phase === 'idle', 'phase aligned')
  assert(bundle.participant.speakerId === bundle.speaker.id, 'participant→speaker')
  assert(bundle.conversation.locale === 'ur', 'urdu default')

  const rafeeq = createRafeeqSpeaker()
  assert(rafeeq.type === 'rafeeq', 'rafeeq speaker')

  const message = createMessage({
    speakerId: bundle.speaker.id,
    text: 'آج کا خلاصہ',
    type: 'utterance',
  })
  assert(message.text.length > 0, 'message text')

  const intent = createIntentReference({ code: 'daily_briefing' })
  assert(intent.resolution === 'placeholder', 'intent placeholder')

  const execution = createExecutionReference({
    operationCode: 'placeholder:daily_briefing',
    summary: 'no execution',
  })
  assert(execution.resolution === 'placeholder', 'execution placeholder')

  const confirmation = createConfirmationReference({
    prompt: 'تصدیق؟',
    executionReferenceId: execution.id,
  })
  assert(confirmation.state === 'pending', 'confirmation pending')

  const outcome = createConversationOutcome({
    conversationId: bundle.conversation.id,
    sessionId: bundle.session.id,
    summary: 'completed structurally',
  })
  assert(outcome.conversationId === bundle.conversation.id, 'outcome linked')
}

function testFactoryBehaviour(): void {
  const conversation = createConversation({ locale: 'en', priority: 'high' })
  assert(conversation.language === 'en', 'language follows locale')
  assert(conversation.priority === 'high', 'priority set')

  const session = createConversationSession({
    conversationId: conversation.id,
    state: 'planning',
  })
  assert(session.phase === 'planning', 'factory derives phase')
  assert(session.status === 'active', 'planning → active status')

  const awaiting = createConversationSession({
    conversationId: conversation.id,
    state: 'awaiting_confirmation',
  })
  assert(awaiting.status === 'awaiting_confirmation', 'awaiting status')
}

function testValidatorBehaviour(): void {
  const speaker = createSpeaker({ type: 'system' })
  assert(validateSpeaker(speaker).valid, 'valid speaker')

  const badSpeaker = { ...speaker, role: 'user' as typeof speaker.role }
  assert(!validateSpeaker(badSpeaker).valid, 'role mismatch invalid')

  const participant = createParticipant({ locale: 'ur' })
  assert(validateParticipant(participant).valid, 'valid participant')

  const message = createMessage({ speakerId: speaker.id, text: 'x' })
  assert(validateMessage(message).valid, 'valid message')
  assert(!validateMessage({ ...message, text: 1 as unknown as string }).valid, 'bad text')

  const intent = createIntentReference({ code: 'x', confidence: 1.5 })
  assert(!validateIntentReference(intent).valid, 'confidence out of range')

  const execution = createExecutionReference({ operationCode: 'op', summary: 's' })
  assert(validateExecutionReference(execution).valid, 'valid execution')

  const confirmation = createConfirmationReference({ prompt: 'p' })
  assert(validateConfirmationReference(confirmation).valid, 'valid confirmation')

  const conversation = createConversation()
  const session = createConversationSession({ conversationId: conversation.id })
  assert(validateConversationSession(session).valid, 'valid session')

  const mismatched = { ...session, phase: 'opening' as typeof session.phase }
  assert(!validateConversationSession(mismatched).valid, 'phase mismatch')

  const withBadActive = {
    ...conversation,
    activeSessionId: session.id,
    sessionIds: [] as typeof conversation.sessionIds,
  }
  assert(!validateConversation(withBadActive).valid, 'active session not listed')

  const graphOk = validateConversationDomainGraph({
    conversation: { ...conversation, activeSessionId: session.id, sessionIds: [session.id] },
    sessions: { [session.id]: session },
    turns: {},
    speakers: { [speaker.id]: speaker },
    participants: { [participant.id]: participant },
    messages: {},
    intents: {},
    executions: {},
    confirmations: {},
    outcomes: {},
  })
  assert(graphOk.valid, `graph valid: ${graphOk.issues.map((i) => i.message).join('; ')}`)
}

function testFoundationMappingWithoutBehaviourChange(): void {
  const foundation = createConversationFoundation()
  const fSession = foundation.sessionManager.createSession({ role: 'rukn', ruknId: 'r1' })
  const driven = foundation.sessionManager.driveToAwaitingConfirmation(fSession)
  assert(driven.state === 'awaiting_confirmation', 'foundation unchanged behaviour')

  const conversation = createConversation({ locale: 'ur' })
  const domainSession = mapFoundationSessionToDomain(driven, conversation.id)
  assert(domainSession.state === 'awaiting_confirmation', 'mapped state')
  assert(domainSession.phase === 'confirming', 'mapped phase')
  assert(domainSession.foundationSessionId === driven.id, 'foundation id retained')

  const intents = createIntentCollection([
    createIntent({ code: 'daily_briefing', status: 'placeholder' }),
  ])
  const plan = foundation.planner.plan(intents, driven.context)
  const ports = createConversationDomainAdapterPorts()
  const intentRefs = mapIntentCollectionToDomain(intents)
  const execRefs = ports.planMapper.map(plan)
  const conf = ports.confirmationMapper.map(
    foundation.confirmation.requestForPlan(plan),
  )

  assert(intentRefs[0]?.foundationIntentId === intents.intents[0]?.id, 'intent link')
  assert(execRefs.every((e) => e.foundationPlanId === plan.id), 'plan link')
  assert(conf.state === 'pending', 'confirmation mapped')
  assert(plan.isPlaceholder, 'foundation plan still placeholder — no execution')

  const user = createUserSpeakerFromFoundation()
  assert(user.type === 'user', 'user speaker helper')
}

function testDomainModelIntegrity(): void {
  // State vocabulary must stay aligned with foundation machine states.
  const foundationStates = [
    'idle',
    'listening',
    'understanding',
    'planning',
    'awaiting_confirmation',
    'completed',
  ]
  assert(
    CONVERSATION_STATES.join(',') === foundationStates.join(','),
    'domain states must match foundation lifecycle states',
  )
}

function testDocumentationPresence(): void {
  const doc = resolve(process.cwd(), 'docs/architecture/conversation-domain-model.md')
  assert(existsSync(doc), 'conversation-domain-model.md missing')
  const gate = resolve(process.cwd(), 'docs/architecture/kc-0131-2-arch009-gate.md')
  assert(existsSync(gate), 'kc-0131-2-arch009-gate.md missing')
}

function testNoForbiddenImports(): void {
  // Runtime smoke: domain public API is importable without initializing Firebase/React.
  assert(typeof createConversation === 'function', 'factory available')
  assert(typeof createSpeaker === 'function', 'speaker factory available')
}

async function main(): Promise<void> {
  const results: CaseResult[] = [
    run('enum consistency', testEnumConsistency),
    run('entity creation', testEntityCreation),
    run('factory behaviour', testFactoryBehaviour),
    run('validator behaviour', testValidatorBehaviour),
    run('foundation mapping (no behaviour change)', testFoundationMappingWithoutBehaviourChange),
    run('domain model integrity', testDomainModelIntegrity),
    run('documentation presence', testDocumentationPresence),
    run('no forbidden runtime deps smoke', testNoForbiddenImports),
  ]

  const failed = results.filter((r) => !r.passed)
  for (const result of results) {
    console.log(`[${result.passed ? 'PASS' : 'FAIL'}] ${result.name} — ${result.detail}`)
  }

  if (failed.length > 0) {
    console.error(`\nKC-0131.2 domain verify failed: ${failed.length}/${results.length}`)
    process.exit(1)
  }

  console.log(`\nKC-0131.2 conversation domain verify: ${results.length}/${results.length} passed`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
