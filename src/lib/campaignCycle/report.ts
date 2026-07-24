/**
 * Shared binary completion report builder for campaign cycles.
 */

import { listActiveRuknsWithAssignments } from './activeRukns'

export type BinaryCycleSubmission<TStatus extends string> = {
  ruknId: string
  submittedAt: string
  marks: { status: TStatus }[]
}

export type BinaryCycleRuknRow = {
  ruknId: string
  ruknName: string
  assigned: number
  positive: number
  negative: number
  completionPct: number
  submitted: boolean
  submittedAt?: string
}

export type BinaryCycleReport = {
  positive: number
  negative: number
  completionPct: number
  totalAssigned: number
  ruknsSubmitted: number
  ruknsPending: number
  ruknsTotal: number
  ruknRows: BinaryCycleRuknRow[]
}

export function buildBinaryCycleReport<TStatus extends string>(
  submissions: BinaryCycleSubmission<TStatus>[],
  positiveStatus: TStatus,
  negativeStatus: TStatus,
): BinaryCycleReport {
  const ruknRowsBase = listActiveRuknsWithAssignments()
  const byRukn = new Map(submissions.map((item) => [item.ruknId, item]))

  let positive = 0
  let negative = 0
  let totalAssigned = 0
  let ruknsSubmitted = 0

  const ruknRows: BinaryCycleRuknRow[] = ruknRowsBase.map((row) => {
    totalAssigned += row.assigned
    const submission = byRukn.get(row.ruknId)
    if (!submission) {
      return {
        ruknId: row.ruknId,
        ruknName: row.ruknName,
        assigned: row.assigned,
        positive: 0,
        negative: 0,
        completionPct: 0,
        submitted: false,
      }
    }

    ruknsSubmitted += 1
    const rowPositive = submission.marks.filter((mark) => mark.status === positiveStatus).length
    const rowNegative = submission.marks.filter((mark) => mark.status === negativeStatus).length
    positive += rowPositive
    negative += rowNegative
    const marked = rowPositive + rowNegative
    return {
      ruknId: row.ruknId,
      ruknName: row.ruknName,
      assigned: row.assigned,
      positive: rowPositive,
      negative: rowNegative,
      completionPct: marked === 0 ? 0 : Math.round((rowPositive / marked) * 100),
      submitted: true,
      submittedAt: submission.submittedAt,
    }
  })

  const markedTotal = positive + negative
  return {
    positive,
    negative,
    completionPct: markedTotal === 0 ? 0 : Math.round((positive / markedTotal) * 100),
    totalAssigned,
    ruknsSubmitted,
    ruknsPending: Math.max(ruknRows.length - ruknsSubmitted, 0),
    ruknsTotal: ruknRows.length,
    ruknRows: ruknRows.sort((a, b) => a.ruknName.localeCompare(b.ruknName)),
  }
}
