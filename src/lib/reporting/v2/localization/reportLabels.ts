/**
 * KC-037C-F — Report localization (Urdu / English). Labels only — not KPIs.
 */

import type { ReportLanguage } from '../types'

type Dict = Record<string, string>

const EN: Dict = {
  connection: 'Connection (administrative assignment)',
  visit: 'Visit (personal physical meeting)',
  connectionProgress: 'Connection Progress',
  visitProgress: 'Visit Progress',
  menPerformance: "Men's Performance",
  womenPerformance: "Women's Performance",
  muttafiqeen: 'Muttafiqeen',
  weeklyIjtema: 'Weekly Ijtema',
  baitulMaal: 'Baitul Maal',
  appRegistration: 'JIH App Registration',
  pending: 'Pending Activities',
  recommendations: 'Recommendations',
  insights: 'Rafeeq Insights',
  auditAppendix: 'Audit Appendix',
  whereAreWe: 'Where are we?',
  achieved: 'What has been achieved?',
  remaining: 'What remains?',
  responsible: 'Who is responsible?',
  action: 'What action should be taken?',
  snapshotOnly: 'Historical comparison unavailable — snapshot only (no period store).',
  topPerformers: 'Top Performers',
  needsAttention: 'Needs Attention',
  rankings: 'Rankings',
  overview: 'Overview',
}

const UR: Dict = {
  connection: 'کنکشن (انتظامی تفویض)',
  visit: 'دورہ (ذاتگی ملاقات)',
  connectionProgress: 'کنکشن کی پیش رفت',
  visitProgress: 'دوروں کی پیش رفت',
  menPerformance: 'مرد ارکان کی کارکردگی',
  womenPerformance: 'خواتین ارکان کی کارکردگی',
  muttafiqeen: 'متفقین',
  weeklyIjtema: 'ہفتہ وار اجتماع',
  baitulMaal: 'بیت المال',
  appRegistration: 'جماعت ایپ رجسٹریشن',
  pending: 'زیر التواء امور',
  recommendations: 'تجاویز',
  insights: 'رفیق بصیرت',
  auditAppendix: 'آڈٹ ضمیمہ',
  whereAreWe: 'ہم کہاں ہیں؟',
  achieved: 'کیا حاصل ہوا؟',
  remaining: 'کیا باقی ہے؟',
  responsible: 'ذمہ دار کون ہے؟',
  action: 'کیا اقدام چاہیے؟',
  snapshotOnly: 'تاریخی موازنہ دستیاب نہیں — صرف موجودہ اسنیپ شاٹ۔',
  topPerformers: 'اعلیٰ کارکردگی',
  needsAttention: 'توجہ درکار',
  rankings: 'درجہ بندی',
  overview: 'جائزہ',
}

export function reportLabel(key: keyof typeof EN, language: ReportLanguage): string {
  if (language === 'en') return EN[key] ?? key
  return UR[key] ?? EN[key] ?? key
}

export function reportLabels(language: ReportLanguage): Dict {
  return language === 'en' ? { ...EN } : { ...UR }
}
