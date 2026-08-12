/**
 * KC-028C — Configurable Weekly Ijtema attendance window schedule.
 * Business days/times live here (or localStorage override) — not hardcoded in the engine.
 */

export type WeeklyIjtemaAudienceGender = 'Male' | 'Female'

export type AttendanceWindowScheduleEntry = {
  id: string
  label: string
  /** 0 = Sunday … 6 = Saturday (JS getDay convention in target timezone). */
  dayOfWeek: number
  audienceGender: WeeklyIjtemaAudienceGender
  /** Local HH:MM inclusive start (e.g. "00:01"). */
  openTime: string
  /** Local HH:MM inclusive end (e.g. "23:59"). */
  closeTime: string
  title: string
}

export type AttendanceWindowScheduleConfig = {
  timezone: string
  /** Local HH:MM after which incomplete-attendance reminders may fire. */
  reminderAfterTime: string
  entries: AttendanceWindowScheduleEntry[]
}

const STORAGE_KEY = 'karkun-connect.weekly-ijtema.attendance-window-schedule'

export const DEFAULT_ATTENDANCE_WINDOW_SCHEDULE: AttendanceWindowScheduleConfig = {
  timezone: 'Asia/Karachi',
  reminderAfterTime: '18:00',
  entries: [
    {
      id: 'womens-weekly-ijtema',
      label: "Women's Weekly Ijtema",
      dayOfWeek: 6,
      audienceGender: 'Female',
      openTime: '00:01',
      closeTime: '23:59',
      title: "Women's Weekly Ijtema",
    },
    {
      id: 'mens-weekly-ijtema',
      label: "Men's Weekly Ijtema",
      dayOfWeek: 0,
      audienceGender: 'Male',
      openTime: '00:01',
      closeTime: '23:59',
      title: "Men's Weekly Ijtema",
    },
  ],
}

function isValidEntry(entry: unknown): entry is AttendanceWindowScheduleEntry {
  if (!entry || typeof entry !== 'object') return false
  const row = entry as AttendanceWindowScheduleEntry
  return (
    typeof row.id === 'string' &&
    typeof row.label === 'string' &&
    typeof row.dayOfWeek === 'number' &&
    row.dayOfWeek >= 0 &&
    row.dayOfWeek <= 6 &&
    (row.audienceGender === 'Male' || row.audienceGender === 'Female') &&
    typeof row.openTime === 'string' &&
    typeof row.closeTime === 'string' &&
    typeof row.title === 'string'
  )
}

function parseConfig(raw: unknown): AttendanceWindowScheduleConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as AttendanceWindowScheduleConfig
  if (typeof row.timezone !== 'string' || !row.timezone.trim()) return null
  if (typeof row.reminderAfterTime !== 'string') return null
  if (!Array.isArray(row.entries) || row.entries.length === 0) return null
  if (!row.entries.every(isValidEntry)) return null
  return {
    timezone: row.timezone.trim(),
    reminderAfterTime: row.reminderAfterTime,
    entries: row.entries,
  }
}

export function getAttendanceWindowSchedule(): AttendanceWindowScheduleConfig {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_ATTENDANCE_WINDOW_SCHEDULE
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_ATTENDANCE_WINDOW_SCHEDULE
    const parsed = parseConfig(JSON.parse(raw) as unknown)
    return parsed ?? DEFAULT_ATTENDANCE_WINDOW_SCHEDULE
  } catch {
    return DEFAULT_ATTENDANCE_WINDOW_SCHEDULE
  }
}

export function setAttendanceWindowSchedule(config: AttendanceWindowScheduleConfig): void {
  const parsed = parseConfig(config)
  if (!parsed) {
    throw new Error('Invalid attendance window schedule configuration.')
  }
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
  } catch {
    // ignore storage failures
  }
}

export function resetAttendanceWindowSchedule(): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export type ZonedClockParts = {
  year: number
  month: number
  day: number
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number
  hour: number
  minute: number
  second: number
  /** YYYY-MM-DD in timezone */
  dateKey: string
  /** minutes since local midnight */
  minutesOfDay: number
}

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

