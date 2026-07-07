import { ruknVisitPath } from '@/constants/routes'
import { getPendingCommitmentsForKarkun } from '@/services/guidanceService'
import {
  daysSince,
  hasVisitRecorded,
  isJihRegistered,
  todayIsoDate,
} from '@/lib/guidance/journeyEngine'
import type { GuidanceReminder } from '@/types/guidance'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

function tomorrowIsoDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

export function buildRemindersForKarkun(
  karkun: KarkunRegistryRecord,
  assignmentId?: string,
): GuidanceReminder[] {
  const reminders: GuidanceReminder[] = []
  const route = ruknVisitPath(karkun.id)
  const contactGap = daysSince(karkun.lastVisit || karkun.assignmentDate)

  if (contactGap >= 15 && contactGap < Number.POSITIVE_INFINITY) {
    reminders.push({
      id: `rem-call-${karkun.id}`,
      karkunId: karkun.id,
      karkunName: karkun.name,
      type: 'call',
      title: 'Recommend Call',
      message: `No contact for ${Math.floor(contactGap)} days.`,
      route,
      priority: contactGap >= 21 ? 1 : 2,
    })
  }

  const pendingCommitments = getPendingCommitmentsForKarkun(karkun.id)
  for (const commitment of pendingCommitments) {
    if (commitment.targetDate === tomorrowIsoDate() && commitment.reminderEnabled) {
      reminders.push({
        id: `rem-cmt-${commitment.id}`,
        karkunId: karkun.id,
        karkunName: karkun.name,
        type: 'meeting',
        title: 'Commitment Tomorrow',
        message: commitment.text,
        route,
        priority: 2,
      })
    }
    if (commitment.targetDate === todayIsoDate()) {
      reminders.push({
        id: `rem-cmt-today-${commitment.id}`,
        karkunId: karkun.id,
        karkunName: karkun.name,
        type: 'general',
        title: 'Commitment Today',
        message: commitment.text,
        route,
        priority: 1,
      })
    }
  }

  if (
    hasVisitRecorded(karkun, assignmentId) &&
    !isJihRegistered(karkun) &&
    daysSince(karkun.lastVisit) >= 7 &&
    daysSince(karkun.lastVisit) < Number.POSITIVE_INFINITY
  ) {
    reminders.push({
      id: `rem-jih-${karkun.id}`,
      karkunId: karkun.id,
      karkunName: karkun.name,
      type: 'registration',
      title: 'JIH Registration Pending',
      message: 'First meeting done — help with JIH App registration.',
      route,
      priority: 2,
    })
  }

  return reminders.sort((a, b) => a.priority - b.priority).slice(0, 2)
}
