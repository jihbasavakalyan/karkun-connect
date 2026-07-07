import { ruknVisitPath } from '@/constants/routes'
import { getActiveFollowUpForKarkun } from '@/stores/followUpStore'
import { getAllSubmittedForms } from '@/stores/annexure1Store'
import { getPendingCommitmentsForKarkun } from '@/services/guidanceService'
import {
  daysSince,
  hasVisitRecorded,
  isJihRegistered,
  todayIsoDate,
} from '@/lib/guidance/journeyEngine'
import type { JourneyStageId, KarkunNextAction } from '@/types/guidance'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

function buildAction(
  kind: KarkunNextAction['kind'],
  label: string,
  description: string,
  route: string,
  dueHint?: string,
): KarkunNextAction {
  return { kind, label, description, route, dueHint }
}

export function resolveNextAction(
  karkun: KarkunRegistryRecord,
  assignmentId: string | undefined,
  currentStage: JourneyStageId,
): KarkunNextAction {
  const route = ruknVisitPath(karkun.id)
  const pendingCommitments = getPendingCommitmentsForKarkun(karkun.id)
  const overdueCommitment = pendingCommitments.find(
    (commitment) => commitment.targetDate <= todayIsoDate(),
  )
  const dueSoonCommitment = pendingCommitments.find(
    (commitment) => commitment.targetDate >= todayIsoDate(),
  )

  if (overdueCommitment) {
    return buildAction(
      'honor-commitment',
      overdueCommitment.text,
      'A commitment is due — follow through today.',
      route,
      `Due ${overdueCommitment.targetDate}`,
    )
  }

  const hasDraft = assignmentId
    ? getAllSubmittedForms().some(
        (form) => form.assignmentId === assignmentId && form.status === 'draft',
      )
    : false

  if (hasDraft) {
    return buildAction(
      'complete-visit-notes',
      'Complete Visit Notes',
      'Finish the visit you started.',
      route,
    )
  }

  const contactGap = daysSince(karkun.lastVisit || karkun.assignmentDate)
  if (contactGap >= 21) {
    return buildAction(
      'reconnect',
      'Reconnect',
      `No contact for ${Math.floor(contactGap)} days — reach out today.`,
      route,
    )
  }

  if (contactGap >= 14) {
    return buildAction(
      'call-today',
      'Call Today',
      'A quick call keeps the relationship warm.',
      route,
    )
  }

  const activeFollowUp = getActiveFollowUpForKarkun(karkun.id)
  if (activeFollowUp) {
    return buildAction(
      'arrange-meeting',
      activeFollowUp.purpose || 'Follow Up',
      `Scheduled for ${activeFollowUp.followUpDate}`,
      route,
      activeFollowUp.followUpDate,
    )
  }

  if (dueSoonCommitment) {
    return buildAction(
      'honor-commitment',
      dueSoonCommitment.text,
      'Upcoming commitment — prepare now.',
      route,
      `Due ${dueSoonCommitment.targetDate}`,
    )
  }

  switch (currentStage) {
    case 'connected':
    case 'first-meeting':
      if (!hasVisitRecorded(karkun, assignmentId)) {
        return buildAction(
          'visit-this-week',
          'Visit This Week',
          'Schedule the first meeting to begin the journey.',
          route,
        )
      }
      break
    case 'jih-registration':
      if (!isJihRegistered(karkun)) {
        return buildAction(
          'help-jih-registration',
          'Help Register in JIH App',
          'Guide them through JIH App registration.',
          route,
        )
      }
      break
    case 'orientation':
      return buildAction(
        'arrange-meeting',
        'Arrange Second Meeting',
        'Deepen orientation with a follow-up visit.',
        route,
      )
    case 'participation':
      return buildAction(
        'invite-ijtema',
        'Invite to Ijtema',
        'Invite them to weekly Ijtema participation.',
        route,
      )
    case 'regular-contact':
      return buildAction(
        'call-today',
        'Call Today',
        'Maintain regular contact this week.',
        route,
      )
    case 'development':
      return buildAction(
        'visit-this-week',
        'Visit This Week',
        'Continue developing this Karkun toward active participation.',
        route,
      )
    default:
      break
  }

  return buildAction(
    'visit-this-week',
    'Visit This Week',
    'Keep the connection moving forward.',
    route,
  )
}
