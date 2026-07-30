/**
 * KC-035B — Canonical intent registry with natural Urdu pattern groups.
 * Patterns are matched against normalized utterances (see urdu/normalizeUrdu).
 */

import { IntentCategory } from '../models/IntentCategory'
import { IntentCode } from '../models/IntentCode'
import type { IntentDefinition } from './IntentDefinition'

export const INTENT_REGISTRY: readonly IntentDefinition[] = [
  // ── Information ────────────────────────────────────────────
  {
    code: IntentCode.SHOW_PERSON_DETAILS,
    category: IntentCategory.INFORMATION,
    baseStrength: 0.86,
    patterns: [
      { id: 'details-present', allOf: ['تفصیل'], anyOf: ['پیش', 'بتا', 'سنا', 'کارکن'], weight: 1 },
      { id: 'about-worker', anyOf: ['بارے'], weight: 1 },
      { id: 'about-worker-karkun', allOf: ['کارکن', 'بارے'], weight: 1.05 },
      { id: 'his-status', anyOf: ['اسکی حال', 'اسکا حال', 'اسکا ریکارڈ', 'اسکی تفصیل'], weight: 1.05 },
      { id: 'zura-haal', allOf: ['ذرااس'], anyOf: ['حال', 'بتا'], weight: 0.95 },
      { id: 'haal-batao', allOf: ['حال'], anyOf: ['بتا', 'سنا', 'پیش'], weight: 0.82 },
      { id: 'record-suna', allOf: ['ریکارڈ'], anyOf: ['سنا', 'بتا', 'پیش'], weight: 0.92 },
    ],
  },
  {
    code: IntentCode.SHOW_DASHBOARD,
    category: IntentCategory.INFORMATION,
    baseStrength: 0.9,
    patterns: [
      { id: 'dashboard-word', anyOf: ['ڈیشبورڈ'], weight: 1.1 },
      { id: 'today-status', allOf: ['آجکی'], anyOf: ['حال', 'پیشرفت'], weight: 1.15 },
      { id: 'today-progress', allOf: ['آج'], anyOf: ['پیشرفت', 'حال'], weight: 1 },
    ],
  },
  {
    code: IntentCode.SHOW_CAMPAIGN_STATUS,
    category: IntentCategory.INFORMATION,
    baseStrength: 0.84,
    patterns: [
      { id: 'campaign-status', allOf: ['مہم'], anyOf: ['حال', 'پیشرفت', 'حیثیت', 'سٹیٹس'], weight: 1 },
      { id: 'campaign-show', allOf: ['مہم'], anyOf: ['پیش', 'بتا', 'سنا'], weight: 0.9 },
    ],
  },
  {
    code: IntentCode.SHOW_REPORT,
    category: IntentCategory.INFORMATION,
    baseStrength: 0.85,
    patterns: [
      { id: 'show-report', allOf: ['رپورٹ'], anyOf: ['پیش', 'بتا', 'سنا', 'دکھا'], weight: 1 },
      { id: 'report-only', anyOf: ['رپورٹ'], weight: 0.75 },
    ],
  },
  {
    code: IntentCode.SHOW_WEEKLY_IJTEMA,
    category: IntentCategory.INFORMATION,
    baseStrength: 0.87,
    patterns: [
      { id: 'weekly-ijtema', anyOf: ['ہفتہواراجتماع', 'اجتماع'], weight: 1 },
      { id: 'ijtema-attendance-info', allOf: ['حاضری'], anyOf: ['اجتماع', 'ہفتہوار'], weight: 0.95 },
    ],
  },
  {
    code: IntentCode.SHOW_PENDING_TASKS,
    category: IntentCategory.INFORMATION,
    baseStrength: 0.84,
    patterns: [
      { id: 'pending', anyOf: ['زیرالتواء', 'باقی', 'pending'], weight: 0.9 },
      { id: 'pending-tasks', allOf: ['باقی'], anyOf: ['کام', 'کارروائی', 'امور'], weight: 1 },
      { id: 'pending-phrase', anyOf: ['زیر التواء', 'امور زیر التواء'], weight: 1.05 },
    ],
  },

  // ── Updates ────────────────────────────────────────────────
  {
    code: IntentCode.RECORD_CONNECTION,
    category: IntentCategory.UPDATES,
    baseStrength: 0.88,
    patterns: [
      { id: 'record-connection', allOf: ['رابطہ'], anyOf: ['مکمل', 'درج', 'محفوظ', 'کر'], weight: 1 },
      { id: 'connected', anyOf: ['منسلک کر', 'رابطہ کر دیا', 'رابطہ ہو گیا'], weight: 1 },
    ],
  },
  {
    code: IntentCode.RECORD_VISIT,
    category: IntentCategory.UPDATES,
    baseStrength: 0.9,
    patterns: [
      { id: 'visit-complete', allOf: ['ملاقات'], anyOf: ['مکمل', 'درج', 'محفوظ'], weight: 1.1 },
      { id: 'visit-done', anyOf: ['ملاقات ہو گئی', 'مل آیا', 'مل اے'], weight: 1.05 },
      { id: 'visit-save', allOf: ['ملاقات'], anyOf: ['کر دو', 'کر دیا'], weight: 0.95 },
    ],
  },
  {
    code: IntentCode.RECORD_ATTENDANCE,
    category: IntentCategory.UPDATES,
    baseStrength: 0.88,
    patterns: [
      { id: 'attendance-record', allOf: ['حاضری'], anyOf: ['درج', 'محفوظ', 'مکمل', 'لگا'], weight: 1 },
      { id: 'ijtema-present', allOf: ['اجتماع'], anyOf: ['حاضر', 'حاضری'], weight: 0.95 },
    ],
  },
  {
    code: IntentCode.RECORD_APP_REGISTRATION,
    category: IntentCategory.UPDATES,
    baseStrength: 0.87,
    patterns: [
      { id: 'app-reg', anyOf: ['ایپرجسٹریشن'], weight: 1.1 },
      { id: 'app-register', allOf: ['ایپ'], anyOf: ['رجسٹریشن', 'رجسٹر', 'درج'], weight: 1 },
    ],
  },
  {
    code: IntentCode.RECORD_BAITUL_MAAL,
    category: IntentCategory.UPDATES,
    baseStrength: 0.88,
    patterns: [
      { id: 'bm', anyOf: ['بیتمال'], weight: 1.1 },
      { id: 'bm-words', allOf: ['بیت', 'المال'], anyOf: ['درج', 'محفوظ', 'عزم', 'مکمل'], weight: 1 },
      { id: 'bm-commit', anyOf: ['بیت المال'], weight: 0.95 },
    ],
  },

  // ── Navigation ─────────────────────────────────────────────
  {
    code: IntentCode.NAVIGATE_DASHBOARD,
    category: IntentCategory.NAVIGATION,
    baseStrength: 0.86,
    patterns: [
      { id: 'go-dashboard', allOf: ['ڈیشبورڈ'], anyOf: ['کھولو', 'جائیں', 'لے چلو', 'کھول'], weight: 1 },
      { id: 'open-dashboard', anyOf: ['ڈیشبورڈ کھولو', 'ڈیشبورڈ پر'], weight: 1.05 },
    ],
  },
  {
    code: IntentCode.NAVIGATE_CAMPAIGN,
    category: IntentCategory.NAVIGATION,
    baseStrength: 0.84,
    patterns: [
      { id: 'go-campaign', allOf: ['مہم'], anyOf: ['کھولو', 'جائیں', 'صفحہ', 'لے چلو'], weight: 1 },
    ],
  },
  {
    code: IntentCode.NAVIGATE_WORKERS,
    category: IntentCategory.NAVIGATION,
    baseStrength: 0.84,
    patterns: [
      { id: 'go-workers-nav', allOf: ['کارکن'], anyOf: ['کھولو', 'فہرست', 'صفحہ', 'جائیں'], weight: 1 },
    ],
  },
  {
    code: IntentCode.NAVIGATE_REPORTS,
    category: IntentCategory.NAVIGATION,
    baseStrength: 0.84,
    patterns: [
      { id: 'go-reports', allOf: ['رپورٹ'], anyOf: ['کھولو', 'صفحہ', 'جائیں', 'لے چلو'], weight: 1 },
    ],
  },
  {
    code: IntentCode.NAVIGATE_SETTINGS,
    category: IntentCategory.NAVIGATION,
    baseStrength: 0.86,
    patterns: [
      { id: 'go-settings', anyOf: ['ترتیبات', 'سیٹنگ'], weight: 1 },
      { id: 'settings-open', allOf: ['ترتیبات'], anyOf: ['کھولو', 'جائیں'], weight: 1.05 },
    ],
  },
  {
    code: IntentCode.NAVIGATE_ACTIVITIES,
    category: IntentCategory.NAVIGATION,
    baseStrength: 0.84,
    patterns: [
      { id: 'go-activities', anyOf: ['سرگرمی', 'سرگرمیاں', 'activities'], weight: 0.95 },
      { id: 'activities-page', allOf: ['سرگرمی'], anyOf: ['کھولو', 'صفحہ'], weight: 1 },
    ],
  },

  // ── Search ─────────────────────────────────────────────────
  {
    code: IntentCode.FIND_PERSON,
    category: IntentCategory.SEARCH,
    baseStrength: 0.86,
    patterns: [
      { id: 'find-person', allOf: ['تلاش'], anyOf: ['کارکن', 'شخص', 'نام'], weight: 1 },
      { id: 'find-worker', anyOf: ['کارکن تلاش', 'ڈھونڈو کارکن', 'تلاش کرو'], weight: 1 },
      { id: 'who-is', anyOf: ['کون ہے', 'ڈھونڈو'], weight: 0.8 },
    ],
  },
  {
    code: IntentCode.FIND_RUKN,
    category: IntentCategory.SEARCH,
    baseStrength: 0.86,
    patterns: [
      { id: 'find-rukn', allOf: ['تلاش'], anyOf: ['رکن'], weight: 1 },
      { id: 'rukn-search', anyOf: ['رکن تلاش', 'رکن ڈھونڈو'], weight: 1.05 },
    ],
  },
  {
    code: IntentCode.FIND_CAMPAIGN,
    category: IntentCategory.SEARCH,
    baseStrength: 0.84,
    patterns: [
      { id: 'find-campaign', allOf: ['تلاش'], anyOf: ['مہم'], weight: 1 },
    ],
  },

  // ── Administration ─────────────────────────────────────────
  {
    code: IntentCode.GENERATE_REPORT,
    category: IntentCategory.ADMINISTRATION,
    baseStrength: 0.88,
    patterns: [
      { id: 'generate-report', allOf: ['رپورٹ'], anyOf: ['تیار', 'بناؤ', 'بنائیں', 'generate', 'پی ڈی ایف'], weight: 1.1 },
      { id: 'mehm-report', anyOf: ['مہم رپورٹ', 'جائزہ رپورٹ'], weight: 1.05 },
    ],
  },
  {
    code: IntentCode.ASSIGN_WORKER,
    category: IntentCategory.ADMINISTRATION,
    baseStrength: 0.86,
    patterns: [
      { id: 'assign', allOf: ['تفویض'], anyOf: ['کارکن', 'مقرر'], weight: 1 },
      { id: 'assign-alt', anyOf: ['تفویض کر', 'assign'], weight: 0.95 },
    ],
  },
  {
    code: IntentCode.ADD_WORKER,
    category: IntentCategory.ADMINISTRATION,
    baseStrength: 0.86,
    patterns: [
      { id: 'add-worker', allOf: ['کارکن'], anyOf: ['شامل', 'نیا', 'اضافہ', 'add'], weight: 1 },
    ],
  },
  {
    code: IntentCode.EDIT_WORKER,
    category: IntentCategory.ADMINISTRATION,
    baseStrength: 0.86,
    patterns: [
      { id: 'edit-worker', allOf: ['کارکن'], anyOf: ['ترمیم', 'تبدیل', 'edit', 'درست'], weight: 1 },
    ],
  },

  // ── Conversation ───────────────────────────────────────────
  {
    code: IntentCode.HELP,
    category: IntentCategory.CONVERSATION,
    baseStrength: 0.9,
    patterns: [
      { id: 'help', anyOf: ['مدد', 'ہیلپ', 'کیا کر سکتے', 'help'], weight: 1 },
    ],
  },
  {
    code: IntentCode.REPEAT,
    category: IntentCategory.CONVERSATION,
    baseStrength: 0.9,
    patterns: [
      { id: 'repeat', anyOf: ['دہرائیں', 'دہراؤ', 'پھر سے سنا', 'repeat'], weight: 1 },
    ],
  },
  {
    code: IntentCode.CANCEL,
    category: IntentCategory.CONVERSATION,
    baseStrength: 0.92,
    patterns: [
      { id: 'cancel', anyOf: ['منسوخ', 'روکو', 'رک جاؤ', 'cancel', 'بند کرو'], weight: 1 },
    ],
  },
  {
    code: IntentCode.CONTINUE,
    category: IntentCategory.CONVERSATION,
    baseStrength: 0.88,
    patterns: [
      { id: 'continue', anyOf: ['جاری', 'آگے بڑھو', 'continue'], weight: 1 },
    ],
  },
  {
    code: IntentCode.NEXT,
    category: IntentCategory.CONVERSATION,
    baseStrength: 0.9,
    patterns: [
      { id: 'next', anyOf: ['اگلا', 'اگلی', 'next'], weight: 1 },
    ],
  },
  {
    code: IntentCode.PREVIOUS,
    category: IntentCategory.CONVERSATION,
    baseStrength: 0.9,
    patterns: [
      { id: 'previous', anyOf: ['پچھلا', 'پچھلی', 'سابقہ', 'previous'], weight: 1 },
    ],
  },
  {
    code: IntentCode.START_OVER,
    category: IntentCategory.CONVERSATION,
    baseStrength: 0.9,
    patterns: [
      { id: 'start-over', anyOf: ['شروع سے', 'نئے سرے', 'ری سیٹ', 'start over'], weight: 1 },
    ],
  },
]

export function getIntentDefinition(code: IntentCode): IntentDefinition | undefined {
  return INTENT_REGISTRY.find((d) => d.code === code)
}

export function listIntentCodes(): readonly IntentCode[] {
  return INTENT_REGISTRY.map((d) => d.code)
}
