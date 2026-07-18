/**
 * KC-003.1 — Presentation partition for connection UI.
 * Current = Active only. History = non-Active only.
 */

import type { AssignmentRecord } from '@/types/assignment'

export function partitionConnectionPresentation(
  history: readonly AssignmentRecord[],
  options?: {
    activeAssignments?: readonly AssignmentRecord[]
    currentAssignment?: AssignmentRecord | null
  },
): { current: AssignmentRecord[]; historical: AssignmentRecord[] } {
  const fromProp = options?.activeAssignments?.filter((record) => record.status === 'Active') ?? []
  const current =
    fromProp.length > 0
      ? [...fromProp]
      : options?.currentAssignment?.status === 'Active'
        ? [options.currentAssignment]
        : history.filter((record) => record.status === 'Active')

  const currentIds = new Set(current.map((record) => record.assignmentId))
  const historical = history.filter(
    (record) => record.status !== 'Active' && !currentIds.has(record.assignmentId),
  )

  return { current, historical }
}
