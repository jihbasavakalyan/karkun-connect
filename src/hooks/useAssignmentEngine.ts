import { useEffect, useState } from 'react'
import {
  assignKarkun,
  assignRukn,
  getAllRuknAssignmentEngineStats,
  getAssignedKarkunanForRukn,
  getAssignmentHistory,
  getAssignmentMetrics,
  getAvailableKarkunan,
  getRuknAssignmentEngineStats,
  removeAssignment,
  replaceAssignment,
  replaceKarkun,
  restoreAssignment,
  releaseKarkun,
  subscribeToAssignments,
} from '@/lib/assignmentEngine'
import {
  getAssignmentDashboardMetrics,
  getKarkunWithWorkload,
  getKarkunWorkloadSummary,
  getRuknAssignmentSummary,
  getUnassignedRukns,
} from '@/services/assignmentService'
import { getRecentActivity } from '@/stores/activityLogStore'
import type { AssignedBy, ReleaseReason } from '@/types/assignment.types'
import type { AssignInput, RemoveInput, ReplaceInput, RestoreInput } from '@/types/assignment'

export function useAssignmentEngine() {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToAssignments(() => setVersion((current) => current + 1))
  }, [])

  void version

  return {
    getAvailableKarkunan,
    getAssignedKarkunanForRukn,
    getAssignmentMetrics,
    getAssignmentDashboardMetrics,
    getRuknAssignmentEngineStats,
    getAllRuknAssignmentEngineStats,
    getAssignmentHistory,
    getRuknAssignmentSummary,
    getKarkunWorkloadSummary,
    getKarkunWithWorkload,
    getUnassignedRukns,
    getRecentActivity,
    assignKarkun: (karkunId: string, ruknId: string, assignedBy: AssignedBy) =>
      assignKarkun(karkunId, ruknId, assignedBy),
    assignRukn: (input: AssignInput) => assignRukn(input),
    replaceAssignment: (input: ReplaceInput) => replaceAssignment(input),
    removeAssignment: (input: RemoveInput) => removeAssignment(input),
    restoreAssignment: (input: RestoreInput) => restoreAssignment(input),
    releaseKarkun: (karkunId: string, ruknId: string, reason: ReleaseReason) =>
      releaseKarkun(karkunId, ruknId, reason),
    replaceKarkun: (
      currentKarkunId: string,
      newKarkunId: string,
      ruknId: string,
      reason: ReleaseReason,
      assignedBy: AssignedBy,
    ) => replaceKarkun(currentKarkunId, newKarkunId, ruknId, reason, assignedBy),
  }
}
