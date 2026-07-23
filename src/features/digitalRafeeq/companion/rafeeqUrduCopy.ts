/**
 * Natural Urdu companion copy for Digital Rafeeq (KC-009.1 / KC-012).
 * Brand name stays English: "Digital Rafeeq". Conversation is always Urdu.
 * KC-0092C — during campaign mode, prefer Execution Matrix focus over stale commitment guidance.
 */

import {
  buildTodaysFocusItems,
  isRuknPostCampaignMode,
  type TodaysFocusItem,
} from '@/lib/campaignExecutionMatrix'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { sortGuidanceByUrgency } from '@/lib/homePresentation'
import { getActivePlanForKarkun } from '@/stores/executionPlanStore'
import { buildRafeeqPriorityWhyUrdu } from '@/lib/relationshipIntelligencePresentation'

export const RAFEEQ_BRAND = 'Digital Rafeeq'

export const RAFEEQ_SUBTITLE = 'آپ کا خصوصی معاون'

const LOCALIZATION_URDU: Readonly<Record<string, string>> = {
  'guidance.greeting.open':
    'آئیے آج کے روابط کو سکون اور توجہ کے ساتھ آگے بڑھائیں۔',
  'guidance.clarification.request':
    'آگے بڑھنے سے پہلے اگلا قدم واضح کر لیجیے تاکہ رابطہ بامقصد رہے۔',
  'guidance.confirmation.request':
    'اگر آپ مناسب سمجھیں تو آج کا طے شدہ رابطہ تصدیق کر کے شروع کیجیے۔',
  'guidance.reminder.deferred':
    'ایک فالو اپ باقی ہے — مناسب وقت پر دوبارہ رابطہ مفید ہوگا۔',
  'guidance.preparation.meeting':
    'ملاقات قریب ہے — چند باتیں ذہن میں رکھ لیں تاکہ گفتگو نرم اور مفید رہے۔',
  'guidance.suggestion.next_step':
    'اگر ممکن ہو تو اب اگلا رابطہ کر لیجیے — ایک قدم بھی خیر کا ذریعہ بن سکتا ہے۔',
  'guidance.encouragement.milestone':
    'الحمد للہ، آج کی کوشش اچھی رہی۔ اسی روانی کو برقرار رکھیے۔',
  'guidance.completion.close':
    'مکمل شدہ کام محفوظ کر لیں تاکہ آج کا کام اطمینان سے مکمل ہو۔',
  'guidance.recovery.resume':
    'جہاں کام رک گیا تھا وہیں سے دوبارہ شروع کر سکتے ہیں — میں آپ کے ساتھ ہوں۔',
}

export function resolveRafeeqLocalization(
  localizationKey: string,
  variables?: Readonly<Record<string, string | number | boolean>>,
): string {
  let text = LOCALIZATION_URDU[localizationKey] ?? 'آئیے آج کے مشن پر ایک ساتھ غور کریں۔'
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      text = text.replaceAll(`{${key}}`, String(value))
    }
  }
  return text
}

function respectName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return 'کارکن'
  if (/صاحب$|بیگم$|آپہ$/.test(trimmed)) return trimmed
  return `${trimmed} صاحب`
}

/** KC-0092C — Urdu line from the same pending matrix row Today's Focus uses. */
function buildMatrixFocusGuidanceUrdu(focus: TodaysFocusItem): string {
  const name = respectName(focus.karkunName)
  switch (focus.pendingLabel) {
    case 'Visit Pending':
      return `${name} آپ کی ملاقات کے منتظر ہیں۔ آج ہی رابطہ مفید ہوگا۔`
    case 'Registration Pending':
      return `${name} کی JIH App رجسٹریشن میں مدد آج کا نرم اور مفید قدم ہو سکتا ہے۔`
    case 'Weekly Ijtema Pending':
      return `اگر مناسب سمجھیں تو ${name} کو ہفتہ وار اجتماع کی دعوت دینا مفید ہو سکتا ہے۔`
    case 'Baitul Maal Pending':
      return `${name} سے بیت المال کی گفتگو مکمل کرنا آج کا موزوں قدم ہے۔`
    default:
      return `اب ${name} سے ایک مختصر ملاقات مفید ہوگی۔`
  }
}

export function buildContextualRafeeqGuidance(ruknId: string): string {
  // KC-0092C — campaign Execution Matrix is the source of truth for Home recommendations.
  // Reuses buildTodaysFocusItems (same rows as the Matrix); no extra Firestore reads.
  if (!isRuknPostCampaignMode()) {
    const focus = buildTodaysFocusItems(ruknId, 1)[0]
    if (focus) {
      return buildMatrixFocusGuidanceUrdu(focus)
    }
    return 'الحمد للہ — اس وقت مہم کے تمام اہم کام مکمل نظر آتے ہیں۔'
  }

  const list = sortGuidanceByUrgency(getGuidanceForRuknKarkuns(ruknId))
  const top = list[0]
  if (!top) {
    return 'ابھی کوئی کارکن مربوط نہیں۔ جب آپ تیار ہوں تو کسی قریبی کارکن سے رابطہ شروع کیجیے — میں آپ کے ساتھ رہوں گا۔'
  }

  const name = top.karkunName.trim() || 'کارکن'
  const plan = getActivePlanForKarkun(top.karkunId)

  // Default first-follow-up home message (KC-018.2) — English name stays as stored.
  if (
    !plan?.summaryUrdu &&
    (top.currentStage === 'connected' || top.currentStage === 'first-meeting')
  ) {
    return `${name} صاحب آپ کی پہلی ملاقات کے منتظر ہیں۔ آج ہی ان سے رابطہ کریں۔`
  }

  if (plan?.summaryUrdu) {
    return `آج سب سے پہلے ${respectName(name)} سے رابطہ موزوں لگتا ہے — آپ کا لائحۂ عمل بھی اسی طرف ہے: ${plan.summaryUrdu}`
  }

  return buildRafeeqPriorityWhyUrdu(top)
}

export function buildSuggestedNextKarkunUrdu(ruknId: string): string | null {
  const top = sortGuidanceByUrgency(getGuidanceForRuknKarkuns(ruknId))[0]
  if (!top) return null
  return buildContextualRafeeqGuidance(ruknId)
}

export const RAFEEQ_EMPTY_LINES = {
  noPriority: 'اس وقت کوئی خاص ترجیح نہیں — ایک ہلکا سا رابطہ بھی خیر کا کام ہے۔',
  noNext: 'ابھی اگلا کارکن تجویز کرنے کے لیے کافی تفصیل نہیں۔',
  noFollowUp: 'الحمد للہ، اس وقت کوئی فوری فالو اپ نہیں۔',
  noBlockers: 'کوئی رکاوٹ نظر نہیں آ رہی۔',
  preparing: 'ایک لمحہ…',
} as const
