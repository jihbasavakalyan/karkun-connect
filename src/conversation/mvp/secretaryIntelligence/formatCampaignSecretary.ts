/**
 * Urdu secretary narrative over existing campaign intelligence payload.
 */

import type { CampaignIntelligencePayload } from '../campaignIntelligence/buildCampaignIntelligence'
import type { CampaignIntelTopic } from '../campaignIntelligence/topics'
import { formatSecretarySections } from './formatSecretarySections'
import type { CampaignSecretarySections } from './types'

const METRIC_LABEL_URDU: Record<string, string> = {
  connected: 'منسلک کارکن',
  'visits-completed': 'مکمل ملاقاتیں',
  'visits-pending': 'باقی ملاقاتیں',
  'weekly-ijtema': 'ہفتہ وار اجتماع',
  'app-registration': 'JIH App رجسٹریشن',
  'baitul-maal': 'بیت المال',
  'visits-pct': 'ملاقات کی تکمیل',
  'week-visits': 'اس ہفتے کی ملاقاتیں',
  'week-today': 'آج کی ملاقاتیں',
  'today-visits': 'آج درج ملاقاتیں',
}

function metricUrduLabel(id: string, fallback: string): string {
  return METRIC_LABEL_URDU[id] ?? fallback
}

function metricUrduValue(value: string): string {
  return value
    .replace(/No active module/gi, 'ماڈیول فعال نہیں')
    .replace(/No open cycle/gi, 'کوئی کھلا دور نہیں')
    .replace(/\bcompleted\b/gi, 'مکمل')
    .replace(/\beligible\b/gi, 'اہل')
}

function insightToUrdu(line: string): string {
  const map: Array<[RegExp, string]> = [
    [
      /Visit completion is below connection/i,
      'ملاقاتوں کی تکمیل منسلکیت سے پیچھے ہے — باقی ملاقاتیں بڑا موقع ہیں۔',
    ],
    [
      /Pending visits remain the largest opportunity/i,
      'باقی ملاقاتیں اب بھی سب سے بڑا موقع ہیں۔',
    ],
    [/Registration is progressing well/i, 'رجسٹریشن کی پیش رفت اطمینان بخش ہے۔'],
    [
      /App registration still has room/i,
      'JIH App رجسٹریشن ابھی پوری رفتار نہیں پکڑ سکی۔',
    ],
    [
      /Attendance is holding steadily/i,
      'ہفتہ وار اجتماع کی حاضری مستحکم ہے۔',
    ],
    [
      /Weekly Ijtema attendance needs attention/i,
      'ہفتہ وار اجتماع کی حاضری پر توجہ درکار ہے۔',
    ],
    [
      /Baitul Maal contribution lagging/i,
      'بیت المال کی وابستگی اہداف سے پیچھے ہے۔',
    ],
    [
      /Baitul Maal contribution is on a healthy track/i,
      'بیت المال کی وابستگی صحیح سمت میں ہے۔',
    ],
    [
      /Overall campaign is progressing steadily/i,
      'مہم مجموعی طور پر مستحکم رفتار سے آگے بڑھ رہی ہے۔',
    ],
    [
      /visit submission/i,
      'اس ہفتے ملاقاتوں کی سرگرمی جاری رہی۔',
    ],
  ]
  for (const [pattern, urdu] of map) {
    if (pattern.test(line)) return urdu
  }
  return line
}

function topicSituation(topic: CampaignIntelTopic, title: string): string {
  switch (topic) {
    case 'visits_pending':
      return 'مہم میں کئی ملاقاتیں ابھی باقی ہیں — یہ مرحلہ رابطے کی بنیاد ہے۔'
    case 'registration':
      return 'JIH App رجسٹریشن مہم کا اہم سنگ میل ہے؛ جو رہ گئے ہیں ان پر توجہ ضروری ہے۔'
    case 'ijtema':
      return 'ہفتہ وار اجتماع باقاعدگی کا پیمانہ ہے؛ کم شرکت والے کارکن کمزور کڑی بن سکتے ہیں۔'
    case 'baitul_maal':
      return 'بیت المال مالی وابستگی اور تربیت کا حصہ ہے؛ تاخیر کو نظر انداز نہ کریں۔'
    case 'attention':
      return 'کچھ اشاریے پیچھے ہیں — انھیں اولین ترجیح دینی چاہیے۔'
    case 'connected':
      return 'منسلکیت مہم کا پہلا قدم ہے؛ جو رہ گئے ہیں ان سے جلد رابطہ کریں۔'
    default:
      return title.includes('Campaign') || title.includes('مہم')
        ? 'مہم کی مجموعی صورتحال درج ذیل تجزیے کے مطابق ہے۔'
        : 'موجودہ مہم کی صورتحال کا سیکرٹری جائزہ یہ ہے۔'
  }
}

