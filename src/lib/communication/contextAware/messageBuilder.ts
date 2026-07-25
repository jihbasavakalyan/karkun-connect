/**
 * KC-0118 — Urdu editorial message builder for context-aware communication.
 * Follows KC-0118 Urdu Editorial Standard (approved vocabulary only).
 */

import type {
  CommunicationContextId,
  ContextAwarePendingMatter,
  ContextAwareRecipientType,
} from './types'

const GREETING = 'السلام علیکم ورحمۃ اللہ وبرکاتہ'
const RESPONSIBILITY_LINE =
  'آپ کی ذمہ داری سے متعلق چند امور ابھی تک زیر التواء ہیں۔'
const ACTION_LINE =
  'براہ کرم ان تمام امور پر جلد از جلد توجہ فرماتے ہوئے ان کی تکمیل کو یقینی بنائیں۔'
const DUA = 'اللہ تعالیٰ آپ کی کوششوں کو قبول فرمائے۔'
const CLOSING = 'والسلام'

const CONTEXT_REASON: Record<CommunicationContextId, string> = {
  'pending-visits':
    'مہم کی پیش رفت کے سلسلے میں ملاقاتوں کی صورتِ حال پر یہ یاددہانی بھیجی جا رہی ہے۔',
  'pending-weekly-ijtema':
    'ہفتہ وار اجتماع کی حاضری کے سلسلے میں یہ یاددہانی بھیجی جا رہی ہے۔',
  'pending-jih-registration':
    'جے آئی ایچ رپورٹنگ ایپ کے اندراج کے سلسلے میں یہ یاددہانی بھیجی جا رہی ہے۔',
  'pending-baitul-maal':
    'بیت المال کی تکمیل کے سلسلے میں یہ یاددہانی بھیجی جا رہی ہے۔',
  'follow-up-pending':
    'زیر التواء پیروی کے امور کے سلسلے میں یہ یاددہانی بھیجی جا رہی ہے۔',
  'no-activity':
    'مہم میں پیش رفت کی صورتِ حال کے سلسلے میں یہ یاددہانی بھیجی جا رہی ہے۔',
  'new-assignment':
    'نئی سپردگی / ذمہ داری کے سلسلے میں یہ تفصیلات آپ کے ساتھ شیئر کی جا رہی ہیں۔',
}

export const CONTEXT_TYPE_LABELS: Record<CommunicationContextId, string> = {
  'pending-visits': 'زیر التواء ملاقاتیں',
  'pending-weekly-ijtema': 'زیر التواء ہفتہ وار اجتماع',
  'pending-jih-registration': 'زیر التواء جے آئی ایچ اندراج',
  'pending-baitul-maal': 'زیر التواء بیت المال',
  'follow-up-pending': 'زیر التواء پیروی',
  'no-activity': 'پیش رفت کی صورتِ حال',
  'new-assignment': 'نئی سپردگی',
}

const RECIPIENT_TYPE_LABELS: Record<ContextAwareRecipientType, string> = {
  rukn: 'رکن',
  karkun: 'کارکن',
  muttafiq: 'متفق',
}

export function recipientTypeLabel(type: ContextAwareRecipientType): string {
  return RECIPIENT_TYPE_LABELS[type]
}

export function buildContextAwareUrduMessage(input: {
  context: CommunicationContextId
  recipientName?: string
  pendingMatters: ContextAwarePendingMatter[]
}): string {
  const nameLine = input.recipientName?.trim() ? `\n${input.recipientName.trim()}` : ''
  const matters =
    input.pendingMatters.length > 0
      ? input.pendingMatters.map((matter) => `• ${matter.label}`).join('\n')
      : '• عمومی پیش رفت کی تکمیل'

  const summaryCount = String(Math.max(input.pendingMatters.length, 1))

  return [
    GREETING + nameLine,
    '',
    CONTEXT_REASON[input.context],
    '',
    RESPONSIBILITY_LINE,
    '',
    `خلاصہ: ${summaryCount} امور زیر التواء ہیں۔`,
    '',
    'تفصیلات:',
    matters,
    '',
    ACTION_LINE,
    '',
    DUA,
    '',
    CLOSING,
  ].join('\n')
}
