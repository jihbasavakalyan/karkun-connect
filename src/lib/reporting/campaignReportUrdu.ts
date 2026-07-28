/**
 * KC-0114 Part 3 — Urdu copy for the official Campaign Report.
 */

export const URDU_REPORT = {
  documentTitle: 'مہم کی رپورٹ',
  subtitle: 'کارکن کنیکٹ · سرکاری جائزہ رپورٹ',
  organizationDefault: 'جماعتِ اسلامی ہند · باساواکلیان',

  cover: {
    section: 'سرورق',
    campaignName: 'مہم کا نام',
    campaignDuration: 'مہم کی مدت',
    organization: 'ادارہ / تنظیم',
    reportDate: 'رپورٹ کی تاریخ',
    generatedOn: 'تیار کرنے کا وقت',
    generatedBy: 'تیار کنندہ',
    campaignStatus: 'مہم کی حیثیت',
  },

  sections: {
    cover: 'سرورق',
    executive: 'خلاصۂ ذمہ داریاں',
    achievement: 'مجموعی کارکردگی',
    malePerformance: 'ارکان کی کارکردگی (مرد)',
    femalePerformance: 'ارکان کی کارکردگی (خواتین)',
    pending: 'امور زیر التواء',
    critical: 'خصوصی توجہ کے مستحق ارکان',
    topPerformers: 'نمایاں کارکردگی',
    statistics: 'مجموعی اعداد و شمار',
    recommendations: 'آئندہ کے لیے سفارشات',
  },

  kpi: {
    totalRukns: 'کل ارکان',
    maleRukns: 'مرد ارکان',
    femaleRukns: 'خواتین ارکان',
    totalKarkuns: 'کل کارکن',
    connectedKarkuns: 'منسلک کارکنان',
    connectionPct: 'منسلک ہونے کی شرح',
    visits: 'ملاقاتیں',
    appRegistration: 'جے آئی ایچ رپورٹنگ ایپ',
    weeklyIjtema: 'ہفتہ وار اجتماع',
    baitulMaal: 'بیت المال',
    overallProgress: 'مجموعی پیش رفت',
  },

  columns: {
    rukn: 'رکن',
    assigned: 'کل کارکن',
    connected: 'منسلک کارکنان',
    visits: 'ملاقات',
    appRegistration: 'جے آئی ایچ رپورٹنگ ایپ',
    weeklyIjtema: 'ہفتہ وار اجتماع',
    baitulMaal: 'بیت المال',
    overall: 'مجموعی پیش رفت',
    pending: 'زیر التواء',
    value: 'قدر',
    area: 'شعبہ',
    completed: 'مکمل',
    total: 'کل',
    category: 'زمرہ',
    leader: 'نمایاں رکن',
    result: 'نتیجہ',
    reasons: 'توجہ کی وجوہات',
  },

  achievementAreas: {
    connections: 'منسلک کارکنان',
    visits: 'ملاقاتیں',
    appRegistration: 'جے آئی ایچ رپورٹنگ ایپ',
    weeklyIjtema: 'ہفتہ وار اجتماع',
    baitulMaal: 'بیت المال',
  },

  topCategories: {
    connections: 'منسلک کارکنان',
    visits: 'ملاقاتیں',
    appRegistration: 'جے آئی ایچ رپورٹنگ ایپ',
    weeklyIjtema: 'ہفتہ وار اجتماع',
    baitulMaal: 'بیت المال',
    overall: 'مجموعی پیش رفت',
  },

  empty: {
    noRukns: 'اس سیکشن میں کوئی رکن موجود نہیں۔',
    noPending: 'کسی رکن کے پاس امور زیر التواء نہیں۔',
    noCritical: 'خصوصی توجہ کے مستحق کوئی رکن نہیں ملا۔',
  },

  status: {
    active: 'فعال',
    archived: 'محفوظ شدہ',
    none: 'کوئی فعال مہم نہیں',
    notSet: 'طے شدہ نہیں',
  },

  footer: {
    generatedBy: 'یہ رپورٹ Karkun Connect کے ذریعے تیار کی گئی ہے',
    reportDate: 'رپورٹ کی تاریخ',
    generatedAt: 'تیار کرنے کا وقت',
    page: 'صفحہ',
    of: 'از',
  },

  button: 'مہم کی رپورٹ (PDF)',
} as const

export const URDU_CRITICAL_REASONS = {
  noConnections: 'کوئی منسلک کارکن نہیں',
  lowVisits: 'ملاقاتوں کی تکمیل کم ہے',
  lowWeeklyIjtema: 'ہفتہ وار اجتماع کی حاضری کم ہے',
  lowAppRegistration: 'ایپ رجسٹریشن کم ہے',
  lowBaitulMaal: 'بیت المال کی پیش رفت کم ہے',
  lowOverall: 'مجموعی پیش رفت کم ہے',
} as const
