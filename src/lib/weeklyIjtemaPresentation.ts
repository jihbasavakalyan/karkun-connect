/**
 * KC-0113.2 / KC-0113.3 / KC-028C — Weekly Ijtema admin presentation helpers.
 * Presentation-only; does not change adapters or repositories.
 * Uniqueness key: meetingDate + audienceGender (legacy = no gender).
 *
 * KC-037C2F — When duplicate Open events exist for the same meeting key,
 * prefer the event that already has canonical submission marks so Admin
 * Report / write binding stay on the attendance SoR (never invents data).
 */

import type { WeeklyIjtemaEvent } from '@/types/weeklyIjtema'
import { eventAudienceKey } from '@/lib/weeklyIjtema/attendanceWindowSchedule'
import { getWeeklyIjtemaSubmissionsForEvent } from '@/stores/weeklyIjtemaStore'

function submissionMarkCount(eventId: string): number {
  return getWeeklyIjtemaSubmissionsForEvent(eventId).reduce(
    (sum, submission) => sum + submission.marks.length,
    0,
  )
}

export function preferWeeklyIjtemaMeeting(
  current: WeeklyIjtemaEvent,
  candidate: WeeklyIjtemaEvent,
): WeeklyIjtemaEvent {
  if (current.status === 'Open' && candidate.status !== 'Open') return current
  if (candidate.status === 'Open' && current.status !== 'Open') return candidate
  // KC-037C2F — prefer event with existing attendance marks over empty newer Opens.
  const currentMarks = submissionMarkCount(current.id)
  const candidateMarks = submissionMarkCount(candidate.id)
  if (candidateMarks !== currentMarks) {
    return candidateMarks > currentMarks ? candidate : current
  }
  return candidate.updatedAt >= current.updatedAt ? candidate : current
}

/** Canonical meeting for a date (+ optional audience): Open preferred, else latest updatedAt. */
export function pickCanonicalWeeklyIjtemaMeeting(
  events: WeeklyIjtemaEvent[],
): WeeklyIjtemaEvent | undefined {
  if (events.length === 0) return undefined
  return events.reduce((best, event) => preferWeeklyIjtemaMeeting(best, event))
}

function uniquenessKey(event: WeeklyIjtemaEvent): string {
  return eventAudienceKey(event.meetingDate, event.audienceGender)
}

/**
 * Render exactly one card per meetingDate + audienceGender.
 *
 * KC-0113.3 / KC-028C: Create allowed one event per (meetingDate, audienceGender).
 * Prefer Open, then newest updatedAt.
 */
export function uniqueWeeklyIjtemaMeetingsForDisplay(
  events: WeeklyIjtemaEvent[],
): WeeklyIjtemaEvent[] {
  const byId = new Map<string, WeeklyIjtemaEvent>()
  for (const event of events) {
    byId.set(event.id, event)
  }

  const byKey = new Map<string, WeeklyIjtemaEvent[]>()
  for (const event of byId.values()) {
    const key = uniquenessKey(event)
    const group = byKey.get(key) ?? []
    group.push(event)
    byKey.set(key, group)
  }

  const unique: WeeklyIjtemaEvent[] = []
  for (const [key, group] of byKey) {
    if (group.length > 1) {
      console.warn('[KC-028C] Duplicate Weekly Ijtema meetings for key', {
        key,
        count: group.length,
        eventIds: group.map((event) => event.id),
        statuses: group.map((event) => event.status),
      })
    }
    const canonical = pickCanonicalWeeklyIjtemaMeeting(group)
    if (canonical) unique.push(canonical)
  }

  return unique.sort((a, b) => {
    const dateCmp = b.meetingDate.localeCompare(a.meetingDate)
    if (dateCmp !== 0) return dateCmp
    return (a.audienceGender ?? '').localeCompare(b.audienceGender ?? '')
  })
}
