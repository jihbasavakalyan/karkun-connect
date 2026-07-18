/**
 * Safe calendar-day extraction for annexure submission timestamps.
 * Corrupt / partial Firestore records may omit submissionDate — never throw in render.
 */
export function submissionDateDay(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.length < 10) {
    return null
  }
  return value.slice(0, 10)
}

export function isSubmissionDateOnDay(
  value: string | null | undefined,
  dayIso: string,
): boolean {
  return submissionDateDay(value) === dayIso
}
