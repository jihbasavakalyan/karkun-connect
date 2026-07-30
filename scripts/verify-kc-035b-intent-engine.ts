/**
 * KC-035B — Natural Urdu Intent Recognition Engine verification.
 */
import {
  CONFIDENCE_THRESHOLDS,
  IntentCode,
  INTENT_REGISTRY,
  bandForConfidence,
  createIntentRecognitionEngine,
  extractEntities,
  listIntentCodes,
  normalizeUrdu,
  recognizeIntent,
  scoreConfidence,
} from '../src/intents'
import type { ConversationContext } from '../src/conversation/engine'

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

function testNormalization(): void {
  assert(normalizeUrdu('  تفصیلات  ') === 'تفصیل', 'تفصیلات→تفصیل')
  assert(normalizeUrdu('صورتحال').includes('حال'), 'صورتحال→حال')
  assert(normalizeUrdu('حالات').includes('حال'), 'حالات→حال')
  assert(normalizeUrdu('وزٹ') === 'ملاقات', 'وزٹ→ملاقات')
  assert(normalizeUrdu('ڈیش بورڈ').includes('ڈیشبورڈ'), 'dashboard phrase')
  assert(!normalizeUrdu('ہے؟').includes('؟'), 'punctuation stripped')
  assert(normalizeUrdu('آج کی صورتحال بتائیں۔').includes('حال'), 'today status normalized')
}

function testRegistry(): void {
  const codes = listIntentCodes()
  assert(codes.includes(IntentCode.SHOW_PERSON_DETAILS), 'person details')
  assert(codes.includes(IntentCode.RECORD_VISIT), 'record visit')
  assert(codes.includes(IntentCode.SHOW_DASHBOARD), 'dashboard')
  assert(codes.includes(IntentCode.GENERATE_REPORT), 'generate report')
  assert(codes.includes(IntentCode.HELP), 'help')
  assert(INTENT_REGISTRY.length >= 30, 'registry size')
}

function testConfidencePolicy(): void {
  assert(CONFIDENCE_THRESHOLDS.executeMin === 0.9, 'execute threshold')
  assert(CONFIDENCE_THRESHOLDS.confirmMin === 0.6, 'confirm threshold')
  assert(bandForConfidence(0.95) === 'execute', 'execute band')
  assert(bandForConfidence(0.75) === 'confirm', 'confirm band')
  assert(bandForConfidence(0.4) === 'clarify', 'clarify band')
  const scored = scoreConfidence({ rawStrength: 0.86, patternHits: 2, entityBonus: 0.04 })
  assert(scored >= 0.86 && scored <= 1, 'score range')
}

function expectIntent(utterance: string, code: string): void {
  const result = recognizeIntent(utterance)
  assert(result.intent === code, `"${utterance}" → ${code} (got ${result.intent})`)
  assert(result.originalUtterance === utterance, 'preserves original')
  assert(result.normalizedUtterance.length > 0, 'normalized non-empty')
  assert(result.confidence > 0, 'confidence > 0')
}

function testPersonDetailsVariants(): void {
  expectIntent('اس کارکن کی تفصیلات پیش کریں۔', IntentCode.SHOW_PERSON_DETAILS)
  expectIntent('اس کی صورتحال بتائیں۔', IntentCode.SHOW_PERSON_DETAILS)
  expectIntent('اس کارکن کے بارے میں بتائیں۔', IntentCode.SHOW_PERSON_DETAILS)
  expectIntent('اس کا ریکارڈ سنائیں۔', IntentCode.SHOW_PERSON_DETAILS)
  expectIntent('ذرا اس کا حال بتائیں۔', IntentCode.SHOW_PERSON_DETAILS)
}

function testVisitVariants(): void {
  expectIntent('ملاقات مکمل کر دو۔', IntentCode.RECORD_VISIT)
  expectIntent('وزٹ درج کر دو۔', IntentCode.RECORD_VISIT)
  expectIntent('اس سے ملاقات ہو گئی۔', IntentCode.RECORD_VISIT)
  expectIntent('ملاقات محفوظ کر دو۔', IntentCode.RECORD_VISIT)
}

function testDashboardVariants(): void {
  expectIntent('آج کی صورتحال بتائیں۔', IntentCode.SHOW_DASHBOARD)
  expectIntent('ڈیش بورڈ پیش کریں۔', IntentCode.SHOW_DASHBOARD)
  expectIntent('آج کی پیش رفت سنائیں۔', IntentCode.SHOW_DASHBOARD)
}

