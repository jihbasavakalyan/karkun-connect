/**
 * Execution plan types — automation foundation (KC-009).
 * Approved plans become the schedule Digital Rafeeq can remind against later.
 */

export type PlanContactWhen = 'today' | 'tomorrow' | 'this-week' | 'custom'

export type PlanContactChannel = 'visit' | 'call' | 'whatsapp' | 'ijtema'

export type PlanPreferredTime = 'morning' | 'afternoon' | 'evening' | 'custom'

export type ExecutionPlanStatus = 'draft' | 'active' | 'completed' | 'cancelled'

export type ExecutionPlan = {
  id: string
  karkunId: string
  karkunName: string
  ruknId: string
  assignmentId?: string
  status: ExecutionPlanStatus
  firstContactWhen: PlanContactWhen
  firstContactDate?: string
  channel: PlanContactChannel
  preferredTime?: PlanPreferredTime
  customTime?: string
  /** Human-readable لائحۂ عمل summary in Urdu. */
  summaryUrdu: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
}

export type ExecutionPlanDraftInput = {
  karkunId: string
  karkunName: string
  ruknId: string
  assignmentId?: string
  firstContactWhen: PlanContactWhen
  firstContactDate?: string
  channel: PlanContactChannel
  preferredTime?: PlanPreferredTime
  customTime?: string
}
