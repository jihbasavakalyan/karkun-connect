/**
 * KC-0110.2 — Weekly Ijtema canonical read adapter.
 *
 * Presentation/read abstraction only. Prefers the event/cycle SoR
 * (`weeklyIjtema*`); falls back to legacy per-Karkun attendance when no
 * mark exists on the current event. No persistence, caching, or writes.
 *
 * Inventory: docs/architecture/kc-0110-weekly-ijtema-inventory.md
 */

import {
  formatWeekLabel,
  getWeekEndingDate,
  type IjtemaAttendanceDashboardMetrics,
  type IjtemaAttendanceKarkunSummary,
  type IjtemaAttendanceRecord,
  type IjtemaAttendanceStatus,
} from '@/types/ijtemaAttendance'
import { formatCycleDateLabel } from '@/lib/campaignCycle/lifecycle'
import { getAllKarkuns } from '@/lib/peopleStore'
import {
  getCurrentIjtemaAttendance,
  getFilterWeekEndingDate,
  getIjtemaAttendanceForKarkun,
  getIjtemaAttendanceHistory,
} from '@/services/ijtemaAttendanceService'
import {
  getCurrentWeeklyIjtemaEvent,
  getWeeklyIjtemaEventById,
} from '@/services/weeklyIjtemaService'
import {
  getAllWeeklyIjtemaEvents,
  getWeeklyIjtemaSubmissionsForEvent,
} from '@/stores/weeklyIjtemaStore'
import type { WeeklyIjtemaEvent, WeeklyIjtemaMarkStatus } from '@/types/weeklyIjtema'

export type WeeklyIjtemaReadSource = 'canonical' | 'legacy'

export type WeeklyIjtemaCurrentAttendanceView = {
  karkunId: string
  status: IjtemaAttendanceStatus | 'Not recorded'
  weekEndingDate: string
  weekLabel: string
  remarks?: string
  source: WeeklyIjtemaReadSource
  eventId?: string
  meetingDate?: string
}

function findCanonicalMark(
  event: WeeklyIjtemaEvent,
  karkunId: string,
): { status: WeeklyIjtemaMarkStatus; ruknId: string; updatedAt: string } | null {
  const submissions = getWeeklyIjtemaSubmissionsForEvent(event.id)
  for (const submission of submissions) {
    const mark = submission.marks.find((entry) => entry.karkunId === karkunId)
    if (mark) {
      return {
        status: mark.status,
        ruknId: submission.ruknId,
        updatedAt: submission.updatedAt,
      }
    }
  }
  return null
}

/**
 * Current Weekly Ijtema attendance for presentation.
 * Canonical event mark wins when present; otherwise legacy week record.
 */
export function getWeeklyIjtemaCurrentAttendanceView(
  karkunId: string,
): WeeklyIjtemaCurrentAttendanceView {
  const event = getCurrentWeeklyIjtemaEvent()
  if (event) {
    const mark = findCanonicalMark(event, karkunId)
    if (mark) {
      return {
        karkunId,
        status: mark.status,
        weekEndingDate: event.meetingDate,
        weekLabel: formatCycleDateLabel(event.meetingDate),
        source: 'canonical',
        eventId: event.id,
        meetingDate: event.meetingDate,
      }
    }
  }

  const legacy = getCurrentIjtemaAttendance(karkunId)
  return {
    karkunId,
    status: legacy.status,
    weekEndingDate: legacy.weekEndingDate,
    weekLabel: legacy.weekLabel,
    remarks: legacy.remarks,
    source: 'legacy',
  }
}

/**
 * History for Journey: canonical event marks (newest first), then legacy
 * week records not already represented by an event meeting date.
 */
export function getWeeklyIjtemaAttendanceHistoryView(
  karkunId: string,
  limit = 5,
): IjtemaAttendanceRecord[] {
  const canonicalRows: IjtemaAttendanceRecord[] = []
  const seenDates = new Set<string>()

  const events = [...getAllWeeklyIjtemaEvents()].sort((a, b) =>
    b.meetingDate.localeCompare(a.meetingDate),
  )

  for (const event of events) {
    const mark = findCanonicalMark(event, karkunId)
    if (!mark) continue
    seenDates.add(event.meetingDate)
    canonicalRows.push({
      karkunId,
      weekEndingDate: event.meetingDate,
      status: mark.status,
      updatedAt: mark.updatedAt,
      updatedBy: mark.ruknId,
      ruknId: mark.ruknId,
    })
  }

  const legacyRows = getIjtemaAttendanceHistory(karkunId, limit * 2).filter(
    (row) => !seenDates.has(row.weekEndingDate),
  )

  return [...canonicalRows, ...legacyRows]
    .sort((a, b) => b.weekEndingDate.localeCompare(a.weekEndingDate))
    .slice(0, limit)
}

