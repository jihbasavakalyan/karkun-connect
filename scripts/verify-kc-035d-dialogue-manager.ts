/**
 * KC-035D — Dialogue Manager verification.
 */
import { resetConversationEngineForTests } from '../src/conversation/engine'
import {
  IntentCode,
  IntentCategory,
  emptyIntentEntities,
  recognizeIntent,
  type IntentRecognitionResult,
} from '../src/intents'
import {
  createWorkflowEngine,
  resetWorkflowEngineForTests,
  type WorkflowServiceAdapters,
} from '../src/workflows'
import {
  createDialogueEngine,
  resetDialogueEngineForTests,
  classifyDialogueMove,
  isCorrectionUtterance,
} from '../src/dialogue'

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

function resetAll() {
  resetDialogueEngineForTests()
  resetWorkflowEngineForTests()
  resetConversationEngineForTests()
}

function synth(
  partial: Partial<IntentRecognitionResult> &
    Pick<IntentRecognitionResult, 'intent' | 'originalUtterance'>,
): IntentRecognitionResult {
  return {
    category: IntentCategory.UPDATES,
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

async function testMoveClassifier(): Promise<void> {
  assert(isCorrectionUtterance('نہیں وہ نہیں، دوسرا عبدالرحمن'), 'correction')
  const move = classifyDialogueMove({
    recognition: synth({
      intent: IntentCode.CANCEL,
      originalUtterance: 'روکو',
      category: IntentCategory.CONVERSATION,
    }),
    workflow: {
      sessionId: 'x',
      status: 'awaiting_confirmation',
      activeWorkflowId: null,
      pendingConfirmation: {
        workflowId: 'RECORD_VISIT' as never,
        intent: IntentCode.RECORD_VISIT,
        personId: 'k1',
        personName: 'نمونہ',
      },
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
    activePersonId: 'k1',
  })
  assert(move === 'cancel', `move=${move}`)
}

async function testCancelRestartResume(): Promise<void> {
  resetAll()
  const workflows = createWorkflowEngine({ adapters: mockAdapters() })
  const dialogue = createDialogueEngine({ workflows })
  const actor = { role: 'rukn' as const, userId: 'r1', ruknId: 'r1' }
  const conversation = {
    activePerson: { personId: 'k-1', displayName: 'عبدالرحمن' },
  }

  await dialogue.manager.turn({
    sessionId: 'dlg-ctrl',
    utterance: 'ملاقات مکمل کر دو۔',
    actor,
    recognition: {
      ...recognizeIntent('ملاقات مکمل کر دو۔', conversation),
      confidence: 0.7,
      confidenceBand: 'confirm',
      conversationContext: conversation,
    },
  })

  const cancelled = await dialogue.manager.turn({
    sessionId: 'dlg-ctrl',
    utterance: 'روکو',
    actor,
  })
  assert(cancelled.move === 'cancel', `cancel move=${cancelled.move}`)
  assert(cancelled.kind === 'cancelled', 'cancelled kind')

  await dialogue.manager.turn({
    sessionId: 'dlg-ctrl-2',
    utterance: 'ملاقات مکمل کر دو۔',
    actor,
    recognition: {
      ...recognizeIntent('ملاقات مکمل کر دو۔', conversation),
      confidence: 0.7,
      confidenceBand: 'confirm',
      conversationContext: conversation,
    },
  })
  const resumed = await dialogue.manager.turn({
    sessionId: 'dlg-ctrl-2',
    utterance: 'جی۔',
    actor,
  })
  assert(
    resumed.move === 'resume' ||
      resumed.kind === 'executed' ||
      resumed.kind === 'suggested_next',
    `resume=${resumed.move}/${resumed.kind}`,
  )

  await dialogue.manager.turn({
    sessionId: 'dlg-restart',
    utterance: 'ملاقات مکمل کر دو۔',
    actor,
    recognition: {
      ...recognizeIntent('ملاقات مکمل کر دو۔', conversation),
      confidence: 0.7,
      confidenceBand: 'confirm',
      conversationContext: conversation,
    },
  })
  const restarted = await dialogue.manager.turn({
    sessionId: 'dlg-restart',
    utterance: 'شروع سے',
    actor,
  })
  assert(restarted.move === 'restart', `restart=${restarted.move}`)
}

async function testInterrupt(): Promise<void> {
  resetAll()
  const workflows = createWorkflowEngine({ adapters: mockAdapters() })
  const dialogue = createDialogueEngine({ workflows })
  const actor = { role: 'rukn' as const, userId: 'r1', ruknId: 'r1' }
  const conversation = {
    activePerson: { personId: 'k-1', displayName: 'عبدالرحمن' },
  }

  await dialogue.manager.turn({
    sessionId: 'dlg-int',
    utterance: 'ملاقات مکمل کر دو۔',
    actor,
    recognition: {
      ...recognizeIntent('ملاقات مکمل کر دو۔', conversation),
      confidence: 0.7,
      confidenceBand: 'confirm',
      conversationContext: conversation,
    },
  })

  const interrupted = await dialogue.manager.turn({
    sessionId: 'dlg-int',
    utterance: 'اس کارکن کی تفصیلات پیش کریں۔',
    actor,
    recognition: {
      ...recognizeIntent('اس کارکن کی تفصیلات پیش کریں۔', conversation),
      confidence: 0.95,
      confidenceBand: 'execute',
      conversationContext: conversation,
    },
  })
  assert(interrupted.move === 'interrupt', `int move=${interrupted.move}`)
  assert(interrupted.kind === 'interrupted', 'interrupted kind')
  assert(interrupted.responseUrdu.includes('روک'), 'interrupt ack')
}

async function testSwitchAndCorrect(): Promise<void> {
  resetAll()
  const workflows = createWorkflowEngine({ adapters: mockAdapters() })
  const dialogue = createDialogueEngine({ workflows })
  const actor = { role: 'administrator' as const, userId: 'a1' }
  const { getConversationEngine } = await import('../src/conversation/engine')

  getConversationEngine().sessions.getOrCreateSession({ sessionId: 'dlg-sw' })
  getConversationEngine().sessions.setActivePerson('dlg-sw', {
    personId: 'k-old',
    displayName: 'پہلا',
    kind: 'karkun',
  })

  const switched = await dialogue.manager.turn({
    sessionId: 'dlg-sw',
    utterance: 'دوسرے کارکن کی تفصیلات',
    actor,
    recognition: synth({
      intent: IntentCode.SHOW_PERSON_DETAILS,
      originalUtterance: 'دوسرے کارکن کی تفصیلات',
      category: IntentCategory.INFORMATION,
      entities: {
        ...emptyIntentEntities(),
        personId: 'k-new',
        personName: 'دوسرا',
      },
      conversationContext: {
        activePerson: { personId: 'k-old', displayName: 'پہلا' },
      },
    }),
  })
  assert(switched.move === 'switch_person', `switch=${switched.move}`)
  assert(switched.kind === 'switched', 'switched kind')

  const corrected = await dialogue.manager.turn({
    sessionId: 'dlg-sw',
    utterance: 'غلط ہے، تصحیح کر دو',
    actor,
  })
  assert(corrected.move === 'correct', `correct=${corrected.move}`)
  assert(corrected.kind === 'repaired', 'repaired')
}

async function testRepeatHelpMultiTurn(): Promise<void> {
  resetAll()
  const workflows = createWorkflowEngine({ adapters: mockAdapters() })
  const dialogue = createDialogueEngine({ workflows })
  const actor = { role: 'rukn' as const, userId: 'r1', ruknId: 'r1' }
  const conversation = {
    activePerson: { personId: 'k-1', displayName: 'عبدالرحمن' },
  }

  await dialogue.manager.turn({
    sessionId: 'dlg-mt',
    utterance: 'اس کارکن کی تفصیلات پیش کریں۔',
    actor,
    recognition: {
      ...recognizeIntent('اس کارکن کی تفصیلات پیش کریں۔', conversation),
      confidence: 0.95,
      confidenceBand: 'execute',
      conversationContext: conversation,
    },
  })

  const help = await dialogue.manager.turn({
    sessionId: 'dlg-mt',
    utterance: 'مدد',
    actor,
  })
  assert(help.move === 'help', 'help')

  const repeated = await dialogue.manager.turn({
    sessionId: 'dlg-mt',
    utterance: 'دہرائیں',
    actor,
  })
  assert(repeated.move === 'repeat', 'repeat')
  assert(repeated.responseUrdu.length > 0, 'repeat body')

  // Clarification path when person missing
  const clarifying = await dialogue.manager.turn({
    sessionId: 'dlg-mt-2',
    utterance: 'ملاقات مکمل کر دو۔',
    actor,
  })
  assert(
    clarifying.kind === 'clarifying' || clarifying.move === 'route_workflow',
    `clarify=${clarifying.kind}/${clarifying.move}`,
  )
}

const cases = await Promise.all([
  run('dialogue move classifier', testMoveClassifier),
  run('cancel / resume / restart', testCancelRestartResume),
  run('interruption handling', testInterrupt),
  run('context switch + correction', testSwitchAndCorrect),
  run('repeat / help / multi-turn', testRepeatHelpMultiTurn),
])

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-035D',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
if (failed.length > 0) process.exit(1)
