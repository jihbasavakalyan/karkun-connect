/**
 * KC-028C — Automatic Weekly Ijtema attendance window engine.
 * Idempotent ensure: open configured gender windows; close when window (or reopenUntil) ends.
 * Schedule comes from attendanceWindowSchedule — not hardcoded here.
 *
 * Phase 3: this engine remains the live WI Occurrence precursor for open/close.
 * Generic Occurrence records / recurrence helpers live under src/lib/occurrence +
 * occurrences collection — do not invent a parallel WI date generator here.
 */

import { ruknMaster } from '@/data/ruknMaster'
import { getRulesForTrigger } from '@/services/notificationService'
import {
  closeWeeklyIjtemaAttendance,
  createWeeklyIjtemaEvent,
  getCurrentWeeklyIjtemaEvent,
  getRuknAttendanceProgress,
  getWeeklyIjtemaEventByMeetingDate,
  listWeeklyIjtemaEvents,
  openWeeklyIjtemaAttendance,
  updateWeeklyIjtemaEvent,
} from '@/services/weeklyIjtemaService'
import { enqueueWeeklyIjtemaNotification } from '@/stores/weeklyIjtemaNotificationStore'
import type { WeeklyIjtemaEvent } from '@/types/weeklyIjtema'
import {
  eventAudienceKey,
  getAttendanceWindowSchedule,
  getZonedClockParts,
  isPastReminderThreshold,
  isWithinAttendanceWindow,
  sameDayWindowDeadlineIso,
  type AttendanceWindowScheduleEntry,
  type WeeklyIjtemaAudienceGender,
} from '@/lib/weeklyIjtema/attendanceWindowSchedule'

export type EnsureAttendanceWindowsResult = {
  opened: WeeklyIjtemaEvent[]
  closed: WeeklyIjtemaEvent[]
  active: WeeklyIjtemaEvent[]
}

const SYSTEM_ACTOR = 'system:attendance-window'

function eligibleRuknsForGender(gender: WeeklyIjtemaAudienceGender) {
  return ruknMaster.filter(
    (rukn) => rukn.status === 'active' && !rukn.isArchived && rukn.gender === gender,
  )
}

function notifyWindowOpen(event: WeeklyIjtemaEvent): void {
  if (!event.audienceGender) return
  const windowKey = eventAudienceKey(event.meetingDate, event.audienceGender)
  // Touch automation rules (dispatch remains stub — Sprint 17 reserved).
  void getRulesForTrigger('ijtema-window-open')

  for (const rukn of eligibleRuknsForGender(event.audienceGender)) {
    enqueueWeeklyIjtemaNotification({
      ruknId: rukn.id,
      kind: 'ijtema-window-open',
      messageUrdu: 'آج ہفتہ وار اجتماع کی حاضری درج کرنے کا دن ہے۔',
      eventId: event.id,
      windowKey,
    })
  }
}

function notifyIncompleteReminders(
  event: WeeklyIjtemaEvent,
  now: Date,
): void {
  if (!event.audienceGender || event.status !== 'Open') return
  if (!isPastReminderThreshold(now)) return
  void getRulesForTrigger('ijtema-incomplete-reminder')

  const windowKey = `${eventAudienceKey(event.meetingDate, event.audienceGender)}:reminder`
  for (const rukn of eligibleRuknsForGender(event.audienceGender)) {
    const progress = getRuknAttendanceProgress(event.id, rukn.id)
    if (progress.unmarked <= 0) continue
    enqueueWeeklyIjtemaNotification({
      ruknId: rukn.id,
      kind: 'ijtema-incomplete-reminder',
      messageUrdu: `آپ کے ${progress.unmarked} کارکنوں کی حاضری ابھی درج نہیں ہوئی۔`,
      eventId: event.id,
      windowKey,
    })
  }
}

