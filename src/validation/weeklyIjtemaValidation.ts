import type {
  CreateWeeklyIjtemaEventInput,
  SaveWeeklyIjtemaSubmissionInput,
  UpdateWeeklyIjtemaEventInput,
  WeeklyIjtemaKarkunMark,
} from '@/types/weeklyIjtema'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ATTENDANCE_STATUSES = new Set(['Present', 'Absent'])

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

export function validateUpdateWeeklyIjtemaEvent(
  input: UpdateWeeklyIjtemaEventInput,
): { valid: true } | { valid: false; error: string } {
  if (!input.eventId.trim()) {
    return { valid: false, error: 'Meeting is required.' }
  }
  if (!input.meetingDate || !DATE_RE.test(input.meetingDate)) {
    return { valid: false, error: 'Meeting date is required (YYYY-MM-DD).' }
  }
  if (input.submissionDeadline) {
    const deadline = new Date(input.submissionDeadline)
    if (Number.isNaN(deadline.getTime())) {
      return { valid: false, error: 'Submission deadline is invalid.' }
    }
  }
  if (input.status && input.status !== 'Open' && input.status !== 'Closed') {
    return { valid: false, error: 'Status must be Open or Closed.' }
  }
  return { valid: true }
}

function isValidWeeklyIjtemaMark(mark: WeeklyIjtemaKarkunMark): boolean {
  if (mark.status === 'Present' || mark.status === 'Absent') return true
  if (mark.reminded === true && (mark.status === undefined || !ATTENDANCE_STATUSES.has(mark.status))) {
    return true
  }
  return false
}

export function validateWeeklyIjtemaMarks(
  marks: WeeklyIjtemaKarkunMark[],
  assignedKarkunIds: string[],
): { valid: true } | { valid: false; error: string } {
  if (assignedKarkunIds.length === 0) {
    return { valid: false, error: 'No connected Karkuns to mark.' }
  }

  const byId = new Map(marks.map((mark) => [mark.karkunId, mark]))
  for (const karkunId of assignedKarkunIds) {
    const mark = byId.get(karkunId)
    if (!mark || !isValidWeeklyIjtemaMark(mark)) {
      return {
        valid: false,
        error: 'Please mark Reminder or attendance for all connected Karkuns before submitting.',
      }
    }
  }

  for (const mark of marks) {
    if (!assignedKarkunIds.includes(mark.karkunId)) {
      return { valid: false, error: 'Submission includes a Karkun that is not connected.' }
    }
  }

  return { valid: true }
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
