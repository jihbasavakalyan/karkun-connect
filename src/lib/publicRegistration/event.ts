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

/**
 * Standard NPCI UPI intent for same-device payment.
 * Opening this URI is not payment confirmation.
 */
export function buildTarbiyatiIjtemaUpiPayUri(): string {
  const amount = String(TRAINING_GATHERING_EVENT.feeInr)
  const payee = encodeURIComponent(TARBIYATI_IJTEMA_UPI_PAYEE_NAME)
  return `upi://pay?pa=${TARBIYATI_IJTEMA_UPI_VPA}&pn=${payee}&am=${amount}&cu=${TARBIYATI_IJTEMA_UPI_CURRENCY}`
}

export function isLikelyMobileUpiClient(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod/i.test(userAgent)
}

export const TARBIYATI_IJTEMA_UPI_DESKTOP_MESSAGE =
  'Open this page on a phone with a UPI app, or scan the QR using another phone.'

export const TARBIYATI_IJTEMA_UPI_NO_APP_MESSAGE =
  'No UPI app opened. Install PhonePe, Google Pay, Paytm, or BHIM, then try again — or scan the QR using another phone.'

export function formatRegistrationId(mobile10: string): string {
  return `TG260913-${mobile10}`
}
