import type {
  TrainingOrganisationalCategory,
  TrainingPaymentMethod,
  TrainingPaymentStatus,
  TrainingRegistrationStatus,
} from './types.js'

export function trainingPaymentStatusLabel(status: TrainingPaymentStatus): string {
  if (status === 'paid_cash') return 'Cash Paid'
  if (status === 'cash_pending') return 'Cash Pending'
  if (status === 'paid_upi') return 'UPI Paid'
  if (status === 'upi_pending') return 'UPI Pending'
  if (status === 'paid_online') return 'Paid Online'
  return 'Unpaid'
}

export function trainingAcknowledgementPaymentLabel(
  status: TrainingPaymentStatus,
  cashPaidToName?: string | null,
): string {
  if (status === 'cash_pending') return 'Cash — Pay at Ijtema Gah'
  if (status === 'paid_cash') {
    const collector = String(cashPaidToName || '').trim()
    return collector ? `Cash Paid To: ${collector}` : 'Cash Paid'
  }
  if (status === 'upi_pending') return 'Payment verification pending'
  if (status === 'paid_upi') return 'UPI Payment — Paid'
  if (status === 'paid_online') return 'Online Payment — Paid'
  return 'Payment pending'
}

export function trainingPaymentMethodLabel(method: TrainingPaymentMethod): string {
  if (method === 'upi') return 'UPI'
  if (method === 'online') return 'Online'
  return 'Cash'
}

export function trainingRegistrationStatusLabel(status: TrainingRegistrationStatus): string {
  return status === 'complete' ? 'Registered' : 'Submitted'
}

export function trainingOrganisationalCategoryLabel(
  category: TrainingOrganisationalCategory,
): string {
  if (category === 'rukn') return 'Rukn'
  if (category === 'karkun') return 'Karkun'
  if (category === 'muttafiq') return 'Muttafiq'
  return 'Other'
}
