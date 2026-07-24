import type {
  CreateWeeklyIjtemaEventInput,
  SaveWeeklyIjtemaSubmissionInput,
  WeeklyIjtemaKarkunMark,
} from '@/types/weeklyIjtema'
import { validateAssignedMarksComplete } from '@/lib/campaignCycle/validation'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ALLOWED = ['Present', 'Absent'] as const

export function validateCreateWeeklyIjtemaEvent(
  input: CreateWeeklyIjtemaEventInput,
): { valid: true } | { valid: false; error: string } {
  if (!input.meetingDate || !DATE_RE.test(input.meetingDate)) {
    return { valid: false, error: 'Meeting date is required (YYYY-MM-DD).' }
  }
  if (input.submissionDeadline) {
    const deadline = new Date(input.submissionDeadline)
    if (Number.isNaN(deadline.getTime())) {
      return { valid: false, error: 'Submission deadline is invalid.' }
    }
  }
  return { valid: true }
}

export function validateWeeklyIjtemaMarks(
  marks: WeeklyIjtemaKarkunMark[],
  assignedKarkunIds: string[],
): { valid: true } | { valid: false; error: string } {
  return validateAssignedMarksComplete(
    marks,
    assignedKarkunIds,
    ALLOWED,
    'Please mark attendance for all assigned Karkuns before submitting.',
  )
}

export function validateSaveWeeklyIjtemaSubmission(
  input: SaveWeeklyIjtemaSubmissionInput,
  assignedKarkunIds: string[],
): { valid: true } | { valid: false; error: string } {
  if (!input.eventId.trim()) {
    return { valid: false, error: 'Event is required.' }
  }
  if (!input.ruknId.trim()) {
    return { valid: false, error: 'Rukn is required.' }
  }
  return validateWeeklyIjtemaMarks(input.marks, assignedKarkunIds)
}
