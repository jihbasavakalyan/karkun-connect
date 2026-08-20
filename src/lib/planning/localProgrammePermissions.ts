/**
 * ذمہ دار read authorization for a سرگرمی.
 * Product meaning: LocalProgramme.responsibleRuknId is the Rukn accountable
 * for that activity. Not Standing Responsibility and not Work assignment.
 */

import type { LocalProgramme } from '@/types/localProgramme.types'

export type LocalProgrammeActor = {
  role: 'administrator' | 'rukn'
  ruknId?: string
}

/**
 * Administrator: all activities (planning).
 * Rukn: only activities where they are ذمہ دار.
 */
export function canReadLocalProgrammeAsResponsible(
  actor: LocalProgrammeActor,
  programme: Pick<LocalProgramme, 'responsibleRuknId'>,
): boolean {
  if (actor.role === 'administrator') return true
  if (actor.role !== 'rukn') return false
  const ruknId = actor.ruknId?.trim()
  const assigned = programme.responsibleRuknId?.trim()
  return Boolean(ruknId) && Boolean(assigned) && assigned === ruknId
}
