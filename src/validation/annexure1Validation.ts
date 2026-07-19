import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import {
  getActiveAssignmentsForKarkun,
  getActiveAssignmentForRukn,
} from '@/stores/assignmentStore'
import type { Annexure1FormState } from '@/types/annexure1.types'
import type { AssignmentRecord } from '@/types/assignment'
import { validateAnnexureFollowUpFields } from '@/validation/followUpValidation'
import { hasSubmittedAnnexureForAssignment } from '@/stores/annexure1Store'

export type Annexure1ValidationResult = { valid: true } | { valid: false; error: string }

export type Annexure1SubmissionContext = {
  karkunId: string
  ruknId: string
  actorRole: 'rukn' | 'administrator'
  /** Auth uid used as FollowUpRecord.createdBy when scheduling a follow-up. */
  actorId?: string
}

export function resolveActiveAssignmentForAnnexure1(
  karkunId: string,
  ruknId?: string,
): AssignmentRecord | undefined {
  const karkunAssignment = getActiveAssignmentsForKarkun(karkunId)[0]
  if (karkunAssignment) {
    return karkunAssignment
  }

  if (ruknId) {
    const ruknAssignment = getActiveAssignmentForRukn(ruknId)
    if (ruknAssignment?.karkunId === karkunId) {
      return ruknAssignment
    }
  }

  return undefined
}

export function validateActiveAssignmentExists(
  karkunId: string,
  ruknId?: string,
): Annexure1ValidationResult {
  const assignment = resolveActiveAssignmentForAnnexure1(karkunId, ruknId)
  if (!assignment) {
    return { valid: false, error: 'No active assignment found.' }
  }
  return { valid: true }
}

export function validateAnnexure1SubmissionContext(
  context: Annexure1SubmissionContext,
): Annexure1ValidationResult {
  const assignment = resolveActiveAssignmentForAnnexure1(context.karkunId, context.ruknId)
  if (!assignment) {
    return { valid: false, error: 'No active assignment found.' }
  }

  if (assignment.karkunId !== context.karkunId) {
    return { valid: false, error: 'Assigned Karkun does not match this assignment.' }
  }

  if (context.actorRole === 'rukn' && assignment.ruknId !== context.ruknId) {
    return { valid: false, error: 'Assigned Rukn does not match your account.' }
  }

  const karkun = getKarkunById(context.karkunId)
  const rukn = getRuknById(assignment.ruknId)
  if (!karkun || !rukn) {
    return { valid: false, error: 'Assignment references invalid records.' }
  }

  if (rukn.status !== 'active') {
    return { valid: false, error: 'Cannot record a visit for an inactive Rukn.' }
  }

  if (karkun.status !== 'active') {
    return { valid: false, error: 'Cannot record a visit for an inactive Karkun.' }
  }

  return { valid: true }
}

export function validateAnnexure1Form(form: Annexure1FormState): Annexure1ValidationResult {
  if (!form.visitDate.trim()) {
    return { valid: false, error: 'Visit date is required.' }
  }

  if (!form.visitConducted) {
    return { valid: false, error: 'Select whether the visit was conducted.' }
  }

  if (form.visitConducted === 'no') {
    if (!form.notConductedReason.trim()) {
      return { valid: false, error: 'Provide a reason when the visit was not conducted.' }
    }
    return { valid: true }
  }

  if (!form.discussionSummary.trim()) {
    return { valid: false, error: 'Discussion summary is required.' }
  }

  if (form.commitmentMade && !form.commitmentDetails.trim()) {
    return { valid: false, error: 'Commitment details are required when a commitment was made.' }
  }

  if (!form.commitmentMade) {
    return { valid: true }
  }

  return validateAnnexureFollowUpFields(
    form.followUpRequired === '' ? 'no' : form.followUpRequired,
    form.followUpDate,
    form.followUpPurpose,
  )
}

export function validateAnnexure1Submission(
  form: Annexure1FormState,
  context: Annexure1SubmissionContext,
): Annexure1ValidationResult {
  const contextCheck = validateAnnexure1SubmissionContext(context)
  if (!contextCheck.valid) {
    return contextCheck
  }

  const assignment = resolveActiveAssignmentForAnnexure1(context.karkunId, context.ruknId)
  if (assignment && hasSubmittedAnnexureForAssignment(assignment.assignmentId)) {
    return {
      valid: false,
      error: 'A visit has already been recorded for this connection.',
    }
  }

  return validateAnnexure1Form(form)
}
