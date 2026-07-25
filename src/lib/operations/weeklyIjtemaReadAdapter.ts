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
  type IjtemaAttendanceRecord,
  type IjtemaAttendanceStatus,
} from '@/types/ijtemaAttendance'
import { formatCycleDateLabel } from '@/lib/campaignCycle/lifecycle'
import {
  getCurrentIjtemaAttendance,
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
