import type {
  TrainingOrganisationalCategory,
  TrainingPaymentMethod,
  TrainingPaymentStatus,
  TrainingRegistrationStatus,
} from './types'

export function trainingPaymentStatusLabel(status: TrainingPaymentStatus): string {
  if (status === 'paid_cash') return 'Cash Paid'
  if (status === 'cash_pending') return 'Cash Pending'
  if (status === 'paid_upi') return 'UPI Paid'
  if (status === 'upi_pending') return 'UPI Pending'
  if (status === 'paid_online') return 'Paid Online'
  return 'Unpaid'
}

export function trainingAcknowledgementPaymentLabel(status: TrainingPaymentStatus): string {
  if (status === 'cash_pending') return 'Cash Payment — Pending'
  if (status === 'paid_cash') return 'Cash Payment — Paid'
  if (status === 'upi_pending') return 'UPI Payment — Awaiting Verification'
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
