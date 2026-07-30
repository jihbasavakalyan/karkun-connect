/**
 * Shared Rukn assignment enumeration for cycle reports (KC-0107 / KC-0108).
 * KC-028C — optional gender filter for audience-scoped Weekly Ijtema reports.
 */

import { ruknMaster } from '@/data/ruknMaster'
import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import type { WeeklyIjtemaAudienceGender } from '@/lib/weeklyIjtema/attendanceWindowSchedule'

export function listActiveRuknsWithAssignments(options?: {
  audienceGender?: WeeklyIjtemaAudienceGender
}): {
  ruknId: string
  ruknName: string
  assigned: number
}[] {
  return ruknMaster
    .filter((rukn) => rukn.status === 'active' && !rukn.isArchived)
    .filter((rukn) => {
      if (!options?.audienceGender) return true
      return rukn.gender === options.audienceGender
    })
    .map((rukn) => ({
      ruknId: rukn.id,
      ruknName: rukn.name,
      assigned: getAssignedKarkunanForRukn(rukn.id).length,
    }))
    .filter((row) => row.assigned > 0)
}
