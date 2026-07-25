/**
 * KC-0113.2 / KC-0113.3 — Weekly Ijtema admin presentation helpers.
 * Presentation-only; does not change adapters or repositories.
 */

import type { WeeklyIjtemaEvent } from '@/types/weeklyIjtema'

export function preferWeeklyIjtemaMeeting(
  current: WeeklyIjtemaEvent,
  candidate: WeeklyIjtemaEvent,
): WeeklyIjtemaEvent {
  if (current.status === 'Open' && candidate.status !== 'Open') return current
  if (candidate.status === 'Open' && current.status !== 'Open') return candidate
  return candidate.updatedAt >= current.updatedAt ? candidate : current
}

/** Canonical meeting for a date: Open preferred, else latest updatedAt. */
export function pickCanonicalWeeklyIjtemaMeeting(
  events: WeeklyIjtemaEvent[],
): WeeklyIjtemaEvent | undefined {
  if (events.length === 0) return undefined
  return events.reduce((best, event) => preferWeeklyIjtemaMeeting(best, event))
}

/**
 * Render exactly one card per meetingDate.
 *
 * Root cause of duplicates: Create allowed multiple events for the same
 * meetingDate (distinct ids). Prefer Open, then newest updatedAt.
 * When storage still has duplicates, warn once per render call for investigation.
 */
export function uniqueWeeklyIjtemaMeetingsForDisplay(
  events: WeeklyIjtemaEvent[],
): WeeklyIjtemaEvent[] {
  const byId = new Map<string, WeeklyIjtemaEvent>()
  for (const event of events) {
    byId.set(event.id, event)
  }

  const byMeetingDate = new Map<string, WeeklyIjtemaEvent[]>()
  for (const event of byId.values()) {
    const group = byMeetingDate.get(event.meetingDate) ?? []
    group.push(event)
    byMeetingDate.set(event.meetingDate, group)
  }

  const unique: WeeklyIjtemaEvent[] = []
  for (const [meetingDate, group] of byMeetingDate) {
    if (group.length > 1) {
      console.warn('[KC-0113.3] Duplicate Weekly Ijtema meetings for meetingDate', {
        meetingDate,
        count: group.length,
        eventIds: group.map((event) => event.id),
        statuses: group.map((event) => event.status),
      })
    }
    const canonical = pickCanonicalWeeklyIjtemaMeeting(group)
    if (canonical) unique.push(canonical)
  }

  return unique.sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))
}
