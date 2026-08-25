/** Bounded operational event for the 13 Sep 2026 Tarbiyati Ijtema. Not a Programme Master. */

export const TRAINING_GATHERING_EVENT = {
  id: 'training-gathering-2026-09-13',
  campaignTitleUrdu: 'فعال کارکن، فعال رکن، فعال جماعت',
  eventTitleUrdu: 'تربیتی اجتماع',
  eventTitleEn: 'Tarbiyati Ijtema',
  dateLabel: '13 September 2026 • Sunday',
  dateUrdu: '13 ستمبر 2026',
  dateCombined: '13 ستمبر 2026 / 13 September 2026',
  venue: 'RG Palace Function Hall',
  city: 'Basavakalyan',
  feeInr: 100,
} as const

/** Official supplied UPI QR artwork — served as-is from public/branding. */
export const TARBIYATI_IJTEMA_UPI_QR_SRC = '/branding/tarbiyati-ijtema-upi-qr.jpeg'

/** Authoritative Canara Bank VPA from the supplied official QR payload. Do not substitute. */
export const TARBIYATI_IJTEMA_UPI_VPA = '60741256000495@cnrb'

/**
 * Payee name encoded in the official QR (`pn=`).
 * Exact QR payload value — do not invent or "correct" it.
 */
export const TARBIYATI_IJTEMA_UPI_PAYEE_NAME = 'JAMAATEISLAMI HIND'

export const TARBIYATI_IJTEMA_UPI_CURRENCY = 'INR'

export type TrainingGatheringEventId = typeof TRAINING_GATHERING_EVENT.id

export type TarbiyatiUpiApp = 'gpay' | 'phonepe' | 'paytm'

export type TarbiyatiUpiLaunchPlatform = 'ios' | 'android' | 'desktop'

export const TARBIYATI_IJTEMA_UPI_APP_OPTIONS: ReadonlyArray<{
  id: TarbiyatiUpiApp
  label: string
}> = [
  { id: 'gpay', label: 'Google Pay' },
  { id: 'phonepe', label: 'PhonePe' },
  { id: 'paytm', label: 'Paytm' },
]

const TARBIYATI_IJTEMA_UPI_APP_SCHEMES: Record<TarbiyatiUpiApp, string> = {
  gpay: 'gpay://upi/pay',
  phonepe: 'phonepe://upi/pay',
  paytm: 'paytm://upi/pay',
}

/**
 * Encode UPI query values. `@` is restored after encodeURIComponent so the VPA
 * remains parseable by UPI apps while remaining values (including spaces) stay encoded.
 */
export function encodeTarbiyatiIjtemaUpiQueryValue(value: string): string {
  return encodeURIComponent(value).replace(/%40/g, '@')
}

export function buildTarbiyatiIjtemaUpiQuery(): string {
  const params: Array<[string, string]> = [
    ['pa', TARBIYATI_IJTEMA_UPI_VPA],
    ['pn', TARBIYATI_IJTEMA_UPI_PAYEE_NAME],
    ['am', String(TRAINING_GATHERING_EVENT.feeInr)],
    ['cu', TARBIYATI_IJTEMA_UPI_CURRENCY],
  ]
  return params.map(([key, value]) => `${key}=${encodeTarbiyatiIjtemaUpiQueryValue(value)}`).join('&')
}

/**
 * Generic NPCI UPI intent. Android chooser / unsupported-environment fallback only.
 * Do not use as the primary iPhone same-device payment button.
 * Opening this URI is not payment confirmation.
 */
export function buildTarbiyatiIjtemaUpiPayUri(): string {
  return `upi://pay?${buildTarbiyatiIjtemaUpiQuery()}`
}

export function buildTarbiyatiIjtemaUpiAppUri(app: TarbiyatiUpiApp): string {
  return `${TARBIYATI_IJTEMA_UPI_APP_SCHEMES[app]}?${buildTarbiyatiIjtemaUpiQuery()}`
}

export function detectTarbiyatiUpiLaunchPlatform(userAgent: string): TarbiyatiUpiLaunchPlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios'
  if (/Android/i.test(userAgent)) return 'android'
  return 'desktop'
}

export function isLikelyMobileUpiClient(userAgent: string): boolean {
  return detectTarbiyatiUpiLaunchPlatform(userAgent) !== 'desktop'
}

export const TARBIYATI_IJTEMA_UPI_DESKTOP_MESSAGE =
  'Open this page on a phone with a UPI app, or scan the QR using another phone.'

export const TARBIYATI_IJTEMA_UPI_NO_APP_MESSAGE =
  'This payment app is not available on this device. Please use another payment option or scan the QR code using another phone.'

export const TARBIYATI_IJTEMA_UPI_QR_FALLBACK_INTRO =
  "Don't have one of these apps or unable to open payment?"

export function formatRegistrationId(mobile10: string): string {
  return `TG260913-${mobile10}`
}
