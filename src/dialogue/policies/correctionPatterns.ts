/**
 * KC-035D — Detect correction / repair utterances (dialogue policy only).
 */

import { normalizeUrdu } from '@/intents'

const CORRECTION_MARKERS = [
  'غلط',
  'نہیں وہ نہیں',
  'وہ نہیں',
  'مراد نہیں',
  'درست نہیں',
  'تصحیح',
  'بدلو',
  'دوسرا',
  'دوسری',
  'نہیں نہیں',
] as const

export function isCorrectionUtterance(utterance: string): boolean {
  const n = normalizeUrdu(utterance)
  return CORRECTION_MARKERS.some((m) => n.includes(normalizeUrdu(m)))
}
