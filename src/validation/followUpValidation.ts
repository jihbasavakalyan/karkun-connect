import { getAssignmentById } from '@/stores/assignmentStore'
import { getPendingFollowUpForAssignment } from '@/stores/followUpStore'
import type { FollowUpInput } from '@/types/followUp'

export type FollowUpValidationResult = { valid: true } | { valid: false; error: string }

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function validateFollowUpDate(followUpDate: string): FollowUpValidationResult {
  if (!followUpDate.trim()) {
    return { valid: false, error: 'Follow-up date is required.' }
  }

  if (followUpDate < todayIsoDate()) {
    return { valid: false, error: 'Follow-up date cannot be earlier than today.' }
  }

  return { valid: true }
}

export function validateFollowUpPurpose(purpose: string): FollowUpValidationResult {
  if (!purpose.trim()) {
    return { valid: false, error: 'Follow-up purpose is required.' }
  }
  return { valid: true }
}

export function validateActiveAssignmentForFollowUp(assignmentId: string): FollowUpValidationResult {
  const assignment = getAssignmentById(assignmentId)
  if (!assignment || assignment.status !== 'Active') {
    return { valid: false, error: 'Follow-ups can only be created for active assignments.' }
  }
  return { valid: true }
}

export function validateNoActiveFollowUpForAssignment(
  assignmentId: string,
): FollowUpValidationResult {
  const pending = getPendingFollowUpForAssignment(assignmentId)
  if (pending) {
    return {
      valid: false,
      error: 'This assignment already has an active follow-up. Complete it before creating another.',
    }
  }
  return { valid: true }
}

export function validateFollowUpInput(input: FollowUpInput): FollowUpValidationResult {
  const checks = [
    validateFollowUpDate(input.followUpDate),
    validateFollowUpPurpose(input.purpose),
    validateActiveAssignmentForFollowUp(input.assignmentId),
    validateNoActiveFollowUpForAssignment(input.assignmentId),
  ]

  for (const check of checks) {
    if (!check.valid) return check
  }

  return { valid: true }
}

export function validateAnnexureFollowUpFields(
  followUpRequired: 'yes' | 'no' | '',
  followUpDate: string,
  followUpPurpose: string,
): FollowUpValidationResult {
  if (!followUpRequired) {
    return { valid: false, error: 'Select whether follow-up is required.' }
  }

  if (followUpRequired === 'no') {
    return { valid: true }
  }

  const dateCheck = validateFollowUpDate(followUpDate)
  if (!dateCheck.valid) return dateCheck

  return validateFollowUpPurpose(followUpPurpose)
}
