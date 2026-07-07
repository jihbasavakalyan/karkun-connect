import { getActiveFollowUpForKarkun } from '@/stores/followUpStore'
import {
  getLatestSubmissionForKarkun,
  hasSubmittedAnnexureForAssignment,
} from '@/stores/annexure1Store'
import { getRegistrationForKarkun } from '@/services/jihWebPortalService'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export type ConnectionProgressStep = {
  id: string
  label: string
  complete: boolean
}

export type ConnectionJourneySnapshot = {
  hasVisit: boolean
  jihRegistered: boolean
  regularContact: boolean
  isActive: boolean
  steps: ConnectionProgressStep[]
  completedCount: number
  totalCount: number
}

/**
 * Computes the Connection Progress ladder for a Karkun:
 * Connected → First Meeting → JIH Registration → Regular Contact → Active.
 */
export function buildConnectionJourney(
  karkun: KarkunRegistryRecord,
  assignmentId: string | undefined,
): ConnectionJourneySnapshot {
  const hasVisit =
    karkun.visitStatus === 'completed' ||
    Boolean(getLatestSubmissionForKarkun(karkun.id)) ||
    (assignmentId ? hasSubmittedAnnexureForAssignment(assignmentId) : false)

  const portalRegistered = getRegistrationForKarkun(karkun.id).status === 'Registered'
  const jihRegistered = karkun.jihAppRegistrationStatus === 'Registered' || portalRegistered

  const regularContact =
    Boolean(getActiveFollowUpForKarkun(karkun.id)) || Boolean(karkun.currentCommitment?.trim())

  const isActive = karkun.campaignStatus === 'active' && jihRegistered && regularContact

  const steps: ConnectionProgressStep[] = [
    { id: 'connected', label: 'Connected', complete: Boolean(assignmentId) },
    { id: 'first-meeting', label: 'First Meeting', complete: hasVisit },
    { id: 'jih-registration', label: 'JIH Registration', complete: jihRegistered },
    { id: 'regular-contact', label: 'Regular Contact', complete: regularContact },
    { id: 'active', label: 'Active', complete: isActive },
  ]

  return {
    hasVisit,
    jihRegistered,
    regularContact,
    isActive,
    steps,
    completedCount: steps.filter((step) => step.complete).length,
    totalCount: steps.length,
  }
}
