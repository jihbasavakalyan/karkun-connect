/**
 * Canonical Meqati selection for display.
 * Distinguishes existence from operational activation.
 * Does not change status. Does not invent a second Meqati.
 */

import type { MeqatiMansooba } from '@/types/planning.types'

/**
 * Prefer the active Mansooba when one exists.
 * Otherwise the unique non-archived record (draft is valid existence).
 * Multiple non-archived drafts with no active row: undefined — do not invent a winner.
 */
export function selectCanonicalMeqatiMansooba(
  rows: readonly MeqatiMansooba[],
): MeqatiMansooba | undefined {
  const live = rows.filter((row) => row.status !== 'archived')
  const active = live.find((row) => row.status === 'active')
  if (active) return active
  if (live.length === 1) return live[0]
  return undefined
}

export function isMeqatiMansoobaActive(
  mansooba: Pick<MeqatiMansooba, 'status'> | null | undefined,
): boolean {
  return mansooba?.status === 'active'
}
