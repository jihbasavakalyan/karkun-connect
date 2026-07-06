import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import {
  formatMobileValidationError,
  isValidMobileFormat,
  normalizeMobile,
} from '@/lib/mobileValidation'
import { canAssignByGender } from '@/lib/peopleStore'
import type { AssignInput, RemoveInput, ReplaceInput, RestoreInput } from '@/types/assignment'
import {
  getActiveAssignmentForRukn,
  getBlockingAssignmentForRukn,
} from '@/stores/assignmentStore'

export type ValidationResult = { valid: true } | { valid: false; error: string }

function parseDate(value: string): Date | null {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function validateEffectiveDate(effectiveFrom: string): ValidationResult {
  if (!effectiveFrom.trim()) {
    return { valid: false, error: 'Effective date is required.' }
  }

  const date = parseDate(effectiveFrom)
  if (!date) {
    return { valid: false, error: 'Effective date is not valid.' }
  }

  return { valid: true }
}

export function validateRuknActive(ruknId: string): ValidationResult {
  const rukn = getRuknById(ruknId)
  if (!rukn) {
    return { valid: false, error: 'Rukn not found.' }
  }
  if (rukn.status !== 'active') {
    return { valid: false, error: 'Cannot assign to an inactive Rukn.' }
  }
  return { valid: true }
}

export function validateKarkunActive(karkunId: string): ValidationResult {
  const karkun = getKarkunById(karkunId)
  if (!karkun || karkun.isArchived) {
    return { valid: false, error: 'Karkun not found.' }
  }
  if (karkun.status !== 'active') {
    return { valid: false, error: 'Cannot assign an inactive Karkun.' }
  }
  return { valid: true }
}

export function validateKarkunMobile(karkunId: string): ValidationResult {
  const karkun = getKarkunById(karkunId)
  if (!karkun) {
    return { valid: false, error: 'Karkun not found.' }
  }

  const normalized = normalizeMobile(karkun.mobile)
  if (!normalized) {
    return { valid: false, error: 'Karkun must have a mobile number before assignment.' }
  }

  if (!isValidMobileFormat(normalized)) {
    return { valid: false, error: formatMobileValidationError() }
  }

  return { valid: true }
}

export function validateGenderMatch(ruknId: string, karkunId: string): ValidationResult {
  if (!canAssignByGender(ruknId, karkunId)) {
    return {
      valid: false,
      error:
        'Gender mismatch: Male Rukn can only be assigned Male Karkuns, and Female Rukn Female Karkuns.',
    }
  }
  return { valid: true }
}

export function validateNoBlockingAssignmentForRukn(ruknId: string): ValidationResult {
  const blocking = getBlockingAssignmentForRukn(ruknId)
  if (blocking) {
    const statusLabel = blocking.status === 'Suspended' ? 'suspended' : 'active'
    return {
      valid: false,
      error: `This Rukn already has an ${statusLabel} assignment. Replace or remove it first.`,
    }
  }
  return { valid: true }
}

export function validateNoActiveAssignmentForRukn(ruknId: string): ValidationResult {
  const active = getActiveAssignmentForRukn(ruknId)
  if (active) {
    return {
      valid: false,
      error: 'This Rukn already has an active assignment. Replace or remove it first.',
    }
  }
  return { valid: true }
}

export function validateAssignInput(input: AssignInput): ValidationResult {
  const checks = [
    validateEffectiveDate(input.effectiveFrom),
    validateRuknActive(input.ruknId),
    validateKarkunActive(input.karkunId),
    validateKarkunMobile(input.karkunId),
    validateGenderMatch(input.ruknId, input.karkunId),
    validateNoBlockingAssignmentForRukn(input.ruknId),
  ]

  for (const check of checks) {
    if (!check.valid) return check
  }
  return { valid: true }
}

export function validateReplaceInput(input: ReplaceInput): ValidationResult {
  const active = getActiveAssignmentForRukn(input.ruknId)
  if (!active) {
    return { valid: false, error: 'This Rukn has no active assignment to replace.' }
  }

  if (active.karkunId === input.newKarkunId) {
    return { valid: false, error: 'Select a different Karkun to replace the current assignment.' }
  }

  if (!input.replacementReason.trim()) {
    return { valid: false, error: 'Replacement reason is required.' }
  }

  const checks = [
    validateEffectiveDate(input.effectiveFrom),
    validateRuknActive(input.ruknId),
    validateKarkunActive(input.newKarkunId),
    validateKarkunMobile(input.newKarkunId),
    validateGenderMatch(input.ruknId, input.newKarkunId),
  ]

  for (const check of checks) {
    if (!check.valid) return check
  }
  return { valid: true }
}

export function validateRemoveInput(input: RemoveInput): ValidationResult {
  const active = getActiveAssignmentForRukn(input.ruknId)
  if (!active) {
    return { valid: false, error: 'This Rukn has no active assignment to remove.' }
  }

  if (!input.removalReason.trim()) {
    return { valid: false, error: 'Removal reason is required.' }
  }

  const dateCheck = validateEffectiveDate(input.effectiveFrom)
  if (!dateCheck.valid) return dateCheck

  return validateRuknActive(input.ruknId)
}

export function validateRestoreInput(input: RestoreInput): ValidationResult {
  const blocking = getBlockingAssignmentForRukn(input.ruknId)
  if (blocking) {
    return {
      valid: false,
      error:
        'Cannot restore: another active assignment is already present for this Rukn. Remove or replace it first.',
    }
  }

  const checks = [
    validateEffectiveDate(input.effectiveFrom),
    validateRuknActive(input.ruknId),
    validateKarkunActive(input.karkunId),
    validateKarkunMobile(input.karkunId),
    validateGenderMatch(input.ruknId, input.karkunId),
  ]

  for (const check of checks) {
    if (!check.valid) return check
  }
  return { valid: true }
}
