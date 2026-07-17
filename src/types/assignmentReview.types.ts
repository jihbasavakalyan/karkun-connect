/**
 * Assignment review requests — Rukn requests Admin ownership decisions (KC-008).
 */

export type AssignmentReviewReason =
  | 'Needs attention'
  | 'Unable to continue'
  | 'Wrong assignment'
  | 'Shifted area'
  | 'Personal reason'
  | 'Other'

export type AssignmentReviewStatus = 'Pending' | 'Resolved'

export type AssignmentReviewDecision =
  | 'Continue'
  | 'Transfer'
  | 'Replace'
  | 'Release'
  | 'Reject'

export type AssignmentReviewSnapshot = {
  visitCount: number
  callCount: number
  whatsappCount: number
  lastVisit: string | null
  journeyStage: string
}

export type AssignmentReviewRequest = {
  id: string
  karkunId: string
  karkunName: string
  ruknId: string
  ruknName: string
  assignmentId: string
  assignmentNumber: string
  reason: AssignmentReviewReason
  notes: string
  snapshot: AssignmentReviewSnapshot
  status: AssignmentReviewStatus
  decision?: AssignmentReviewDecision
  decisionNotes?: string
  decidedBy?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}
