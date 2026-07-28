/**
 * KC-0125 — Approved editorial copy for context-aware Notify drafts.
 * Draft → Editorial Review → Verification → Approved.
 */

import { URDU_PREFERRED } from '@/lib/communication/urduTerminology'
import type { CommunicationContextId } from './types'

export const APPROVED_EDITORIAL = {
  greeting: URDU_PREFERRED.greeting,
  dua: URDU_PREFERRED.duaAccept,
  closing: URDU_PREFERRED.closingWassalam,
  responsibilityIntro:
    'آپ کی ذمہ داری سے متعلق درج ذیل امور زیر التواء ہیں۔',
  actionLine:
    'براہ کرم ان تمام امور پر جلد از جلد توجہ فرماتے ہوئے ان کی تکمیل کو یقینی بنائیں۔',
  allCompleteBody: [
    'الحمد للہ!',
    '',
    'آپ کی ذمہ داری سے متعلق تمام امور مکمل ہیں۔',
    '',
    'جزاکم اللہ خیراً۔',
  ].join('\n'),
  detailsHeading: 'تفصیلات:',
} as const

/** Context purpose — guiding, not "reminder". */
export const APPROVED_CONTEXT_PURPOSE: Record<CommunicationContextId, string> = {
  'pending-visits':
    'مہم کی پیش رفت کے سلسلے میں آپ کی ذمہ داری سے متعلق ملاقاتوں کی تفصیلات یہ ہیں۔',
  'pending-weekly-ijtema':
    'ہفتہ وار اجتماع کی حاضری آپ کی ذمہ داری کا اہم حصہ ہے — درج ذیل تفصیلات ملاحظہ فرمائیں۔',
  'pending-jih-registration':
    'JIH Reporting App میں اندراج مہم کی پیش رفت کے لیے ضروری ہے — آپ کی ذمہ داری سے متعلق تفصیلات یہ ہیں۔',
  'pending-baitul-maal':
    'ماہانہ بیت المال کی تکمیل آپ کی ذمہ داری کا حصہ ہے — درج ذیل تفصیلات ملاحظہ فرمائیں۔',
  'follow-up-pending':
    'پیروی کے امور آپ کی ذمہ داری سے متعلق ہیں — درج ذیل تفصیلات ملاحظہ فرمائیں۔',
  'no-activity':
    'مہم میں پیش رفت کی صورتِ حال پر آپ کی توجہ مطلوب ہے — آپ کی ذمہ داری سے متعلق تفصیلات یہ ہیں۔',
  'new-assignment':
    'نئی سپردگی / ذمہ داری کی تفصیلات آپ کے ساتھ شیئر کی جا رہی ہیں۔',
}

export const APPROVED_CONTEXT_TYPE_LABELS: Record<CommunicationContextId, string> = {
  'pending-visits': 'زیر التواء ملاقاتیں',
  'pending-weekly-ijtema': 'زیر التواء ہفتہ وار اجتماع',
  'pending-jih-registration': 'زیر التواء JIH Reporting App اندراج',
  'pending-baitul-maal': 'زیر التواء بیت المال',
  'follow-up-pending': 'زیر التواء پیروی',
  'no-activity': 'پیش رفت کی صورتِ حال',
  'new-assignment': 'نئی سپردگی',
}

/** Canonical activity labels for bullets (specific, action-oriented). */
export const APPROVED_ACTIVITY_LABELS = {
  visitPending: 'ملاقات باقی ہے۔',
  ijtemaPending: 'ہفتہ وار اجتماع میں شرکت مطلوب ہے۔',
  jihPending: 'JIH Reporting App میں اندراج باقی ہے۔',
  baitulPending: 'ماہانہ بیت المال کی تکمیل باقی ہے۔',
  followUpPending: 'پیروی کا امر زیر التواء ہے۔',
  newAssignment: 'نئی سپردگی کی تفصیلات توجہ طلب ہیں۔',
  progressAttention: 'پیش رفت کی صورتِ حال توجہ طلب ہے۔',
} as const
