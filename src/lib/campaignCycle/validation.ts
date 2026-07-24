/**
 * Shared cycle mark validation (KC-0107 / KC-0108).
 */

export type CycleMarkLike = {
  karkunId: string
  status: string
}

export function validateAssignedMarksComplete(
  marks: CycleMarkLike[],
  assignedKarkunIds: string[],
  allowedStatuses: readonly string[],
  incompleteMessage = 'Please mark all connected Karkuns before submitting.',
): { valid: true } | { valid: false; error: string } {
  if (assignedKarkunIds.length === 0) {
    return { valid: false, error: 'No connected Karkuns to mark.' }
  }

  const byId = new Map(marks.map((mark) => [mark.karkunId, mark]))
  for (const karkunId of assignedKarkunIds) {
    const mark = byId.get(karkunId)
    if (!mark || !allowedStatuses.includes(mark.status)) {
      return { valid: false, error: incompleteMessage }
    }
  }

  for (const mark of marks) {
    if (!assignedKarkunIds.includes(mark.karkunId)) {
      return { valid: false, error: 'Submission includes a Karkun that is not connected.' }
    }
  }

  return { valid: true }
}
