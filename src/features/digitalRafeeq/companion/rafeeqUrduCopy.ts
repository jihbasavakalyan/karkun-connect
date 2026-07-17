/**
 * Natural Urdu companion copy for Digital Rafeeq (KC-009.1).
 * Brand name stays English: "Digital Rafeeq". Conversation is always Urdu.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { sortGuidanceByUrgency } from '@/lib/homePresentation'
import { getActivePlanForKarkun } from '@/stores/executionPlanStore'
import type { KarkunGuidance } from '@/types/guidance'

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
    'مکمل شدہ کام محفوظ کر لیں تاکہ آج کا سلسلہ اطمینان سے بند ہو۔',
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

export function buildContextualRafeeqGuidance(ruknId: string): string {
  const list = sortGuidanceByUrgency(getGuidanceForRuknKarkuns(ruknId))
  const top = list[0]
  if (!top) {
    return 'ابھی کوئی کارکن مربوط نہیں۔ جب آپ تیار ہوں تو کسی قریبی کارکن سے رابطہ شروع کیجیے — میں آپ کے ساتھ رہوں گا۔'
  }

  const name = respectName(top.karkunName)
  const plan = getActivePlanForKarkun(top.karkunId)
  const reason = reasonForGuidance(top)

  if (plan?.summaryUrdu) {
    return `میری تجویز ہے کہ آج سب سے پہلے ${name} سے رابطہ کیا جائے کیونکہ آپ کا لائحۂ عمل اسی طرف اشارہ کرتا ہے: ${plan.summaryUrdu}`
  }

  return `میری تجویز ہے کہ آج سب سے پہلے ${name} سے رابطہ کیا جائے کیونکہ ${reason}`
}

function reasonForGuidance(guidance: KarkunGuidance): string {
  const health = guidance.health.level
  const action = guidance.nextAction
  const karkun = getKarkunById(guidance.karkunId)
  const lastVisit = karkun?.lastVisit?.trim()

  if (health === 'urgent' || health === 'needs-attention') {
    return 'ان کے تعلق کو اب توجہ درکار ہے اور تاخیر سے فاصلہ بڑھ سکتا ہے۔'
  }
  if (action.kind === 'call-today') {
    return 'آج ایک مختصر کال سے سلسلہ دوبارہ گرم ہو سکتا ہے۔'
  }
  if (action.kind === 'visit-this-week' || action.kind === 'arrange-meeting') {
    return lastVisit
      ? `گزشتہ ملاقات (${lastVisit}) کے بعد دوبارہ بالمشافہ رابطہ مفید رہے گا۔`
      : 'ان سے بالمشافہ ملاقات کا وقت مناسب معلوم ہوتا ہے۔'
  }
  if (action.kind === 'help-jih-registration') {
    return 'ان کی رجسٹریشن ابھی مکمل نہیں اور آپ کی رہنمائی سے یہ مرحلہ آسان ہو سکتا ہے۔'
  }
  if (action.kind === 'invite-ijtema') {
    return 'اجتماع میں شرکت کی دعوت سے ان کا تعلق جماعت سے مضبوط ہو سکتا ہے۔'
  }
  if (action.kind === 'honor-commitment') {
    return 'ان سے کوئی وعدہ باقی ہے اور اسے وقت پر پورا کرنا اعتماد بڑھاتا ہے۔'
  }
  if (action.kind === 'complete-visit-notes') {
    return 'گزشتہ ملاقات کی تفصیلات محفوظ کرنا اگلے قدم کو آسان بنائے گا۔'
  }
  if (lastVisit) {
    return `گزشتہ ہفتے کے قریب ان سے رابطہ ہوا تھا اور سلسلہ جاری رکھنا بہتر ہے۔`
  }
  return 'ان سے رابطہ آپ کے آج کے مشن کا اہم حصہ ہے۔'
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
