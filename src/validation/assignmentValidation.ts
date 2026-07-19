import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import {
  formatMobileValidationError,
  isValidMobileFormat,
  normalizeMobile,
} from '@/lib/mobileValidation'
import { canAssignByGender, normalizePersonGender } from '@/lib/peopleStore'
import type {
  AssignInput,
  RemoveInput,
  ReplaceInput,
  RestoreInput,
  TransferInput,
} from '@/types/assignment'
import {
  getActiveAssignmentForRukn,
  getActiveAssignmentsForKarkun,
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
    return { valid: false, error: 'Cannot connect to an inactive Rukn.' }
  }
  return { valid: true }
}

export function validateKarkunActive(karkunId: string): ValidationResult {
  const karkun = getKarkunById(karkunId)
  if (!karkun || karkun.isArchived) {
    return { valid: false, error: 'Karkun not found.' }
  }
  if (karkun.status !== 'active') {
    return { valid: false, error: 'Cannot connect an inactive Karkun.' }
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
    return { valid: false, error: 'Karkun must have a mobile number before connecting.' }
  }

  if (!isValidMobileFormat(normalized)) {
    return { valid: false, error: formatMobileValidationError() }
  }

  return { valid: true }
}

export function validateGenderMatch(ruknId: string, karkunId: string): ValidationResult {
  const rukn = getRuknById(ruknId)
  const karkun = getKarkunById(karkunId)

  if (!rukn) {
    return { valid: false, error: 'Rukn not found.' }
  }
  if (!karkun || karkun.isArchived) {
    return { valid: false, error: 'Karkun not found.' }
  }

  const ruknGender = normalizePersonGender(rukn.gender)
  const karkunGender = normalizePersonGender(karkun.gender)
  const match = canAssignByGender(ruknId, karkunId)
  const comparisonResult = match ? 'PASS' : 'BLOCK'

  console.info('[gender-validation]', {
    ruknId,
    ruknGender: rukn.gender,
    karkunId,
    karkunGender: karkun.gender,
    comparisonResult,
    ruknGenderNormalized: ruknGender,
    karkunGenderNormalized: karkunGender,
  })

  if (!match) {
    return {
      valid: false,
      error:
        'Gender mismatch: Male Rukn can only be connected to Male Karkuns, and Female Rukn Female Karkuns.',
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
      error: `This Rukn already has an ${statusLabel} connection. Replace or remove it first.`,
    }
  }
  return { valid: true }
}

export function validateNoActiveAssignmentForRukn(ruknId: string): ValidationResult {
  const active = getActiveAssignmentForRukn(ruknId)
  if (active) {
    return {
      valid: false,
      error: 'This Rukn already has an active connection. Replace or remove it first.',
    }
  }
  return { valid: true }
}

export function validateKarkunAvailable(karkunId: string): ValidationResult {
  const karkun = getKarkunById(karkunId)
  if (!karkun || karkun.isArchived) {
    return { valid: false, error: 'Karkun not found.' }
  }

  if (getActiveAssignmentsForKarkun(karkunId).length > 0) {
    return {
      valid: false,
      error: 'This Karkun is already connected to a Rukn. Use Transfer to reassign.',
    }
  }

  if (karkun.assignmentStatus !== 'Available') {
    return {
      valid: false,
      error: 'This Karkun is not available to connect.',
    }
  }

  return { valid: true }
}

export function validateAssignInput(input: AssignInput): ValidationResult {
  // Business rule: one Rukn may hold many active Karkuns, so we do NOT block an
  // assignment when the Rukn already has active assignments. The one-active-Rukn-
  // per-Karkun rule is still enforced by validateKarkunAvailable above.
  const checks = [
    validateEffectiveDate(input.effectiveFrom),
    validateRuknActive(input.ruknId),
    validateKarkunActive(input.karkunId),
    validateKarkunAvailable(input.karkunId),
    validateKarkunMobile(input.karkunId),
    validateGenderMatch(input.ruknId, input.karkunId),
  ]

  for (const check of checks) {
    if (!check.valid) return check
  }
  return { valid: true }
}

export function validateReplaceInput(input: ReplaceInput): ValidationResult {
  const active = input.currentKarkunId
    ? getActiveAssignmentsForKarkun(input.currentKarkunId).find(
        (record) => record.ruknId === input.ruknId,
      )
    : getActiveAssignmentForRukn(input.ruknId)
  if (!active) {
    return { valid: false, error: 'This Rukn has no active connection to replace.' }
  }

  if (active.karkunId === input.newKarkunId) {
    return { valid: false, error: 'Select a different Karkun to replace the current connection.' }
  }

  if (!input.replacementReason.trim()) {
    return { valid: false, error: 'Replacement reason is required.' }
  }

  const checks = [
    validateEffectiveDate(input.effectiveFrom),
    validateRuknActive(input.ruknId),
    validateKarkunActive(input.newKarkunId),
    validateKarkunAvailable(input.newKarkunId),
    validateKarkunMobile(input.newKarkunId),
    validateGenderMatch(input.ruknId, input.newKarkunId),
  ]

  for (const check of checks) {
    if (!check.valid) return check
  }
  return { valid: true }
}

export function validateRemoveInput(input: RemoveInput): ValidationResult {
  const active = input.karkunId
    ? getActiveAssignmentsForKarkun(input.karkunId).find(
        (record) => record.ruknId === input.ruknId,
      )
    : getActiveAssignmentForRukn(input.ruknId)
  if (!active) {
    return { valid: false, error: 'This Rukn has no active connection to remove.' }
  }

  if (!input.removalReason.trim()) {
    return { valid: false, error: 'Removal reason is required.' }
  }

  const dateCheck = validateEffectiveDate(input.effectiveFrom)
  if (!dateCheck.valid) return dateCheck

  return validateRuknActive(input.ruknId)
}

export function validateRestoreInput(input: RestoreInput): ValidationResult {
  // A Rukn may hold many active Karkuns, so an existing assignment on the Rukn no
  // longer blocks restoring another. Karkun-level availability is still enforced below.
  const checks = [
    validateEffectiveDate(input.effectiveFrom),
    validateRuknActive(input.ruknId),
    validateKarkunActive(input.karkunId),
    validateKarkunAvailable(input.karkunId),
    validateKarkunMobile(input.karkunId),
    validateGenderMatch(input.ruknId, input.karkunId),
  ]

  for (const check of checks) {
    if (!check.valid) return check
  }
  return { valid: true }
}

/** KC-0055 — in-place ownership transfer (same assignmentId / ASN). */
export function validateTransferInput(input: TransferInput): ValidationResult {
  const targetRuknId = input.targetRuknId.trim()
  if (!targetRuknId) {
    return { valid: false, error: 'Please select a new Rukn before transferring.' }
  }

  const active = getActiveAssignmentsForKarkun(input.karkunId)
  if (active.length === 0) {
    return { valid: false, error: 'This Karkun has no active connection to transfer.' }
  }
  if (active.length > 1) {
    return {
      valid: false,
      error: 'This Karkun has multiple active connections. Resolve duplicates before transferring.',
    }
  }

  const current = active[0]!
  if (current.ruknId === targetRuknId) {
    return {
      valid: false,
      error: 'Select a different Rukn. Transfer to the same Rukn has no effect.',
    }
  }

  const checks = [
    validateEffectiveDate(input.effectiveFrom),
    validateRuknActive(targetRuknId),
    validateKarkunActive(input.karkunId),
    validateKarkunMobile(input.karkunId),
    validateGenderMatch(targetRuknId, input.karkunId),
  ]

  for (const check of checks) {
    if (!check.valid) return check
  }
  return { valid: true }
}
