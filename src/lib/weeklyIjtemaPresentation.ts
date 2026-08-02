/**
 * KC-0113.2 / KC-0113.3 / KC-028C — Weekly Ijtema admin presentation helpers.
 * Presentation-only; does not change adapters or repositories.
 * Uniqueness key: meetingDate + audienceGender (legacy = no gender).
 *
 * KC-037C2F — When duplicate Open events exist for the same meeting key,
 * prefer the event that already has canonical submission marks so Admin
 * Report / write binding stay on the attendance SoR (never invents data).
 *
 * KC-037C2G — Soft-archived duplicates are ignored. Surviving Open duplicates
 * are still collapsed to one canonical row so KPIs never sum the same roster
 * more than once per meetingDate+audience.
 */

import type { WeeklyIjtemaEvent } from '@/types/weeklyIjtema'
import { isWeeklyIjtemaEventActive } from '@/types/weeklyIjtema'
import { eventAudienceKey } from '@/lib/weeklyIjtema/attendanceWindowSchedule'
import { getWeeklyIjtemaSubmissionsForEvent } from '@/stores/weeklyIjtemaStore'

function submissionMarkCount(eventId: string): number {
  return getWeeklyIjtemaSubmissionsForEvent(eventId).reduce(
    (sum, submission) => sum + submission.marks.length,
    0,
  )
}

function statusRank(status: WeeklyIjtemaEvent['status']): number {
  if (status === 'Open') return 2
  if (status === 'Closed') return 1
  return 0 // archived
}

export function preferWeeklyIjtemaMeeting(
  current: WeeklyIjtemaEvent,
  candidate: WeeklyIjtemaEvent,
): WeeklyIjtemaEvent {
  const currentRank = statusRank(current.status)
  const candidateRank = statusRank(candidate.status)
  if (candidateRank !== currentRank) {
    return candidateRank > currentRank ? candidate : current
  }
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
  const active = events.filter(isWeeklyIjtemaEventActive)
  const pool = active.length > 0 ? active : events
  if (pool.length === 0) return undefined
  return pool.reduce((best, event) => preferWeeklyIjtemaMeeting(best, event))
}

function uniquenessKey(event: WeeklyIjtemaEvent): string {
  return eventAudienceKey(event.meetingDate, event.audienceGender)
}

/**
 * Exactly one event per meetingDate + audienceGender.
 *
 * KC-0113.3 / KC-028C / KC-037C2G: Prefer Open with marks; never surface archived
 * duplicates alongside the canonical meeting.
 */
export function uniqueWeeklyIjtemaMeetingsForDisplay(
  events: WeeklyIjtemaEvent[],
): WeeklyIjtemaEvent[] {
  const byId = new Map<string, WeeklyIjtemaEvent>()
  for (const event of events) {
    if (!isWeeklyIjtemaEventActive(event)) continue
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
      console.warn('[KC-037C2G] Duplicate Weekly Ijtema meetings for key', {
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
