/**
 * Official WhatsApp communication templates (KC-006 Version 1).
 *
 * Philosophy: respectful, warm Urdu; Salam opening; no "ہماری جماعت" / "آپ کی جماعت".
 * Footers are appended at compose/send time (personal vs official) — not stored in body.
 * Placeholders use {name} style and are replaced before sending.
 */

import type { MessageTemplate, TemplateCategory, TemplateFooterMode } from '@/types/communication'

const now = new Date().toISOString()

function official(
  id: string,
  name: string,
  category: TemplateCategory,
  body: string,
  variables: string[],
): MessageTemplate {
  return {
    id,
    name,
    category,
    body,
    variables,
    isActive: true,
    isOfficial: true,
    footerMode: 'personal',
    createdAt: now,
    updatedAt: now,
    updatedBy: 'System',
  }
}

/** Personal (Rukn → Karkun) closing. */
export const PERSONAL_MESSAGE_FOOTER = `جزاکم اللہ خیراً

والسلام`

/** Official (Administrator) closing. */
export const OFFICIAL_MESSAGE_FOOTER = `جزاکم اللہ خیراً

والسلام

جماعت اسلامی ہند
بسواکلیان`

export function getMessageFooter(mode: TemplateFooterMode): string {
  return mode === 'official' ? OFFICIAL_MESSAGE_FOOTER : PERSONAL_MESSAGE_FOOTER
}

/**
 * Official Version 1 template library.
 * Bodies intentionally omit footer lines — footers are applied by role at send time.
 */
