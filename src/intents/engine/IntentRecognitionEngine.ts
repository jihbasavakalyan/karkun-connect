/**
 * KC-035B — Intent Recognition Engine (understand only — never executes).
 */

import { bandForConfidence, scoreConfidence } from '../confidence/ConfidencePolicy'
import { extractEntities } from '../extractors/extractEntities'
import { IntentCategory } from '../models/IntentCategory'
import { IntentCode } from '../models/IntentCode'
import { emptyIntentEntities } from '../models/Entities'
import type {
  IntentConversationInput,
  IntentRecognitionResult,
  RequiredClarification,
} from '../models/IntentResult'
import { collapseHits, matchIntentPatterns } from '../matchers/patternMatcher'
import { INTENT_REGISTRY } from '../registry/intentRegistry'
import { normalizeUrdu } from '../urdu/normalizeUrdu'

function buildClarifications(
  intent: IntentCode,
  band: ReturnType<typeof bandForConfidence>,
  entities: ReturnType<typeof extractEntities>,
  conversation: IntentConversationInput | null,
): RequiredClarification[] {
  const out: RequiredClarification[] = []

  if (band === 'clarify' && intent === IntentCode.UNKNOWN) {
    out.push({
      code: 'intent',
      reasonUrdu: 'معذرت، بات واضح نہیں ہوئی۔ ذرا دوسری طرح بتائیے؟',
    })
  } else if (band === 'clarify') {
    out.push({
      code: 'confirmation',
      reasonUrdu: 'کیا آپ یہی کارروائی چاہتے ہیں؟ ذرا تصدیق کر دیجئے۔',
    })
  } else if (band === 'confirm') {
    out.push({
      code: 'confirmation',
      reasonUrdu: 'اگر درست ہے تو تصدیق کر دیجئے۔',
    })
  }

  const needsPerson =
    intent === IntentCode.SHOW_PERSON_DETAILS ||
    intent === IntentCode.RECORD_VISIT ||
    intent === IntentCode.RECORD_CONNECTION ||
    intent === IntentCode.RECORD_ATTENDANCE ||
    intent === IntentCode.RECORD_APP_REGISTRATION ||
    intent === IntentCode.RECORD_BAITUL_MAAL ||
    intent === IntentCode.EDIT_WORKER

  if (needsPerson && !entities.personId && !entities.personName) {
    const hasRelative = Boolean(entities.relativePerson)
    const hasContextPerson = Boolean(conversation?.activePerson)
    if (hasRelative && !hasContextPerson) {
      out.push({
        code: 'person',
        reasonUrdu: 'کس کارکن کی بات کر رہے ہیں؟',
      })
    } else if (!hasRelative && !hasContextPerson) {
      out.push({
        code: 'person',
        reasonUrdu: 'کس کارکن کی بات کر رہے ہیں؟',
      })
    }
  }

  return out
}

export type RecognizeOptions = {
  readonly conversation?: IntentConversationInput | null
}

export class IntentRecognitionEngine {
  recognize(utterance: string, options?: RecognizeOptions): IntentRecognitionResult {
    const originalUtterance = utterance ?? ''
    const normalizedUtterance = normalizeUrdu(originalUtterance)
    const conversation = options?.conversation ?? null

    const rawHits = matchIntentPatterns(normalizedUtterance, INTENT_REGISTRY)
    const collapsed = collapseHits(rawHits)
    const entities = extractEntities(originalUtterance, normalizedUtterance, conversation)

    if (collapsed.length === 0) {
      return {
        intent: IntentCode.UNKNOWN,
        category: IntentCategory.UNKNOWN,
        confidence: 0,
        confidenceBand: 'clarify',
        entities,
        originalUtterance,
        normalizedUtterance,
        requiredClarifications: buildClarifications(
          IntentCode.UNKNOWN,
          'clarify',
          entities,
          conversation,
        ),
        matchedPatterns: [],
        conversationContext: conversation,
      }
    }

    const best = collapsed[0]!
    const def = INTENT_REGISTRY.find((d) => d.code === best.intent)
    const category = def?.category ?? IntentCategory.UNKNOWN

    let entityBonus = 0
    if (entities.personId || entities.personName) entityBonus += 0.04
    if (entities.ward) entityBonus += 0.02
    if (entities.activity) entityBonus += 0.02

    let contextBonus = 0
    if (conversation?.activePerson && entities.relativePerson) contextBonus += 0.06
    if (conversation?.currentIntent && conversation.currentIntent === best.intent) {
      contextBonus += 0.03
    }

    const confidence = scoreConfidence({
      rawStrength: best.bestStrength,
      patternHits: best.patternHits,
      entityBonus,
      contextBonus,
    })
    const confidenceBand = bandForConfidence(confidence)

    return {
      intent: best.intent,
      category,
      confidence,
      confidenceBand,
      entities,
      originalUtterance,
      normalizedUtterance,
      requiredClarifications: buildClarifications(
        best.intent,
        confidenceBand,
        entities,
        conversation,
      ),
      matchedPatterns: best.matchedPatterns,
      conversationContext: conversation,
    }
  }
}

export function createIntentRecognitionEngine(): IntentRecognitionEngine {
  return new IntentRecognitionEngine()
}

let singleton: IntentRecognitionEngine | null = null

export function getIntentRecognitionEngine(): IntentRecognitionEngine {
  if (!singleton) singleton = createIntentRecognitionEngine()
  return singleton
}

export function resetIntentRecognitionEngineForTests(): void {
  singleton = null
}

/** Convenience — does not mutate conversation. */
export function recognizeIntent(
  utterance: string,
  conversation?: IntentConversationInput | null,
): IntentRecognitionResult {
  return getIntentRecognitionEngine().recognize(utterance, { conversation })
}

/** Unknown empty result helper for tests. */
export function unknownResult(utterance: string): IntentRecognitionResult {
  return {
    intent: IntentCode.UNKNOWN,
    category: IntentCategory.UNKNOWN,
    confidence: 0,
    confidenceBand: 'clarify',
    entities: emptyIntentEntities(),
    originalUtterance: utterance,
    normalizedUtterance: normalizeUrdu(utterance),
    requiredClarifications: [
      {
        code: 'intent',
        reasonUrdu: 'معذرت، بات واضح نہیں ہوئی۔ ذرا دوسری طرح بتائیے؟',
      },
    ],
    matchedPatterns: [],
    conversationContext: null,
  }
}
