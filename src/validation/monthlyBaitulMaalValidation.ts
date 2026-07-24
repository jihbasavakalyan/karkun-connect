import type {
  CreateMonthlyBaitulMaalCycleInput,
  MonthlyBaitulMaalKarkunMark,
  SaveMonthlyBaitulMaalSubmissionInput,
} from '@/types/monthlyBaitulMaal'
import { validateAssignedMarksComplete } from '@/lib/campaignCycle/validation'

const MONTH_RE = /^\d{4}-\d{2}$/
const ALLOWED = ['Contributed', 'Pending'] as const

export function validateCreateMonthlyBaitulMaalCycle(
  input: CreateMonthlyBaitulMaalCycleInput,
): { valid: true } | { valid: false; error: string } {
  if (!input.monthKey || !MONTH_RE.test(input.monthKey)) {
    return { valid: false, error: 'Month is required (YYYY-MM).' }
  }
  if (input.submissionDeadline) {
    const deadline = new Date(input.submissionDeadline)
    if (Number.isNaN(deadline.getTime())) {
      return { valid: false, error: 'Submission deadline is invalid.' }
    }
  }
  return { valid: true }
}

export function validateMonthlyBaitulMaalMarks(
  marks: MonthlyBaitulMaalKarkunMark[],
  assignedKarkunIds: string[],
): { valid: true } | { valid: false; error: string } {
  return validateAssignedMarksComplete(
    marks,
    assignedKarkunIds,
    ALLOWED,
    'Please mark contribution status for all assigned Karkuns before submitting.',
  )
}

export function validateSaveMonthlyBaitulMaalSubmission(
  input: SaveMonthlyBaitulMaalSubmissionInput,
  assignedKarkunIds: string[],
): { valid: true } | { valid: false; error: string } {
  if (!input.cycleId.trim()) {
    return { valid: false, error: 'Cycle is required.' }
  }
  if (!input.ruknId.trim()) {
    return { valid: false, error: 'Rukn is required.' }
  }
  return validateMonthlyBaitulMaalMarks(input.marks, assignedKarkunIds)
}
