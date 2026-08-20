import type {
  TrainingPaymentMethod,
  TrainingPaymentStatus,
  TrainingRegistrationStatus,
} from './types'

export function trainingPaymentStatusLabel(status: TrainingPaymentStatus): string {
  if (status === 'paid_cash') return 'Cash Paid'
  if (status === 'cash_pending') return 'Cash Payment Pending'
  if (status === 'paid_online') return 'Paid Online'
  return 'Unpaid'
}

export function trainingPaymentMethodLabel(method: TrainingPaymentMethod): string {
  return method === 'online' ? 'Online' : 'Cash'
}

export function trainingRegistrationStatusLabel(status: TrainingRegistrationStatus): string {
  return status === 'complete' ? 'Registered' : 'Submitted'
}