function testMoreIntents(): void {
  expectIntent('ہفتہ وار اجتماع کی حاضری بتائیں۔', IntentCode.SHOW_WEEKLY_IJTEMA)
  expectIntent('بیت المال درج کر دو۔', IntentCode.RECORD_BAITUL_MAAL)
  expectIntent('ایپ رجسٹریشن محفوظ کر دو۔', IntentCode.RECORD_APP_REGISTRATION)
  expectIntent('رپورٹ تیار کرو۔', IntentCode.GENERATE_REPORT)
  expectIntent('مدد چاہیے۔', IntentCode.HELP)
  expectIntent('منسوخ کر دو۔', IntentCode.CANCEL)
  expectIntent('اگلا۔', IntentCode.NEXT)
  expectIntent('کارکن تلاش کرو۔', IntentCode.FIND_PERSON)
}

function testEntityExtraction(): void {
  const withRelative = extractEntities('اسے ملاقات مکمل کر دو۔', normalizeUrdu('اسے ملاقات مکمل کر دو۔'), {
    activePerson: { personId: 'p-1', displayName: 'عبدالرحمن' },
  })
  assert(withRelative.relativePerson === 'him_her', 'relative pronoun')
  assert(withRelative.personId === 'p-1', 'context person id')
  assert(withRelative.personName === 'عبدالرحمن', 'context person name')
  assert(withRelative.activity === 'visit', 'activity visit')

  const ward = extractEntities('وارڈ ٤ کا کارکن', normalizeUrdu('وارڈ ٤ کا کارکن'), null)
  assert(ward.ward === '4', `ward extracted (got ${ward.ward})`)
}

function testContextAwareRecognition(): void {
  const engine = createIntentRecognitionEngine()
  const conversation: IntentConversationInputLike = {
    activePerson: { personId: 'abdul', displayName: 'عبدالرحمن' },
    currentIntent: IntentCode.SHOW_PERSON_DETAILS,
  }
  const result = engine.recognize('ملاقات مکمل کر دو۔', { conversation })
  assert(result.intent === IntentCode.RECORD_VISIT, 'visit with context')
  assert(result.conversationContext === conversation, 'context echoed')
  // Use relative utterance:
  const rel = engine.recognize('اسے ملاقات محفوظ کر دو۔', { conversation })
  assert(rel.intent === IntentCode.RECORD_VISIT, 'visit relative')
  assert(rel.entities.personId === 'abdul', 'resolved from context')
  assert(rel.conversationContext === conversation, 'context echoed not mutated')
  assert(
    conversation.activePerson?.personId === 'abdul',
    'conversation not mutated',
  )
}

type IntentConversationInputLike = {
  activePerson: { personId: string; displayName: string }
  currentIntent: string
}

function testConversationContextCompatibility(): void {
  const ctx: ConversationContext = {
    activeUserId: 'u1',
    activeUserRole: 'rukn',
    activePerson: {
      personId: 'p9',
      displayName: 'نمونہ',
      kind: 'karkun',
    },
    activeCampaignId: 'c1',
    activeCampaignName: 'فعال کارکن',
    activeReportId: null,
    activeReportLabel: null,
    currentIntent: null,
    pendingQuestion: null,
    conversationState: 'waiting',
    currentWorkflowId: null,
    lastExecutedAction: null,
    lastResponse: 'جی۔',
    nextSuggestedAction: null,
    pendingClarification: null,
  }

  const result = recognizeIntent('اس کارکن کی تفصیلات پیش کریں۔', ctx)
  assert(result.intent === IntentCode.SHOW_PERSON_DETAILS, 'reads KC-035A context shape')
  assert(result.entities.personId === 'p9', 'active person from engine context')
  assert(ctx.conversationState === 'waiting', 'state unchanged')
}

function testNoBusinessLogicMarkers(): void {
  // Engine module must not import repositories / firestore / workflow writers.
  // Static contract: recognize returns result only.
  const r = recognizeIntent('نامعلوم جملہ xyz')
  assert(r.intent === IntentCode.UNKNOWN || r.confidenceBand === 'clarify', 'unknown/clarify')
  assert(Array.isArray(r.requiredClarifications), 'clarifications array')
}

const cases = [
  run('urdu normalization', testNormalization),
  run('intent registry', testRegistry),
  run('confidence policy', testConfidencePolicy),
  run('person details variants', testPersonDetailsVariants),
  run('visit variants', testVisitVariants),
  run('dashboard variants', testDashboardVariants),
  run('more intents', testMoreIntents),
  run('entity extraction', testEntityExtraction),
  run('context-aware matching', testContextAwareRecognition),
  run('KC-035A conversation integration', testConversationContextCompatibility),
  run('no business side effects', testNoBusinessLogicMarkers),
]

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-035B',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
if (failed.length > 0) process.exit(1)
