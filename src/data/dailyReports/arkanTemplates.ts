/**
 * KC-0059 — Urdu templates for Administrator → Arkaan daily campaign communication.
 * Static content only. Placeholders filled by DailyReportService (read-only).
 */

import type { DailyReportTemplate } from '@/types/dailyReport'

export const ARKAAN_DAILY_REPORT_TEMPLATES: DailyReportTemplate[] = [
  {
    id: 'daily-progress',
    name: 'Daily Progress',
    description: 'آج کی مہم کی صورتحال — ارکان کے لیے روزانہ پیش رفت',
    language: 'ur',
    audience: 'arkaan',
    body: `السلام علیکم ورحمة الله وبرکاته

الحمد للہ!
مرکزی مہم **{{campaignName}}** کا آج **{{day}}** مکمل ہوا۔

📊 آج کی صورتحال
• کل کارکن: {{total}}
• رابطہ مکمل: {{connected}}
• باقی: {{remaining}}
• مجموعی پیش رفت: {{progress}}٪

یہ کامیابی اجتماعی کوششوں کا نتیجہ ہے۔
آئیے مزید احساسِ ذمہ داری کے ساتھ مہم کو کامیاب بنانے میں اپنا کردار ادا کریں۔

اللہ تعالیٰ ہماری کوششوں کو قبول فرمائے۔
جزاکم اللہ خیراً`,
  },
  {
    id: 'motivation',
    name: 'Motivation',
    description: 'تحریک و ذمہ داری — ارکان کے لیے حوصلہ افزا پیغام',
    language: 'ur',
    audience: 'arkaan',
    body: `السلام علیکم ورحمة الله وبرکاته

الحمد للہ!
ہماری مہم مسلسل آگے بڑھ رہی ہے۔

ہر رکن کا فعال کردار اس کامیابی کے لیے ضروری ہے۔
آئیے باقی ایام میں مزید ذمہ داری، منصوبہ بندی اور سنجیدگی کے ساتھ حصہ لیں تاکہ مقررہ اہداف بروقت حاصل ہوں۔

اللہ تعالیٰ ہم سب کی محنت قبول فرمائے۔`,
  },
  {
    id: 'final-push',
    name: 'Final Push',
    description: 'آخری مرحلہ — توجہ اور عملی تعاون کی دعوت',
    language: 'ur',
    audience: 'arkaan',
    body: `السلام علیکم ورحمة الله وبرکاته

الحمد للہ!
مہم اپنے اہم مرحلے میں داخل ہو چکی ہے۔

📊 موجودہ پیش رفت
• مکمل رابطے: {{connected}}
• باقی کارکن: {{remaining}}
• باقی دن: {{daysLeft}}

اب ہر رکن کی مزید توجہ اور عملی تعاون کی ضرورت ہے۔
اللہ تعالیٰ ہمیں اخلاص، استقامت اور کامیابی عطا فرمائے۔
آمین۔`,
  },
]

export function getArkaanDailyReportTemplate(
  id: string,
): DailyReportTemplate | undefined {
  return ARKAAN_DAILY_REPORT_TEMPLATES.find((template) => template.id === id)
}
