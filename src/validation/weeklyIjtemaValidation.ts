import type {
  CreateWeeklyIjtemaEventInput,
  SaveWeeklyIjtemaSubmissionInput,
  WeeklyIjtemaKarkunMark,
  WeeklyIjtemaMarkStatus,
} from '@/types/weeklyIjtema'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

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
  if (assignedKarkunIds.length === 0) {
    return { valid: false, error: 'No assigned Karkuns to mark.' }
  }

  const byId = new Map(marks.map((mark) => [mark.karkunId, mark]))
  for (const karkunId of assignedKarkunIds) {
    const mark = byId.get(karkunId)
    if (!mark || !isWeeklyIjtemaMarkStatus(mark.status)) {
      return {
        valid: false,
        error: 'Please mark attendance for all assigned Karkuns before submitting.',
      }
    }
  }

  for (const mark of marks) {
    if (!assignedKarkunIds.includes(mark.karkunId)) {
      return { valid: false, error: 'Attendance includes a Karkun that is not assigned.' }
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

function isWeeklyIjtemaMarkStatus(value: string): value is WeeklyIjtemaMarkStatus {
  return value === 'Present' || value === 'Absent'
}
