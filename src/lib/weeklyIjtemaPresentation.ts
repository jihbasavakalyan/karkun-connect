/**
 * KC-0113.2 — Weekly Ijtema admin presentation helpers.
 * Presentation-only; does not change adapters or repositories.
 */

import type { WeeklyIjtemaEvent } from '@/types/weeklyIjtema'

function preferWeeklyIjtemaMeeting(
  current: WeeklyIjtemaEvent,
  candidate: WeeklyIjtemaEvent,
): WeeklyIjtemaEvent {
  if (current.status === 'Open' && candidate.status !== 'Open') return current
  if (candidate.status === 'Open' && current.status !== 'Open') return candidate
  return candidate.updatedAt >= current.updatedAt ? candidate : current
}

/**
 * Render exactly one card per meeting.
 *
 * Root cause of duplicates: Create allows multiple events for the same
 * `meetingDate` (distinct canonical ids). The list previously rendered all of them.
 * Prefer Open status, then newest `updatedAt`. React keys use the chosen event id.
 */
export function uniqueWeeklyIjtemaMeetingsForDisplay(
  events: WeeklyIjtemaEvent[],
): WeeklyIjtemaEvent[] {
  const byId = new Map<string, WeeklyIjtemaEvent>()
  for (const event of events) {
    byId.set(event.id, event)
  }

  const byMeetingDate = new Map<string, WeeklyIjtemaEvent>()
  for (const event of byId.values()) {
    const existing = byMeetingDate.get(event.meetingDate)
    if (!existing) {
      byMeetingDate.set(event.meetingDate, event)
      continue
    }
    byMeetingDate.set(event.meetingDate, preferWeeklyIjtemaMeeting(existing, event))
  }

  return [...byMeetingDate.values()].sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))
}
