import type { PersonGender } from '@/types/people.types'

export type KarkunRequestStatus = 'Pending Approval' | 'Approved' | 'Rejected'

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
}
