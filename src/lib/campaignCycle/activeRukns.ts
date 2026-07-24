/**
 * Shared Rukn assignment enumeration for cycle reports (KC-0107 / KC-0108).
 */

import { ruknMaster } from '@/data/ruknMaster'
import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'

export function listActiveRuknsWithAssignments(): {
  ruknId: string
  ruknName: string
  assigned: number
}[] {
  return ruknMaster
    .filter((rukn) => rukn.status === 'active' && !rukn.isArchived)
    .map((rukn) => ({
      ruknId: rukn.id,
      ruknName: rukn.name,
      assigned: getAssignedKarkunanForRukn(rukn.id).length,
    }))
    .filter((row) => row.assigned > 0)
}
