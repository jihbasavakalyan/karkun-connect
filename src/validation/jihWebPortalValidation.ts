import type {
  JihMonthlyReportingStatus,
  JihWebPortalRegistrationStatus,
  UpdateJihMonthlyReportInput,
  UpdateJihRegistrationInput,
} from '@/types/jihWebPortal'
import { getRegistration } from '@/stores/jihWebPortalStore'

export type JihWebPortalValidationResult = { valid: true } | { valid: false; error: string }

export function validateRegistrationUpdate(
  input: UpdateJihRegistrationInput,
): JihWebPortalValidationResult {
  if (input.status === 'Registered' && !input.registrationDate?.trim()) {
    return {
      valid: false,
      error: 'Registration date is required when status is Registered.',
    }
  }

  return { valid: true }
}

export function validateMonthlyReportUpdate(
  input: UpdateJihMonthlyReportInput,
): JihWebPortalValidationResult {
  const registration = getRegistration(input.karkunId)

  if (!registration || registration.status !== 'Registered') {
    return {
      valid: false,
      error: 'Monthly reporting can only be updated for registered Karkuns.',
    }
  }

  return { valid: true }
}

export function canMarkMonthlySubmitted(karkunId: string): JihWebPortalValidationResult {
  const registration = getRegistration(karkunId)
  if (!registration || registration.status !== 'Registered') {
    return {
      valid: false,
      error: 'Monthly reporting cannot be marked Submitted unless registration is Registered.',
    }
  }
  return { valid: true }
}

export function isRegisteredStatus(status: JihWebPortalRegistrationStatus): boolean {
  return status === 'Registered'
}

export function isSubmittedStatus(status: JihMonthlyReportingStatus): boolean {
  return status === 'Submitted'
}
