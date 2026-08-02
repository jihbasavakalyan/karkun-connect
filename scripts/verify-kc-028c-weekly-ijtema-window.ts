/**
 * KC-028C — Automatic Weekly Ijtema attendance window verification.
 * Run: npx vite-node scripts/verify-kc-028c-weekly-ijtema-window.ts
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { clearWeeklyIjtemaStore } from '../src/stores/weeklyIjtemaStore'
import { clearWeeklyIjtemaNotifications } from '../src/stores/weeklyIjtemaNotificationStore'
import { canRuknEditWeeklyIjtema } from '../src/types/weeklyIjtema'
import {
  ensureWeeklyIjtemaAttendanceWindows,
  getActiveAttendanceWindowForGender,
} from '../src/lib/weeklyIjtema/attendanceWindowEngine'
import {
  DEFAULT_ATTENDANCE_WINDOW_SCHEDULE,
  getAttendanceWindowSchedule,
  getZonedClockParts,
  isWithinAttendanceWindow,
} from '../src/lib/weeklyIjtema/attendanceWindowSchedule'
import {
  getCurrentWeeklyIjtemaEvent,
  getWeeklyIjtemaEventById,
  reopenWeeklyIjtemaAttendance,
  saveWeeklyIjtemaSubmission,
} from '../src/services/weeklyIjtemaService'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`)
  console.log(`OK: ${message}`)
}

/** Find a UTC instant whose Asia/Karachi wall-clock matches the target weekday + time. */
function findZonedInstant(options: {
  dayOfWeek: number
  hour: number
  minute: number
  fromUtc?: Date
}): Date {
  const timezone = DEFAULT_ATTENDANCE_WINDOW_SCHEDULE.timezone
  const start = options.fromUtc ?? new Date('2026-07-01T00:00:00.000Z')
  for (let i = 0; i < 21 * 24 * 4; i += 1) {
    const candidate = new Date(start.getTime() + i * 15 * 60_000)
    const parts = getZonedClockParts(candidate, timezone)
    if (
      parts.dayOfWeek === options.dayOfWeek &&
      parts.hour === options.hour &&
      parts.minute === options.minute
    ) {
      return candidate
    }
  }
  throw new Error('Could not find zoned instant for test clock')
}

clearWeeklyIjtemaStore()
clearWeeklyIjtemaNotifications()

const schedule = getAttendanceWindowSchedule()
assert(schedule.timezone === 'Asia/Karachi', 'default timezone Asia/Karachi')
assert(
  schedule.entries.some((e) => e.audienceGender === 'Female' && e.dayOfWeek === 6),
  'Women schedule is Saturday',
)
assert(
  schedule.entries.some((e) => e.audienceGender === 'Male' && e.dayOfWeek === 0),
  'Men schedule is Sunday',
)

const engineSource = readFileSync(
  resolve('src/lib/weeklyIjtema/attendanceWindowEngine.ts'),
  'utf8',
)
assert(
  engineSource.includes('getAttendanceWindowSchedule'),
  'engine reads schedule config (not hardcoded days)',
)
assert(!/dayOfWeek:\s*6/.test(engineSource), 'engine does not hardcode Saturday')
assert(!/dayOfWeek:\s*0/.test(engineSource), 'engine does not hardcode Sunday')

const womenEntry = schedule.entries.find((e) => e.audienceGender === 'Female')!
const satMorning = findZonedInstant({ dayOfWeek: 6, hour: 10, minute: 0 })
assert(
  isWithinAttendanceWindow(womenEntry, satMorning, schedule.timezone),
  'Saturday 10:00 is within women window',
)

clearWeeklyIjtemaStore()
clearWeeklyIjtemaNotifications()
const womenEnsure = ensureWeeklyIjtemaAttendanceWindows(satMorning)
assert(womenEnsure.opened.length >= 1, 'women register opens automatically on Saturday')
const womenEvent = getActiveAttendanceWindowForGender('Female', satMorning)
assert(Boolean(womenEvent), 'active women window present')
assert(womenEvent!.audienceGender === 'Female', 'opened event is Female audience')
assert(womenEvent!.status === 'Open', 'women event is Open')
assert(womenEvent!.openedAutomatically === true, 'women event marked openedAutomatically')

const maleOnSat = getCurrentWeeklyIjtemaEvent({ audienceGender: 'Male' })
assert(
  maleOnSat === undefined || maleOnSat.audienceGender === 'Male' || !maleOnSat.audienceGender,
  'Male current does not bind to Female-only Saturday event',
)
assert(
  getCurrentWeeklyIjtemaEvent({ audienceGender: 'Male' })?.id !== womenEvent!.id,
  'correct gender register: Male current is not Female event',
)

