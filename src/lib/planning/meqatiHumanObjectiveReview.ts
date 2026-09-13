/**
 * Meqati KEEP UNMAPPED human-review disposition — code configuration only.
 * Not a Firestore field. Not an automatic mapper. Not a schema change.
 *
 * Authority: docs/meqati-target-activity-mapping-proposal.md (KEEP UNMAPPED, 2026-08-22)
 * Live audit residual among 38 blank objectiveId activities.
 *
 * Candidate objective IDs are OPTIONAL UI hints labelled
 * "ممکنہ نسبت — منظوری درکار" — never preselected, never auto-saved.
 */

export const MEQATI_HUMAN_OBJECTIVE_REVIEW_ACTIVITY_IDS = [
  'H02-A07',
  'H02-A13',
  'H05-A03',
  'H06-A06',
  'H06-A09',
] as const

export type MeqatiHumanObjectiveReviewActivityId =
  (typeof MEQATI_HUMAN_OBJECTIVE_REVIEW_ACTIVITY_IDS)[number]

const REVIEW_ID_SET: ReadonlySet<string> = new Set(MEQATI_HUMAN_OBJECTIVE_REVIEW_ACTIVITY_IDS)

/**
 * Optional hint map — same-head ambiguous candidates from the read-only audit.
 * Display only; Admin must explicitly select and confirm.
 */
export const MEQATI_HUMAN_OBJECTIVE_REVIEW_CANDIDATE_HINTS: Readonly<
  Record<MeqatiHumanObjectiveReviewActivityId, readonly string[]>
> = {
  'H02-A07': ['H02-O03'],
  'H02-A13': ['H02-O06'],
  'H05-A03': ['H05-O02'],
  'H06-A06': ['H06-O03'],
  'H06-A09': ['H06-O06'],
}

export function isMeqatiHumanObjectiveReviewActivity(activityId: string | null | undefined): boolean {
  return Boolean(activityId && REVIEW_ID_SET.has(activityId.trim()))
}

export function listMeqatiHumanObjectiveReviewCandidateHints(
  activityId: string | null | undefined,
): readonly string[] {
  if (!activityId || !isMeqatiHumanObjectiveReviewActivity(activityId)) return []
  return MEQATI_HUMAN_OBJECTIVE_REVIEW_CANDIDATE_HINTS[
    activityId.trim() as MeqatiHumanObjectiveReviewActivityId
  ] ?? []
}

export type MeqatiUnmappedFilterMode = 'all' | 'human-review' | 'other'

export function filterMeqatiUnmappedByReviewMode<T extends { id: string }>(
  rows: readonly T[],
  mode: MeqatiUnmappedFilterMode,
): T[] {
  if (mode === 'all') return [...rows]
  if (mode === 'human-review') {
    return rows.filter((row) => isMeqatiHumanObjectiveReviewActivity(row.id))
  }
  return rows.filter((row) => !isMeqatiHumanObjectiveReviewActivity(row.id))
}

export function countMeqatiUnmappedReviewBuckets(rows: readonly { id: string }[]): {
  all: number
  humanReview: number
  other: number
} {
  let humanReview = 0
  for (const row of rows) {
    if (isMeqatiHumanObjectiveReviewActivity(row.id)) humanReview += 1
  }
  return {
    all: rows.length,
    humanReview,
    other: rows.length - humanReview,
  }
}