function ensureOpenForEntry(
  entry: AttendanceWindowScheduleEntry,
  now: Date,
  timezone: string,
): WeeklyIjtemaEvent | null {
  if (!isWithinAttendanceWindow(entry, now, timezone)) return null

  const clock = getZonedClockParts(now, timezone)
  const existing = getWeeklyIjtemaEventByMeetingDate(clock.dateKey, entry.audienceGender)
  const deadline = sameDayWindowDeadlineIso(clock.dateKey, entry.closeTime, timezone)

  if (existing) {
    if (existing.status === 'Closed') {
      const opened = openWeeklyIjtemaAttendance(existing.id, SYSTEM_ACTOR)
      if (!opened.success) return null
      updateWeeklyIjtemaEvent({
        eventId: opened.event.id,
        meetingDate: opened.event.meetingDate,
        title: opened.event.title,
        submissionDeadline: deadline,
        audienceGender: entry.audienceGender,
        updatedBy: SYSTEM_ACTOR,
      })
      const refreshed = getWeeklyIjtemaEventByMeetingDate(clock.dateKey, entry.audienceGender)
      if (refreshed) notifyWindowOpen(refreshed)
      return refreshed ?? opened.event
    }
    notifyWindowOpen(existing)
    notifyIncompleteReminders(existing, now)
    return existing
  }

  const created = createWeeklyIjtemaEvent({
    meetingDate: clock.dateKey,
    title: entry.title,
    submissionDeadline: deadline,
    createdBy: SYSTEM_ACTOR,
    audienceGender: entry.audienceGender,
    openedAutomatically: true,
  })
  if (!created.success) {
    const fallback = getWeeklyIjtemaEventByMeetingDate(clock.dateKey, entry.audienceGender)
    if (fallback) {
      if (fallback.status === 'Closed') {
        openWeeklyIjtemaAttendance(fallback.id, SYSTEM_ACTOR)
      }
      notifyWindowOpen(fallback)
      return fallback
    }
    return null
  }
  notifyWindowOpen(created.event)
  return created.event
}

function shouldAutoClose(event: WeeklyIjtemaEvent, now: Date, timezone: string): boolean {
  if (event.status !== 'Open') return false

  if (event.reopenUntil) {
    return now.getTime() > new Date(event.reopenUntil).getTime()
  }

  // Only auto-close events that were opened by the window engine (or match a schedule day).
  if (!event.openedAutomatically && !event.audienceGender) return false

  const config = getAttendanceWindowSchedule()
  const entry = config.entries.find((row) => row.audienceGender === event.audienceGender)
  if (!entry) {
    // Fall back to deadline
    return now.getTime() > new Date(event.submissionDeadline).getTime()
  }

  const clock = getZonedClockParts(now, timezone)
  if (event.meetingDate !== clock.dateKey) {
    // Meeting day ended — close unless still within a same calendar day window for that date.
    return true
  }
  return !isWithinAttendanceWindow(entry, now, timezone)
}

/**
 * Idempotent: open active schedule windows; close expired auto/reopen windows.
 * Safe to call after hydrate and on Rukn / Weekly Ijtema page mounts.
 */
export function ensureWeeklyIjtemaAttendanceWindows(
  now = new Date(),
): EnsureAttendanceWindowsResult {
  const config = getAttendanceWindowSchedule()
  const opened: WeeklyIjtemaEvent[] = []
  const closed: WeeklyIjtemaEvent[] = []

  for (const entry of config.entries) {
    const event = ensureOpenForEntry(entry, now, config.timezone)
    if (event && event.status === 'Open') opened.push(event)
  }

  for (const event of listWeeklyIjtemaEvents()) {
    if (!shouldAutoClose(event, now, config.timezone)) continue
    const result = closeWeeklyIjtemaAttendance(event.id, SYSTEM_ACTOR)
    if (result.success) closed.push(result.event)
  }

  const active = listWeeklyIjtemaEvents().filter((event) => event.status === 'Open')
  return { opened, closed, active }
}

export function getActiveAttendanceWindowForGender(
  gender: WeeklyIjtemaAudienceGender,
  now = new Date(),
): WeeklyIjtemaEvent | undefined {
  const config = getAttendanceWindowSchedule()
  const entry = config.entries.find((row) => row.audienceGender === gender)
  if (!entry || !isWithinAttendanceWindow(entry, now, config.timezone)) {
    // Still surface Open event if Admin reopened outside schedule
    return getCurrentWeeklyIjtemaEvent({ audienceGender: gender })
  }
  const clock = getZonedClockParts(now, config.timezone)
  return (
    getCurrentWeeklyIjtemaEvent({
      audienceGender: gender,
      meetingDate: clock.dateKey,
    }) ?? getCurrentWeeklyIjtemaEvent({ audienceGender: gender })
  )
}

export function isAttendanceWindowActiveForGender(
  gender: WeeklyIjtemaAudienceGender,
  now = new Date(),
): boolean {
  const event = getActiveAttendanceWindowForGender(gender, now)
  return Boolean(event && event.status === 'Open')
}

export { getRuknAttendanceProgress }
