import { useEffect, useState } from 'react'
import {
  assignKarkun,
  getAllRuknAssignmentEngineStats,
  getAssignedKarkunanForRukn,
  getAssignmentHistory,
  getAssignmentMetrics,
  getAvailableKarkunan,
  getRuknAssignmentEngineStats,
  releaseKarkun,
  replaceKarkun,
  subscribeToAssignments,
} from '@/lib/assignmentEngine'
import type { AssignedBy, ReleaseReason } from '@/types/assignment.types'

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
    getRuknAssignmentEngineStats,
    getAllRuknAssignmentEngineStats,
    getAssignmentHistory,
    assignKarkun: (karkunId: string, ruknId: string, assignedBy: AssignedBy) =>
      assignKarkun(karkunId, ruknId, assignedBy),
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
