import {
  getLatestSubmissionForKarkun,
  getSubmittedMeetingForms,
  hasSubmittedAnnexureForAssignment,
} from '@/stores/annexure1Store'
import { getActiveFollowUpForKarkun } from '@/stores/followUpStore'
import { getIjtemaAttendanceRecord } from '@/stores/ijtemaAttendanceStore'
import { getRegistrationForKarkun } from '@/services/jihWebPortalService'
import { getCommitmentsForKarkun } from '@/stores/guidanceStore'
import {
  JOURNEY_STAGE_ORDER,
  type JourneyStageId,
} from '@/types/guidance'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function daysSince(iso: string | null | undefined): number {
  if (!iso?.trim()) {
    return Number.POSITIVE_INFINITY
  }
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) {
    return Number.POSITIVE_INFINITY
  }
  return (Date.now() - then) / (1000 * 60 * 60 * 24)
}

export function hasVisitRecorded(
  karkun: KarkunRegistryRecord,
  assignmentId?: string,
): boolean {
  return (
    karkun.visitStatus === 'completed' ||
    Boolean(getLatestSubmissionForKarkun(karkun.id)) ||
    (assignmentId ? hasSubmittedAnnexureForAssignment(assignmentId) : false)
  )
}

export function isJihRegistered(karkun: KarkunRegistryRecord): boolean {
  return (
    karkun.jihAppRegistrationStatus === 'Registered' ||
    getRegistrationForKarkun(karkun.id).status === 'Registered'
  )
}

export function hasOrientationSignal(karkun: KarkunRegistryRecord): boolean {
  const visitCount = getSubmittedMeetingForms().filter(
    (form) => form.karkunId === karkun.id && form.status === 'submitted',
  ).length
  if (visitCount >= 2) {
    return true
  }
  return getCommitmentsForKarkun(karkun.id).some((commitment) => commitment.status !== 'cancelled')
}

export function hasParticipationSignal(karkun: KarkunRegistryRecord): boolean {
  const ijtema = getIjtemaAttendanceRecord(karkun.id, todayIsoDate())
  if (ijtema?.status === 'Present') {
    return true
  }
  return getCommitmentsForKarkun(karkun.id).some(
    (commitment) =>
      commitment.status === 'completed' && /ijtema|programme|program/i.test(commitment.text),
  )
}

export function hasRegularContact(karkun: KarkunRegistryRecord): boolean {
  const recentVisit = daysSince(karkun.lastVisit) <= 30
  const hasActiveRhythm =
    Boolean(getActiveFollowUpForKarkun(karkun.id)) ||
    Boolean(karkun.currentCommitment?.trim()) ||
    getCommitmentsForKarkun(karkun.id).some((commitment) => commitment.status === 'pending')
  return recentVisit && hasActiveRhythm
}

export function isStageComplete(
  stageId: JourneyStageId,
  karkun: KarkunRegistryRecord,
  assignmentId?: string,
): boolean {
  switch (stageId) {
    case 'connected':
      return Boolean(assignmentId)
    case 'first-meeting':
      return hasVisitRecorded(karkun, assignmentId)
    case 'jih-registration':
      return isJihRegistered(karkun)
    case 'orientation':
      return hasOrientationSignal(karkun)
    case 'participation':
      return hasParticipationSignal(karkun)
    case 'regular-contact':
      return hasRegularContact(karkun)
    case 'development':
      return (
        karkun.campaignStatus === 'active' &&
        isJihRegistered(karkun) &&
        hasRegularContact(karkun) &&
        hasParticipationSignal(karkun)
      )
    default:
      return false
  }
}

/** Current stage = first incomplete stage, or `development` when all complete. */
export function resolveCurrentJourneyStage(
  karkun: KarkunRegistryRecord,
  assignmentId?: string,
): { currentStage: JourneyStageId; stagesCompleted: JourneyStageId[] } {
  const stagesCompleted: JourneyStageId[] = []

  for (const stageId of JOURNEY_STAGE_ORDER) {
    if (isStageComplete(stageId, karkun, assignmentId)) {
      stagesCompleted.push(stageId)
    } else {
      return { currentStage: stageId, stagesCompleted }
    }
  }

  return { currentStage: 'development', stagesCompleted: [...JOURNEY_STAGE_ORDER] }
}
