/**
 * KC-035E — Centralized recommendation Urdu (administrative secretary tone).
 */

export const RECOMMENDATION_URDU = {
  nextBestPrefix: 'اب اگلا مناسب قدم یہ ہے۔',
  dailyHeader: 'آج کی عملی صورتحال یہ ہے۔',
  noPending: 'الحمد للہ، اس وقت کوئی فوری کارروائی باقی نہیں۔',
  personHeader: (name: string) => `${name} کے لیے سفارش یہ ہے۔`,
  priorityLine: (label: string, reason: string) => `${label} — ${reason}`,
  remainingLine: (label: string) => `${label} باقی ہے۔`,
  countLine: (critical: number, high: number) =>
    `فوری توجہ: ${critical} نازک، ${high} اہم۔`,
} as const
