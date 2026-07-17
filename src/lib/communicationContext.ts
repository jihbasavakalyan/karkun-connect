/**
 * Individual communication context + Digital Rafeeq template recommendations (KC-006).
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
import { getRegistrationForKarkun } from '@/services/jihWebPortalService'
import { getActiveCampaignName } from '@/services/campaignService'

export type TemplateRecommendation = {
  templateId: string
  templateName: string
  reason: string
}

export type IndividualCommunicationContext = {
  karkunId: string
  karkunName: string
  assignedRuknName: string
  journeyStage: string
  lastVisit: string
  lastIjtema: string
  baitulMaalStatus: string
  suggestions: string[]
  /** Best-match official template for the Rukn to review and send. */
  recommendedTemplate: TemplateRecommendation | null
  recommendations: TemplateRecommendation[]
  defaultVariables: Record<string, string>
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
  const jih = getRegistrationForKarkun(karkunId)

  const recommendations = recommendOfficialTemplates({
    jihStatus: jih.status,
    ijtemaStatus: ijtema.status,
    baitulMaalStatus: baitulMaal.status,
    lastVisit: karkun.lastVisit,
    journeyStage: journey.currentStage,
    readyForNextStage: Boolean(assessment?.indicators.ready_for_next_stage),
  })

  const suggestions = recommendations.map((item) => item.reason)

  const monthLabel = new Date().toLocaleDateString('ur-PK', { month: 'long', year: 'numeric' })

  return {
    karkunId,
    karkunName: karkun.name,
    assignedRuknName: rukn?.name ?? 'Unassigned',
    journeyStage: JOURNEY_STAGE_LABELS[journey.currentStage],
    lastVisit: latestVisit?.submittedAt?.slice(0, 10) ?? karkun.lastVisit?.slice(0, 10) ?? 'None',
    lastIjtema:
      ijtema.status === 'Not recorded'
        ? 'Not recorded'
        : `${ijtema.status} (${ijtema.weekLabel})`,
    baitulMaalStatus: baitulMaal.status,
    suggestions,
    recommendedTemplate: recommendations[0] ?? null,
    recommendations,
    defaultVariables: {
      name: karkun.name,
      month: monthLabel,
      campaign: getActiveCampaignName() || 'کارکن رابطہ مہم',
      date: '',
      time: '',
      venue: '',
      event: '',
    },
  }
}

export function recommendOfficialTemplates(input: {
  jihStatus?: string
  ijtemaStatus?: string
  baitulMaalStatus?: string
  lastVisit?: string | null
  journeyStage?: string
  readyForNextStage?: boolean
}): TemplateRecommendation[] {
  const recommendations: TemplateRecommendation[] = []

  if (input.jihStatus && input.jihStatus !== 'Registered') {
    recommendations.push({
      templateId: 'tpl-jih-registration',
      templateName: 'JIH Registration Reminder',
      reason: 'Registration pending → Registration Reminder',
    })
  }

  if (input.ijtemaStatus === 'Absent') {
    recommendations.push({
      templateId: 'tpl-missed-ijtema',
      templateName: 'Missed Ijtema Reminder',
      reason: 'Missed Weekly Ijtema → Ijtema Reminder',
    })
  } else if (input.ijtemaStatus === 'Not recorded') {
    recommendations.push({
      templateId: 'tpl-ijtema',
      templateName: 'Weekly Ijtema Reminder',
      reason: 'Attendance not recorded → Weekly Ijtema Reminder',
    })
  }

  if (input.baitulMaalStatus === 'Pending') {
    recommendations.push({
      templateId: 'tpl-baitul-maal',
      templateName: 'Monthly Bait-ul-Maal Reminder',
      reason: 'Pending Bait-ul-Maal → Bait-ul-Maal Reminder',
    })
  }

  if (!input.lastVisit || daysSince(input.lastVisit) > 14) {
    recommendations.push({
      templateId: 'tpl-visit-reminder',
      templateName: 'Visit Reminder',
      reason: 'Visit overdue → Visit Reminder',
    })
  }

  if (input.journeyStage === 'development' && !input.readyForNextStage) {
    recommendations.push({
      templateId: 'tpl-development-follow-up',
      templateName: 'Development Follow-up',
      reason: 'Development assessment due → Development Follow-up',
    })
  }

  if (input.journeyStage === 'orientation') {
    recommendations.push({
      templateId: 'tpl-orientation',
      templateName: 'Orientation Invitation',
      reason: 'Orientation stage → Orientation Invitation',
    })
  }

  if (input.journeyStage === 'connected' || input.journeyStage === 'first-meeting') {
    recommendations.push({
      templateId: 'tpl-welcome',
      templateName: 'Welcome',
      reason: 'New connection → Welcome',
    })
  }

  // Deduplicate by templateId, keep first (highest priority) reason
  const seen = new Set<string>()
  return recommendations.filter((item) => {
    if (seen.has(item.templateId)) return false
    seen.add(item.templateId)
    return true
  })
}

function daysSince(iso: string): number {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY
  return (Date.now() - then) / (1000 * 60 * 60 * 24)
}

export const QUICK_COMMUNICATION_TEMPLATE_IDS = [
  'tpl-visit-reminder',
  'tpl-ijtema',
  'tpl-orientation',
  'tpl-baitul-maal',
  'tpl-development-follow-up',
  'tpl-thank-you',
  'tpl-welcome',
  'tpl-missed-ijtema',
] as const