export function describeWeeklyIjtemaEventLabel(eventId: string | undefined): string | null {
  if (!eventId) return null
  const event = getWeeklyIjtemaEventById(eventId)
  if (!event) return null
  return `${event.title} · ${formatWeekLabel(event.meetingDate)}`
}

/**
 * KC-0110.3 — Compliance list rows: one summary per active Karkun from the
 * current attendance view (canonical mark preferred; else legacy).
 */
export function getWeeklyIjtemaAttendanceSummariesView(): IjtemaAttendanceKarkunSummary[] {
  return getAllKarkuns().map((karkun) => {
    const attendance = getWeeklyIjtemaCurrentAttendanceView(karkun.id)
    return {
      karkunId: karkun.id,
      karkunName: karkun.name,
      weekEndingDate: attendance.weekEndingDate,
      weekLabel: attendance.weekLabel,
      status: attendance.status,
      remarks: attendance.remarks,
    }
  })
}

/**
 * KC-0110.3 — Compliance summary counts from the same current-attendance view
 * used by list rows (keeps cards and filters aligned).
 */
export function getWeeklyIjtemaDashboardMetricsView(): IjtemaAttendanceDashboardMetrics {
  let present = 0
  let absent = 0
  let excused = 0
  let notRecorded = 0

  for (const karkun of getAllKarkuns()) {
    const status = getWeeklyIjtemaCurrentAttendanceView(karkun.id).status
    if (status === 'Present') present += 1
    else if (status === 'Absent') absent += 1
    else if (status === 'Excused') excused += 1
    else notRecorded += 1
  }

  return {
    present,
    absent,
    excused,
    notRecorded,
    informed: excused,
  }
}

/**
 * KC-0110.4 — Attendance for a specific week ending date (People filters).
 * Prefers a canonical event whose meetingDate matches; for the current week
 * ending, reuses the current-attendance view; else legacy week record.
 */
export function getWeeklyIjtemaAttendanceForWeekView(
  karkunId: string,
  weekEndingDate: string,
): WeeklyIjtemaCurrentAttendanceView {
  const eventByDate = getAllWeeklyIjtemaEvents().find(
    (event) => event.meetingDate === weekEndingDate,
  )
  if (eventByDate) {
    const mark = findCanonicalMark(eventByDate, karkunId)
    if (mark) {
      return {
        karkunId,
        status: mark.status,
        weekEndingDate: eventByDate.meetingDate,
        weekLabel: formatCycleDateLabel(eventByDate.meetingDate),
        source: 'canonical',
        eventId: eventByDate.id,
        meetingDate: eventByDate.meetingDate,
      }
    }
  }

  if (weekEndingDate === getWeekEndingDate()) {
    return getWeeklyIjtemaCurrentAttendanceView(karkunId)
  }

  const legacy = getIjtemaAttendanceForKarkun(karkunId, weekEndingDate)
  return {
    karkunId,
    status: legacy.status,
    weekEndingDate: legacy.weekEndingDate,
    weekLabel: legacy.weekLabel,
    remarks: legacy.remarks,
    source: 'legacy',
  }
}

/**
 * KC-0110.4 — People list Ijtema filters (same semantics as legacy matcher).
 */
export function matchesWeeklyIjtemaAttendanceFiltersView(
  karkunId: string,
  statusFilter: string,
  weekFilter: string,
): boolean {
  const hasStatusFilter = Boolean(statusFilter)
  const hasWeekFilter = Boolean(weekFilter)

  if (!hasStatusFilter && !hasWeekFilter) {
    return true
  }

  const weekEndingDate = getFilterWeekEndingDate(weekFilter)
  const attendance = getWeeklyIjtemaAttendanceForWeekView(karkunId, weekEndingDate)
  const normalizedFilter = statusFilter === 'Informed' ? 'Excused' : statusFilter

  if (hasStatusFilter && attendance.status !== normalizedFilter) {
    return false
  }

  return true
}
