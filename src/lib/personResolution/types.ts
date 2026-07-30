/**
 * KC-0128 — Canonical Person Resolution types.
 * Single resolved-person shape for every lookup / communication surface.
 */

import type { PersonCategory, PersonGender } from '@/types/karkun-registry.types'

/** Organizational role after resolution (Muttafiq is distinct from MessageRecipientKind). */
export type ResolvedPersonKind = 'karkun' | 'muttafiq' | 'rukn'

export type ResolvedPerson = {
  personId: string
  kind: ResolvedPersonKind
  /** Registry category when kind is karkun | muttafiq */
  category: PersonCategory | null
  name: string
  mobile: string
  whatsapp?: string
  gender: PersonGender | null
  registryNumber: string
  assignedRuknId: string
  assignedRukn: string
  area: string
  place: string
  ward: string
  status: string
  assignmentStatus: string
  /** Admin 360° profile path when the person is in the people registry */
  profilePath: string | null
}