export function getZonedClockParts(
  now: Date,
  timezone = getAttendanceWindowSchedule().timezone,
): ZonedClockParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const parts = formatter.formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  const year = Number(get('year'))
  const month = Number(get('month'))
  const day = Number(get('day'))
  const hour = Number(get('hour'))
  const minute = Number(get('minute'))
  const second = Number(get('second'))
  const weekday = get('weekday')
  const dayOfWeek = WEEKDAY_TO_INDEX[weekday] ?? now.getUTCDay()
  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  return {
    year,
    month,
    day,
    dayOfWeek,
    hour,
    minute,
    second,
    dateKey,
    minutesOfDay: hour * 60 + minute,
  }
}

export function parseHhMmToMinutes(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!match) return 0
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return 0
  return hour * 60 + minute
}

export function isWithinAttendanceWindow(
  entry: AttendanceWindowScheduleEntry,
  now: Date,
  timezone?: string,
): boolean {
  const clock = getZonedClockParts(now, timezone ?? getAttendanceWindowSchedule().timezone)
  if (clock.dayOfWeek !== entry.dayOfWeek) return false
  const open = parseHhMmToMinutes(entry.openTime)
  const close = parseHhMmToMinutes(entry.closeTime)
  return clock.minutesOfDay >= open && clock.minutesOfDay <= close
}

export function isPastReminderThreshold(now: Date, config = getAttendanceWindowSchedule()): boolean {
  const clock = getZonedClockParts(now, config.timezone)
  return clock.minutesOfDay >= parseHhMmToMinutes(config.reminderAfterTime)
}

/**
 * Same-day close deadline as ISO (end of closeTime minute in schedule timezone).
 * Binary-searches the UTC instant whose zoned wall-clock matches dateKey + closeTime:59.
 */
export function sameDayWindowDeadlineIso(
  dateKey: string,
  closeTime: string,
  timezone: string,
): string {
  const closeMinutes = parseHhMmToMinutes(closeTime)
  const hour = Math.floor(closeMinutes / 60)
  const minute = closeMinutes % 60
  const targetSecond = 59

  let low = Date.parse(`${dateKey}T00:00:00.000Z`) - 14 * 3600_000
  let high = Date.parse(`${dateKey}T00:00:00.000Z`) + 38 * 3600_000
  let best = new Date(`${dateKey}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:59`)

  for (let i = 0; i < 48; i += 1) {
    const mid = Math.floor((low + high) / 2)
    const parts = getZonedClockParts(new Date(mid), timezone)
    const midMinutes = parts.hour * 60 + parts.minute
    const targetMinutes = hour * 60 + minute
    const cmpDate = parts.dateKey.localeCompare(dateKey)
    if (cmpDate < 0 || (cmpDate === 0 && midMinutes < targetMinutes)) {
      low = mid + 1
      continue
    }
    if (cmpDate > 0 || (cmpDate === 0 && midMinutes > targetMinutes)) {
      high = mid - 1
      continue
    }
    // Same minute — adjust seconds toward :59
    best = new Date(mid + (targetSecond - parts.second) * 1000)
    const check = getZonedClockParts(best, timezone)
    if (check.dateKey === dateKey && check.hour === hour && check.minute === minute) {
      return best.toISOString()
    }
    high = mid - 1
  }
  return best.toISOString()
}

export function eventAudienceKey(
  meetingDate: string,
  audienceGender: WeeklyIjtemaAudienceGender | undefined,
): string {
  return `${meetingDate}:${audienceGender ?? 'legacy'}`
}

/**
 * Phase 3 — weekday-window rows as weekly recurrence descriptors.
 * Occurrence foundation reuses this precursor; does not invent a parallel WI calendar.
 * See `src/lib/occurrence/recurrence.ts` (no automatic Occurrence generation here).
 */
export type WeeklyWindowRecurrenceDescriptor = {
  scheduleEntryId: string
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number
  audienceGender: WeeklyIjtemaAudienceGender
  openTime: string
  closeTime: string
  title: string
  timezone: string
}

export function listWeeklyWindowRecurrenceDescriptors(
  config: AttendanceWindowScheduleConfig = DEFAULT_ATTENDANCE_WINDOW_SCHEDULE,
): WeeklyWindowRecurrenceDescriptor[] {
  return config.entries.map((entry) => ({
    scheduleEntryId: entry.id,
    dayOfWeek: entry.dayOfWeek,
    audienceGender: entry.audienceGender,
    openTime: entry.openTime,
    closeTime: entry.closeTime,
    title: entry.title,
    timezone: config.timezone,
  }))
}
