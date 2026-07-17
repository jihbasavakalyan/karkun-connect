/**
 * Individual communication context for composers (KC-006 Sprint 6.6).
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { getCurrentAssignmentForKarkun } from '@/lib/assignmentEngine'
import { resolveCurrentJourneyStage } from '@/lib/guidance/journeyEngine'
import { JOURNEY_STAGE_LABELS } from '@/types/guidance'
import { getCurrentIjtemaAttendance } from '@/services/ijtemaAttendanceService'
import { getCurrentBaitulMaalStatus } from '@/services/baitulMaalService'
import { getLatestSubmissionForKarkun } from '@/stores/annexure1Store'
import { getDevelopmentAssessment } from '@/stores/developmentAssessmentStore'

export type IndividualCommunicationContext = {
  karkunId: string
  karkunName: string
  assignedRuknName: string
  journeyStage: string
  lastVisit: string
  lastIjtema: string
  baitulMaalStatus: string
  suggestions: string[]
}

export function buildIndividualCommunicationContext(
  karkunId: string,
): IndividualCommunicationContext | null {
  const karkun = getKarkunById(karkunId)
  if (!karkun) return null

  const assignment = getCurrentAssignmentForKarkun(karkunId)
  const rukn = assignment ? getRuknById(assignment.ruknId) : undefined
  const journey = resolveCurrentJourneyStage(karkun, assignment?.assignmentId)
  const ijtema = getCurrentIjtemaAttendance(karkunId)
  const baitulMaal = getCurrentBaitulMaalStatus(karkunId)
  const latestVisit = getLatestSubmissionForKarkun(karkunId)
  const assessment = getDevelopmentAssessment(karkunId)

  const suggestions: string[] = []
  if (ijtema.status === 'Not recorded' || ijtema.status === 'Absent') {
    suggestions.push('Attendance missing for this week.')
  }
  if (!karkun.lastVisit || daysSince(karkun.lastVisit) > 14) {
    suggestions.push('Follow-up recommended.')
  }
  if (
    journey.currentStage === 'development' &&
    !assessment?.indicators.ready_for_next_stage
  ) {
    suggestions.push('Development assessment due.')
  }
  if (baitulMaal.status === 'Pending') {
    suggestions.push('Bait-ul-Maal contribution pending.')
  }

  return {
    karkunId,
    karkunName: karkun.name,
    assignedRuknName: rukn?.name ?? 'Unassigned',
    journeyStage: JOURNEY_STAGE_LABELS[journey.currentStage],
    lastVisit: latestVisit?.submittedAt?.slice(0, 10) ?? karkun.lastVisit?.slice(0, 10) ?? 'None',
    lastIjtema: ijtema.status === 'Not recorded' ? 'Not recorded' : `${ijtema.status} (${ijtema.weekLabel})`,
    baitulMaalStatus: baitulMaal.status,
    suggestions,
  }
}

function daysSince(iso: string): number {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY
  return (Date.now() - then) / (1000 * 60 * 60 * 24)
}

export const QUICK_COMMUNICATION_TEMPLATE_IDS = [
  'tpl-meeting-reminder',
  'tpl-ijtema',
  'tpl-orientation',
  'tpl-baitul-maal',
  'tpl-development-follow-up',
  'tpl-thank-you',
] as const
