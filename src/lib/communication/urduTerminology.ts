/**
 * KC-0125 — Standard Urdu terminology dictionary for all communication.
 * Content-only; no business logic.
 */

/** Preferred terms — use consistently across templates, Notify drafts, reports, and UI copy. */
export const URDU_PREFERRED = {
  pendingMatters: 'امور زیر التواء',
  details: 'تفصیلات',
  progress: 'پیش رفت',
  responsibility: 'ذمہ داری',
  completion: 'تکمیل',
  connected: 'منسلک',
  connectedWorkers: 'منسلک کارکنان',
  notConnected: 'غیر منسلک',
  reminderGuidance: 'رہنمائی', // not یاددہانی
  responsibilitySummary: 'خلاصۂ ذمہ داریاں',
  visit: 'ملاقات',
  weeklyIjtema: 'ہفتہ وار اجتماع',
  baitulMaal: 'بیت المال',
  jihApp: 'JIH Reporting App',
  jihAppUrdu: 'جے آئی ایچ رپورٹنگ ایپ',
  followUp: 'پیروی',
  greeting: 'السلام علیکم ورحمۃ اللہ وبرکاتہ',
  closingWassalam: 'والسلام',
  closingJazakallah: 'جزاکم اللہ خیراً',
  duaAccept: 'اللہ تعالیٰ آپ کی کوششوں کو قبول فرمائے۔',
} as const

/** Terms / English UI words that must not appear in Urdu communication. */
export const URDU_AVOID = [
  'اپ ڈیٹ',
  'اپ ڈیٹس',
  'اسٹیٹس',
  'ٹاسک',
  'ریمائنڈر',
  'ایکشن',
  'یاددہانی',
  'نرم یاددہانی',
  'رابطہ مکمل',
  'Friendly Reminder',
  'Gentle Reminder',
  'Reminder',
  'Urgent',
  'Immediate Action Required',
] as const

/** Mapping: legacy wording → approved wording. */
export const URDU_TERMINOLOGY_MAP: ReadonlyArray<{ from: string; to: string; note: string }> = [
  {
    from: 'رابطہ مکمل',
    to: 'منسلک کارکنان',
    note: 'Assignment / connection count — not completed outreach',
  },
  {
    from: 'مربوط کارکن',
    to: 'منسلک کارکنان',
    note: 'Standardize connection terminology',
  },
  {
    from: 'خلاصہ: N امور زیر التواء',
    to: 'آپ کی ذمہ داری سے متعلق درج ذیل امور زیر التواء ہیں۔',
    note: 'Never use bare counts; list specific matters',
  },
  {
    from: 'یاددہانی',
    to: 'رہنمائی / ذمہ داری کی تفصیلات',
    note: 'Official charter forbids reminder framing',
  },
  {
    from: 'اپ ڈیٹ',
    to: 'پیش رفت',
    note: 'Avoid English UI calque',
  },
  {
    from: 'اسٹیٹس',
    to: 'صورتِ حال / حیثیت',
    note: 'Avoid English UI calque',
  },
]