export function buildCampaignSecretarySections(
  payload: CampaignIntelligencePayload,
): CampaignSecretarySections {
  const progress: string[] = []
  const remaining: string[] = []
  const attention: string[] = []

  for (const row of payload.metrics) {
    const label = metricUrduLabel(row.id, row.label)
    const line = `${label}: ${metricUrduValue(row.value)}`
    if (row.status === 'good') progress.push(line)
    else if (row.status === 'attention') {
      attention.push(line)
      remaining.push(line)
    } else {
      progress.push(line)
    }
  }

  for (const insight of payload.insights.slice(0, 3)) {
    const urdu = insightToUrdu(insight)
    if (/پیچھے|توجہ|باقی|موقع|کمزور/.test(urdu)) attention.push(urdu)
    else progress.push(urdu)
  }

  if (remaining.length === 0 && attention.length > 0) {
    remaining.push(...attention.slice(0, 2))
  }

  const nextPlan: string[] = []
  if (payload.topic === 'visits_pending' || payload.metrics.some((m) => m.id === 'visits-pending')) {
    nextPlan.push('باقی ملاقاتوں کی فہرست نکال کر اس ہفتے مکمل کریں۔')
  }
  if (payload.topic === 'registration' || payload.metrics.some((m) => m.id === 'app-registration' && m.status !== 'good')) {
    nextPlan.push('غیر رجسٹرڈ کارکنوں کے لیے اندراج کی مدد کا وقت نکالیں۔')
  }
  if (payload.topic === 'ijtema') {
    nextPlan.push('کم حاضری والے کارکنوں کو ذاتی دعوت دیں۔')
  }
  if (payload.topic === 'attention') {
    nextPlan.push('سب سے کمزور اشاریے پر پہلے کام کریں۔')
  }
  if (nextPlan.length === 0) {
    nextPlan.push('منسلکیت، ملاقات، رجسٹریشن اور اجتماع میں سے جو پیچھے ہے اسے ترجیح دیں۔')
  }

  let advice =
    'اس مرحلے پر جو اشاریہ سب سے پیچھے ہے اسے اولین ترجیح دینی چاہیے۔'
  if (payload.topic === 'visits_pending') {
    advice = 'میرے خیال میں آئندہ چند دن ملاقاتوں کی تکمیل پر مرکوز رہنا زیادہ مؤثر ہوگا۔'
  } else if (payload.topic === 'registration') {
    advice = 'رجسٹریشن باقی کارکنوں سے ذاتی رابطہ کر کے اندراج مکمل کرائیں۔'
  } else if (payload.topic === 'ijtema') {
    advice = 'ہفتہ وار اجتماع میں شرکت کو اس ہفتے کی اولین ترجیح بنائیں۔'
  } else if (payload.topic === 'attention') {
    advice = 'فوری توجہ والے اشاریوں کو پہلے حل کریں تاکہ مہم متوازن رہے۔'
  }

  return {
    situation: topicSituation(payload.topic, payload.title),
    progress: progress.slice(0, 6),
    remaining: remaining.slice(0, 5),
    attention: attention.slice(0, 5),
    nextPlan: nextPlan.slice(0, 4),
    advice,
  }
}

export function formatCampaignSecretaryText(
  payload: CampaignIntelligencePayload,
): string {
  const sections = buildCampaignSecretarySections(payload)
  const titleUrdu =
    payload.topic === 'overview'
      ? 'مہم کا سیکرٹری جائزہ'
      : payload.topic === 'visits_pending'
        ? 'باقی ملاقاتیں — تجزیہ'
        : payload.topic === 'registration'
          ? 'رجسٹریشن — تجزیہ'
          : payload.topic === 'ijtema'
            ? 'ہفتہ وار اجتماع — تجزیہ'
            : payload.topic === 'attention'
              ? 'فوری توجہ والے امور'
              : 'مہم کی صورتحال'

  return `${titleUrdu}\n\n${formatSecretarySections(sections)}`
}

/** Detect short follow-ups that continue the last person report. */
export function isPersonRemainingFollowUp(utterance: string): boolean {
  const raw = utterance.trim()
  return (
    /^(کیا\s+)?باقی(\s+ہے|\s+ہیں)?\s*\??$/u.test(raw) ||
    /^اب کیا باقی/u.test(raw) ||
    /^کیا رہ گیا/u.test(raw) ||
    /^باقی کیا ہے/u.test(raw) ||
    /^کیا باقی ہے/u.test(raw) ||
    /^what('?s| is) left\??$/i.test(raw) ||
    /^remaining\??$/i.test(raw)
  )
}

export function isPersonReportUtterance(utterance: string): boolean {
  const raw = utterance.trim()
  return (
    /کی رپورٹ/u.test(raw) ||
    /کا رپورٹ/u.test(raw) ||
    /رپورٹ بتا/u.test(raw) ||
    /رپورٹ سنا/u.test(raw) ||
    /کارکن کی معلومات/u.test(raw) ||
    /show profile/i.test(raw) ||
    /پروفائل/u.test(raw)
  )
}
