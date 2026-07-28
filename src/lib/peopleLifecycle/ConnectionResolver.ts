/**
 * KC-0123 — ConnectionResolver facade over assignment store.
 */

import { getRuknById } from '@/data/ruknMaster'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'

export function resolveActiveConnection(personId: string): {
  connected: boolean
  ruknId?: string
  ruknName?: string
  assignmentId?: string
  status?: string
} {
  const active = getActiveAssignmentsForKarkun(personId)[0]
  if (!active) return { connected: false }
  const rukn = getRuknById(active.ruknId)
  return {
    connected: true,
    ruknId: active.ruknId,
    ruknName: rukn?.name,
    assignmentId: active.assignmentId,
    status: active.status,
  }
}
