import type { BaitulMaalStatus, UpdateBaitulMaalInput } from '@/types/baitulMaal'

export type BaitulMaalValidationResult = { valid: true } | { valid: false; error: string }

export function validateBaitulMaalUpdate(
  input: UpdateBaitulMaalInput,
): BaitulMaalValidationResult {
  if (input.status === 'Paid' && !input.paymentDate?.trim()) {
    return {
      valid: false,
      error: 'Contribution date is required when status is Paid.',
    }
  }

  if (input.status === 'Exempt') {
    // Exempt does not require a contribution date or amount.
  }

  if (input.amount !== undefined && input.amount < 0) {
    return {
      valid: false,
      error: 'Amount cannot be negative.',
    }
  }

  return { valid: true }
}

export function validateBulkBaitulMaalUpdate(
  karkunIds: string[],
  status: BaitulMaalStatus,
  paymentDate?: string,
): BaitulMaalValidationResult {
  if (karkunIds.length === 0) {
    return { valid: false, error: 'Select at least one Karkun.' }
  }

  if (status === 'Paid' && !paymentDate?.trim()) {
    return {
      valid: false,
      error: 'Contribution date is required when marking as Paid.',
    }
  }

  return { valid: true }
}
