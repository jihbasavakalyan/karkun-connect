/**
 * KC-035A — Secretary conversation style (centralized Urdu).
 * Experienced Jamaat secretary tone — no "Opening…/Loading…/Processing…".
 */

export const SECRETARY_URDU = {
  acknowledge: 'جی۔',
  situationBrief: 'اس کارکن کی تازہ صورتحال یہ ہے۔',
  saved: 'جی، محفوظ کر دیا گیا۔',
  oneMoreAction: 'مزید ایک کارروائی باقی ہے۔',
  askWhichPerson: 'آپ کس کی بات کر رہے ہیں؟',
  noActivePerson: 'کس کارکن یا رکن کی بات کر رہے ہیں؟',
  noActiveCampaign: 'کس مہم کی بات کر رہے ہیں؟',
  clarified: 'جی، سمجھ گیا۔',
  waiting: 'میں حاضر ہوں — اگلا حکم دیجئیے۔',
  cancelled: 'ٹھیک ہے، یہ کارروائی روک دی گئی۔',
  completed: 'الحمد للہ، یہ مرحلہ مکمل ہو گیا۔',
  ambiguousPersonHeader: 'دو کارکن اس نام سے موجود ہیں۔',
  ambiguousManyHeader: 'اس نام سے متعدد افراد موجود ہیں۔',
} as const

export type SecretaryUrduKey = keyof typeof SECRETARY_URDU

export function secretaryLine(key: SecretaryUrduKey): string {
  return SECRETARY_URDU[key]
}