export const OFFICIAL_WHATSAPP_TEMPLATES: MessageTemplate[] = [
  official(
    'tpl-welcome',
    'Welcome',
    'first-contact',
    `السلام علیکم {name}

آپ کا خیرمقدم۔ اللہ تعالیٰ ہمیں ایک دوسرے کے لیے باعثِ خیر بنائے۔

اللہ آپ کو صحت و عافیت عطا فرمائے۔`,
    ['name'],
  ),
  official(
    'tpl-visit-reminder',
    'Visit Reminder',
    'meeting-reminder',
    `السلام علیکم {name}

آپ سے ملاقات کی یاددہانی ہے۔
تاریخ: {date}
وقت: {time}

ان شاء اللہ جلد ملاقات ہوگی۔ اللہ آسانیاں عطا فرمائے۔`,
    ['name', 'date', 'time'],
  ),
  official(
    'tpl-ijtema',
    'Weekly Ijtema Reminder',
    'weekly-ijtema',
    `السلام علیکم {name}

ہفتہ وار اجتماع کی یاددہانی ہے۔
تاریخ: {date}
وقت: {time}
مقام: {venue}

آپ کی موجودگی باعثِ خوشی ہوگی۔ اللہ ہمیں استفادہ کی توفیق دے۔`,
    ['name', 'date', 'time', 'venue'],
  ),
  official(
    'tpl-orientation',
    'Orientation Invitation',
    'meeting-reminder',
    `السلام علیکم {name}

آپ کو تعارفی نشست میں مدعو کیا جاتا ہے۔
تاریخ: {date}
وقت: {time}
مقام: {venue}

اللہ تعالیٰ اس نشست کو بابرکت بنائے۔`,
    ['name', 'date', 'time', 'venue'],
  ),
  official(
    'tpl-jih-registration',
    'JIH Registration Reminder',
    'monthly-report',
    `السلام علیکم {name}

JIH رجسٹریشن ابھی مکمل نہیں ہوئی۔ جب موقع ملے تو مکمل کر لیجیے۔
اگر مدد درکار ہو تو بتائیے۔

اللہ آسانیاں عطا فرمائے۔`,
    ['name'],
  ),
  official(
    'tpl-baitul-maal',
    'Monthly Bait-ul-Maal Reminder',
    'baitul-maal',
    `السلام علیکم {name}

{month} کے بیت المال کی نرم یاددہانی ہے۔ جب ممکن ہو تو ادا فرما دیجیے۔

اللہ قبول فرمائے اور برکت عطا کرے۔`,
    ['name', 'month'],
  ),
  official(
    'tpl-quran-study',
    "Qur'an Study Reminder",
    'follow-up',
    `السلام علیکم {name}

قرآن مجید مع ترجمہ کی باقاعدہ تلاوت و مطالعہ کی نرم یاددہانی ہے۔
آج کچھ آیات ضرور پڑھ لیجیے۔

اللہ فہم و عمل کی توفیق دے۔`,
    ['name'],
  ),
  official(
    'tpl-hadith-study',
    'Hadith Study Reminder',
    'follow-up',
    `السلام علیکم {name}

حدیث کا مطالعہ جاری رکھنے کی نرم یاددہانی ہے۔
آج ایک حدیث ضرور پڑھ لیجیے۔

اللہ سمجھ اور عمل کی توفیق دے۔`,
    ['name'],
  ),
  official(
    'tpl-islamic-literature',
    'Islamic Literature Reminder',
    'follow-up',
    `السلام علیکم {name}

اسلامی ادب کے مطالعہ کی نرم یاددہانی ہے۔
کچھ صفحات ضرور پڑھ لیجیے۔

اللہ علم نافع عطا فرمائے۔`,
    ['name'],
  ),
  official(
    'tpl-development-follow-up',
    'Development Follow-up',
    'follow-up',
    `السلام علیکم {name}

تربیت و ترقی کے سلسلے میں آپ سے رابطہ کر رہا/رہی ہوں۔
آپ کا حال خیر ہو، اور معمولات کیسے چل رہے ہیں؟

اللہ ترقیِ دینی کی توفیق دے۔`,
    ['name'],
  ),
  official(
    'tpl-missed-ijtema',
    'Missed Ijtema Reminder',
    'weekly-ijtema',
    `السلام علیکم {name}

پچھلے ہفتہ وار اجتماع میں آپ کی غیرموجودگی محسوس ہوئی۔
امید ہے سب خیریت سے ہے۔ اگلے اجتماع میں ضرور تشریف لائیے۔

اللہ صحت و توفیق عطا فرمائے۔`,
    ['name'],
  ),
  official(
    'tpl-thank-you',
    'Thank You Message',
    'greetings',
    `السلام علیکم {name}

آپ کی شرکت اور تعاون کا دل سے شکریہ۔
اللہ آپ کے اس عمل کو قبول فرمائے اور مزید خیر کی توفیق دے۔`,
    ['name'],
  ),
  official(
    'tpl-event-invitation',
    'Event Invitation',
    'campaign-update',
    `السلام علیکم {name}

آپ کو {event} میں مدعو کیا جاتا ہے۔
تاریخ: {date}
وقت: {time}
مقام: {venue}

آپ کی موجودگی باعثِ خوشی ہوگی۔ اللہ بابرکت بنائے۔`,
    ['name', 'event', 'date', 'time', 'venue'],
  ),
  official(
    'tpl-campaign-announcement',
    'Campaign Announcement',
    'campaign-update',
    `السلام علیکم {name}

{campaign} کی مختصر اطلاع۔
تفصیل جلد شیئر کی جائے گی۔

اللہ کامیابی عطا فرمائے۔`,
    ['name', 'campaign'],
  ),
  official(
    'tpl-eid-greeting',
    'Eid Greeting',
    'greetings',
    `السلام علیکم {name}

عید مبارک!
اللہ آپ اور آپ کے گھر والوں کو خوشی، امن اور برکت عطا فرمائے۔`,
    ['name'],
  ),
  official(
    'tpl-ramadan-greeting',
    'Ramadan Greeting',
    'greetings',
    `السلام علیکم {name}

رمضان المبارک!
اللہ اس مقدس مہینے میں عبادت، دعا اور خیر کی توفیق عطا فرمائے۔`,
    ['name'],
  ),
  official(
    'tpl-muharram-greeting',
    'Muharram Greeting',
    'greetings',
    `السلام علیکم {name}

محرم الحرام کی آمد پر دعائیں۔
اللہ ہمیں صبر، ہدایت اور عملِ صالح کی توفیق دے۔`,
    ['name'],
  ),
]

/** @deprecated Prefer OFFICIAL_WHATSAPP_TEMPLATES — kept as alias for store seed. */
export const DEFAULT_MESSAGE_TEMPLATES = OFFICIAL_WHATSAPP_TEMPLATES
