import type { PersonGender } from '@/types/people.types'

export type KarkunRequestStatus = 'Pending Approval' | 'Approved' | 'Rejected'

/** KC-0123 — request kinds in the unified people intake pipeline. */
export type PeopleRequestKind = 'new_karkun' | 'new_muttafiq' | 'karkun_to_muttafiq'

export type NewKarkunRequest = {
  id: string
  fullName: string
  mobile: string
  gender: PersonGender
  area: string
  remarks: string
  requestingRuknId: string
  requestingRuknName: string
  status: KarkunRequestStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  decidedBy?: string
  decisionNotes?: string
  createdKarkunId?: string
  assignmentId?: string
  /** KC-0072C — soft claim so parallel approvals cannot create twice (optional; additive). */
  approvalClaimedAt?: string
  /** KC-0058 — soft archive / recovery metadata (optional; additive). */
  isArchived?: boolean
  archivedAt?: string
  archivedBy?: string
  restoredAt?: string
  restoredBy?: string
  version?: number
  /**
   * KC-0123 — intake kind. Undefined / missing ⇒ `new_karkun` (backward compatible).
   */
  kind?: PeopleRequestKind
  /** For conversion requests — source person id (preserved identity). */
  sourcePersonId?: string
  /** Previous registry category before conversion. */
  previousCategory?: 'Karkun' | 'Muttafiq'
}

export function getPeopleRequestKind(request: NewKarkunRequest): PeopleRequestKind {
  return request.kind ?? 'new_karkun'
}
