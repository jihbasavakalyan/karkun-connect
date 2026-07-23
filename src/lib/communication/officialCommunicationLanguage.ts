/**
 * KC-0099 — Official Communication Language Standard.
 * Product charter: every Official Communication reflects Jamaat ethos —
 * ذمہ داری، پیش رفت، اجتماعی کوشش، رہنمائی، حوصلہ افزائی، اقامتِ دین.
 */

/** Phrases that must never appear in Official Communications. */
export const FORBIDDEN_COMMUNICATION_PHRASES = [
  'نرم',
  'Friendly Reminder',
  'Gentle Reminder',
  'Reminder',
  'Follow-up Reminder',
  'Urgent',
  'Immediate Action Required',
  'جب بھی فرصت ملے',
  'اگر ممکن ہو',
  'ہو سکے تو',
  'کوئی جلدی نہیں',
  'جب مناسب سمجھیں',
  'آپ نے ابھی تک',
  'ابھی تک اندراج موصول نہیں ہوا',
  'ابھی تک اپ ڈیٹ نہیں کیا',
  'یاددہانی',
  'جب موقع ملے',
  'جب سہولت ہو',
] as const

/** Preferred expressions that should appear naturally in Official Communications. */
export const PREFERRED_COMMUNICATION_EXPRESSIONS = [
  'ان شاء اللہ',
  'ذمہ داری',
  'مہم کا اگلا مرحلہ',
  'پیش رفت',
  'باہمی تعاون',
  'اجتماعی کوشش',
  'رہنمائی',
  'حوصلہ افزائی',
  'اقامتِ دین',
] as const

export type LanguageComplianceResult = {
  ok: boolean
  forbiddenHits: string[]
}

export function checkOfficialLanguageCompliance(body: string): LanguageComplianceResult {
  const forbiddenHits = FORBIDDEN_COMMUNICATION_PHRASES.filter((phrase) => {
    if (/^[A-Za-z]/.test(phrase)) {
      return new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(
        body,
      )
    }
    return body.includes(phrase)
  })
  return { ok: forbiddenHits.length === 0, forbiddenHits }
}

export function karkunWordForCount(count: number): string {
  return count === 1 ? 'کارکن' : 'کارکنان'
}

export const OFFICIAL_COMMUNICATION_STRUCTURE = [
  'Opening — السلام علیکم ورحمۃ اللہ وبرکاتہ',
  'Dua — sincere dua for the recipient',
  'Purpose — campaign context',
  'Responsibility — link to اقامتِ دین',
  'Expected Action — next campaign step (guiding, not commanding)',
  'Coordination — Karkun Connect as facilitation medium only',
  'Closing Dua',
  'Closing — جزاکم اللہ خیراً',
] as const
