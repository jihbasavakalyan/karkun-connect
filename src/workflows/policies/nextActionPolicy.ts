/**
 * KC-035C — Map remaining secretary labels → next intent suggestions.
 */

import { IntentCode } from '@/intents'

export type RemainingSuggestion = {
  readonly intent: IntentCode
  readonly labelUrdu: string
}

export function suggestNextFromRemaining(
  remainingLabels: readonly string[],
): RemainingSuggestion | null {
  for (const label of remainingLabels) {
    const lower = label.toLowerCase()
    if (label.includes('ملاقات')) {
      return { intent: IntentCode.RECORD_VISIT, labelUrdu: 'ملاقات' }
    }
    if (
      label.includes('ایپ') ||
      /jih/i.test(lower) ||
      label.includes('رجسٹریشن') ||
      label.includes('اندراج')
    ) {
      return { intent: IntentCode.RECORD_APP_REGISTRATION, labelUrdu: 'ایپ رجسٹریشن' }
    }
    if (label.includes('اجتماع') || label.includes('حاضری')) {
      return { intent: IntentCode.RECORD_ATTENDANCE, labelUrdu: 'ہفتہ وار اجتماع' }
    }
    if (label.includes('بیت') || label.includes('المال')) {
      return { intent: IntentCode.RECORD_BAITUL_MAAL, labelUrdu: 'بیت المال' }
    }
  }
  return null
}
