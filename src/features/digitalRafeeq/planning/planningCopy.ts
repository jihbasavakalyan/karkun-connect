/**
 * Approved Urdu copy for Digital Rafeeq planning (KC-009).
 */

export const PLANNING_CLOSING_MESSAGE = `جزاکم اللہ خیراً۔

آپ کی سہولت کے مطابق ایک لائحۂ عمل ترتیب دے دیا گیا ہے۔

اگر آپ مناسب سمجھیں تو اسی کے مطابق پیش رفت کی جا سکتی ہے۔

ان شاء اللہ، اس لائحۂ عمل پر عمل آوری میں، مناسب اوقات پر یاد دہانی، پیش رفت کے جائزے اور حسبِ ضرورت تجاویز کے ذریعے میں آپ کی مدد کرتا رہوں گا۔

اللہ تعالیٰ اس کوشش میں خیر و برکت عطا فرمائے۔

آمین۔`

export function planningIntro(karkunName: string): string {
  return `السلام علیکم۔

آپ بحیثیتِ مربی، ${karkunName} صاحب سے رابطے کی ذمہ داری قبول کر چکے ہیں۔

آئیے، آپ کی سہولت کے مطابق ایک لائحۂ عمل ترتیب دیتے ہیں تاکہ رابطے کا سلسلہ آسانی سے آگے بڑھ سکے۔`
}

export function askWhen(karkunName: string): string {
  return `آپ کی سہولت کے مطابق ${karkunName} صاحب سے پہلا رابطہ کب کرنا مناسب رہے گا؟`
}

export function askChannel(karkunName: string): string {
  return `آپ کے خیال میں ${karkunName} صاحب سے پہلا رابطہ کس ذریعے سے کرنا زیادہ مناسب ہوگا؟`
}

export function askVisitTime(): string {
  return 'بالمشافہ ملاقات کے لیے آپ کا پسندیدہ وقت کیا ہے؟'
}

export function presentSuggestedPlan(summary: string): string {
  return `آپ کی سہولت کے مطابق ایک لائحۂ عمل ترتیب دے دیا گیا ہے۔

${summary}`
}

export const WHEN_OPTIONS = [
  { id: 'today' as const, label: 'آج' },
  { id: 'tomorrow' as const, label: 'کل' },
  { id: 'this-week' as const, label: 'اس ہفتے' },
  { id: 'custom' as const, label: 'تاریخ منتخب کریں' },
]

export const CHANNEL_OPTIONS = [
  { id: 'visit' as const, label: 'بالمشافہ ملاقات' },
  { id: 'call' as const, label: 'فون کال' },
  { id: 'whatsapp' as const, label: 'واٹس ایپ' },
  { id: 'ijtema' as const, label: 'اجتماع' },
]

export const TIME_OPTIONS = [
  { id: 'morning' as const, label: 'صبح' },
  { id: 'afternoon' as const, label: 'دوپہر' },
  { id: 'evening' as const, label: 'شام' },
  { id: 'custom' as const, label: 'مخصوص وقت' },
]