clearWeeklyIjtemaStore()
clearWeeklyIjtemaNotifications()
const sunMorning = findZonedInstant({ dayOfWeek: 0, hour: 10, minute: 0 })
const menEnsure = ensureWeeklyIjtemaAttendanceWindows(sunMorning)
assert(menEnsure.opened.length >= 1, 'men register opens automatically on Sunday')
const menEvent = getActiveAttendanceWindowForGender('Male', sunMorning)
assert(Boolean(menEvent), 'active men window present')
assert(menEvent!.audienceGender === 'Male', 'opened event is Male audience')
assert(menEvent!.status === 'Open', 'men event is Open')
const menEventId = menEvent!.id

const monday = findZonedInstant({
  dayOfWeek: 1,
  hour: 10,
  minute: 0,
  fromUtc: sunMorning,
})
const closeEnsure = ensureWeeklyIjtemaAttendanceWindows(monday)
assert(
  closeEnsure.closed.some((event) => event.id === menEventId),
  'attendance closes automatically after window',
)
const afterClose = getWeeklyIjtemaEventById(menEventId)
assert(afterClose?.status === 'Closed', 'closed event status is Closed')
assert(!canRuknEditWeeklyIjtema(afterClose!), 'closed event is read-only for Rukn')

const rejected = saveWeeklyIjtemaSubmission({
  eventId: menEventId,
  ruknId: 'rukn-test',
  ruknName: 'Test',
  marks: [],
  submittedBy: 'rukn-test',
})
assert(!rejected.success, 'save rejected when attendance closed')

const reopen = reopenWeeklyIjtemaAttendance({
  eventId: menEventId,
  updatedBy: 'Admin Tester',
  reason: 'Late correction for travel delay',
  durationHours: 2,
})
assert(reopen.success, 'manual reopen works with reason and duration')
assert(reopen.success && reopen.event.status === 'Open', 'reopened event is Open')
assert(reopen.success && Boolean(reopen.event.reopenReason), 'reopen reason stored')
assert(reopen.success && Boolean(reopen.event.reopenUntil), 'reopen duration stored as reopenUntil')
assert(
  reopen.success && (reopen.event.reopenAudit?.length ?? 0) >= 1,
  'audit log recorded for reopen',
)
assert(
  reopen.success && reopen.event.reopenAudit![0].by === 'Admin Tester',
  'audit log records who reopened',
)

const card = readFileSync(
  resolve('src/components/execution/WeeklyIjtemaAttendanceOpenCard.tsx'),
  'utf8',
)
assert(
  card.includes("Today's Weekly Ijtema Attendance") ||
    card.includes('Today&apos;s Weekly Ijtema Attendance'),
  'dashboard open attendance title present',
)
assert(card.includes('Open Attendance'), 'dashboard Open Attendance quick action present')
assert(card.includes('Reminded') || card.includes('Present'), 'dashboard Reminded/Present metrics')
assert(card.includes('Absent'), 'dashboard Absent metric present')
assert(card.includes('Pending'), 'dashboard Pending metric present')

const rafeeq = readFileSync(
  resolve('src/features/digitalRafeeq/companion/rafeeqUrduCopy.ts'),
  'utf8',
)
assert(
  rafeeq.includes('آج ہفتہ وار اجتماع کی حاضری درج کرنا باقی ہے۔'),
  'Rafeeq incomplete attendance reminder present',
)
assert(rafeeq.includes('اجتماع کی حاضری مکمل کریں۔'), 'Rafeeq complete-attendance prompt present')

const adminPage = readFileSync(resolve('src/pages/admin/AdminWeeklyIjtemaPage.tsx'), 'utf8')
assert(adminPage.includes('Reopen Attendance'), 'admin reopen action present')
assert(adminPage.includes('Duration (hours)'), 'admin reopen duration field present')
assert(adminPage.includes('Automatic attendance windows'), 'admin schedule note present')

const triggers = readFileSync(resolve('src/types/communication.ts'), 'utf8')
assert(triggers.includes('ijtema-window-open'), 'AutomationTrigger ijtema-window-open present')
assert(
  triggers.includes('ijtema-incomplete-reminder'),
  'AutomationTrigger ijtema-incomplete-reminder present',
)

const main = readFileSync(resolve('src/main.tsx'), 'utf8')
assert(
  main.includes('ensureWeeklyIjtemaAttendanceWindows'),
  'deferred bootstrap wires attendance window ensure',
)

const home = readFileSync(resolve('src/pages/rukn/RuknHomePage.tsx'), 'utf8')
assert(
  home.includes('WeeklyIjtemaAttendanceOpenCard'),
  'Rukn home mounts attendance open card',
)

console.log('KC-028C verify: PASS')
