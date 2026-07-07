import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import {
  getLatestSubmissionForKarkun,
  getSubmittedMeetingForms,
} from '@/stores/annexure1Store'
import { getTimelineEventsForKarkun } from '@/stores/guidanceStore'
import { getRegistrationForKarkun } from '@/services/jihWebPortalService'
import { JOURNEY_STAGE_LABELS, type JourneyTimelineEvent } from '@/types/guidance'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

function createId(): string {
  return `tl-sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function buildJourneyTimeline(karkun: KarkunRegistryRecord): JourneyTimelineEvent[] {
  const events: JourneyTimelineEvent[] = []
  const assignment = getActiveAssignmentsForKarkun(karkun.id)[0]

  if (assignment) {
    events.push({
      id: `tl-conn-${assignment.assignmentId}`,
      karkunId: karkun.id,
      stageId: 'connected',
      title: 'Connected',
      description: `Connection ${assignment.assignmentNumber}`,
      occurredAt: assignment.effectiveFrom || karkun.assignmentDate || karkun.createdAt,
      source: 'system',
    })
  }

  const submissions = getSubmittedMeetingForms().filter(
    (form) => form.karkunId === karkun.id && form.status === 'submitted',
  )
  for (const form of submissions) {
    events.push({
      id: `tl-visit-${form.id}`,
      karkunId: karkun.id,
      stageId: 'first-meeting',
      title: 'First Meeting',
      description: form.discussionSummary || 'Visit recorded',
      occurredAt: form.submittedAt || form.visitDate,
      source: 'visit',
    })
  }

  const registration = getRegistrationForKarkun(karkun.id)
  if (registration.status === 'Registered' && registration.registrationDate) {
    events.push({
      id: `tl-jih-${karkun.id}`,
      karkunId: karkun.id,
      stageId: 'jih-registration',
      title: JOURNEY_STAGE_LABELS['jih-registration'],
      description: registration.registrationNumber
        ? `JIH ID: ${registration.registrationNumber}`
        : 'Registered in JIH App',
      occurredAt: registration.registrationDate,
      source: 'system',
    })
  } else if (karkun.jihAppRegistrationStatus === 'Registered') {
    const latest = getLatestSubmissionForKarkun(karkun.id)
    events.push({
      id: `tl-jih-visit-${karkun.id}`,
      karkunId: karkun.id,
      stageId: 'jih-registration',
      title: JOURNEY_STAGE_LABELS['jih-registration'],
      occurredAt: latest?.submittedAt ?? karkun.updatedAt,
      source: 'visit',
    })
  }

  events.push(...getTimelineEventsForKarkun(karkun.id))

  const seen = new Set<string>()
  return events
    .filter((event) => {
      if (seen.has(event.id)) {
        return false
      }
      seen.add(event.id)
      return true
    })
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}

export function appendSystemTimelineIfNeeded(
  karkunId: string,
  title: string,
  description?: string,
): void {
  void createId()
  void karkunId
  void title
  void description
}
