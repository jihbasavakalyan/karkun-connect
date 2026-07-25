/**
 * KC-0110 — Weekly Ijtema canonical read adapter.
 *
 * Presentation/read abstraction only. Prefers the event/cycle SoR
 * (`weeklyIjtema*`); falls back to legacy per-Karkun attendance when no
 * mark exists on the current event. No persistence, caching, or writes.
 *
 * Dev diagnostics: set localStorage `kc.debug.weeklyIjtemaReads=1` (DEV only).
 * Inventory: docs/architecture/kc-0110-weekly-ijtema-inventory.md
 */

import {
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
import { getCurrentWeeklyIjtemaEvent } from '@/services/weeklyIjtemaService'
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

type CanonicalMark = {
  status: WeeklyIjtemaMarkStatus
  ruknId: string
  updatedAt: string
}

/** KC-0110.5 — DEV-only; enable via localStorage `kc.debug.weeklyIjtemaReads=1`. */
function isWeeklyIjtemaReadDebugEnabled(): boolean {
  if (!import.meta.env.DEV) return false
  try {
    return globalThis.localStorage?.getItem('kc.debug.weeklyIjtemaReads') === '1'
  } catch {
    return false
  }
}

function logWeeklyIjtemaRead(
  operation: string,
  source: WeeklyIjtemaReadSource,
  detail?: Record<string, unknown>,
): void {
  if (!isWeeklyIjtemaReadDebugEnabled()) return
  const label = source === 'canonical' ? 'Canonical Event' : 'Legacy Fallback'
  console.debug(`[KC-0110.5] Weekly Ijtema ${operation}: ${label}`, detail ?? '')
}

function findCanonicalMark(
  event: WeeklyIjtemaEvent,
  karkunId: string,
): CanonicalMark | null {
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

/** One pass over submissions — used by bulk Compliance/People reads. */
function buildCanonicalMarkIndex(event: WeeklyIjtemaEvent): Map<string, CanonicalMark> {
  const index = new Map<string, CanonicalMark>()
  for (const submission of getWeeklyIjtemaSubmissionsForEvent(event.id)) {
    for (const mark of submission.marks) {
      if (index.has(mark.karkunId)) continue
      index.set(mark.karkunId, {
        status: mark.status,
        ruknId: submission.ruknId,
        updatedAt: submission.updatedAt,
      })
    }
  }
  return index
}

function viewFromCanonicalMark(
  karkunId: string,
  event: WeeklyIjtemaEvent,
  mark: CanonicalMark,
): WeeklyIjtemaCurrentAttendanceView {
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

function viewFromLegacyCurrent(karkunId: string): WeeklyIjtemaCurrentAttendanceView {
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
      const view = viewFromCanonicalMark(karkunId, event, mark)
      logWeeklyIjtemaRead('current', view.source, { karkunId, eventId: event.id })
      return view
    }
  }

  const view = viewFromLegacyCurrent(karkunId)
  logWeeklyIjtemaRead('current', view.source, { karkunId })
  return view
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

  const rows = [...canonicalRows, ...legacyRows]
    .sort((a, b) => b.weekEndingDate.localeCompare(a.weekEndingDate))
    .slice(0, limit)

  if (isWeeklyIjtemaReadDebugEnabled()) {
    console.debug('[KC-0110.5] Weekly Ijtema history:', {
      karkunId,
      canonical: canonicalRows.length,
      legacyMerged: legacyRows.length,
      returned: rows.length,
    })
  }

  return rows
}

/**
 * KC-0110.3 — Compliance list rows: one summary per active Karkun.
 * Builds a single mark index for the current event (avoids N submission scans).
 */
export function getWeeklyIjtemaAttendanceSummariesView(): IjtemaAttendanceKarkunSummary[] {
  const event = getCurrentWeeklyIjtemaEvent()
  const markIndex = event ? buildCanonicalMarkIndex(event) : null
  let canonicalCount = 0
  let legacyCount = 0

  const summaries = getAllKarkuns().map((karkun) => {
    let attendance: WeeklyIjtemaCurrentAttendanceView
    const mark = markIndex?.get(karkun.id)
    if (event && mark) {
      attendance = viewFromCanonicalMark(karkun.id, event, mark)
      canonicalCount += 1
    } else {
      attendance = viewFromLegacyCurrent(karkun.id)
      legacyCount += 1
    }

    return {
      karkunId: karkun.id,
      karkunName: karkun.name,
      weekEndingDate: attendance.weekEndingDate,
      weekLabel: attendance.weekLabel,
      status: attendance.status,
      remarks: attendance.remarks,
    }
  })

  if (isWeeklyIjtemaReadDebugEnabled()) {
    console.debug('[KC-0110.5] Weekly Ijtema summaries:', {
      eventId: event?.id ?? null,
      canonical: canonicalCount,
      legacyFallback: legacyCount,
    })
  }

  return summaries
}

/**
 * KC-0110.3 — Compliance summary counts from the same summaries view
 * (single mapping pass; cards stay aligned with list filters).
 */
export function getWeeklyIjtemaDashboardMetricsView(): IjtemaAttendanceDashboardMetrics {
  let present = 0
  let absent = 0
  let excused = 0
  let notRecorded = 0

  for (const row of getWeeklyIjtemaAttendanceSummariesView()) {
    if (row.status === 'Present') present += 1
    else if (row.status === 'Absent') absent += 1
    else if (row.status === 'Excused') excused += 1
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
      const view = viewFromCanonicalMark(karkunId, eventByDate, mark)
      logWeeklyIjtemaRead('week', view.source, { karkunId, weekEndingDate, eventId: eventByDate.id })
      return view
    }
  }

  if (weekEndingDate === getWeekEndingDate()) {
    return getWeeklyIjtemaCurrentAttendanceView(karkunId)
  }

  const legacy = getIjtemaAttendanceForKarkun(karkunId, weekEndingDate)
  const view: WeeklyIjtemaCurrentAttendanceView = {
    karkunId,
    status: legacy.status,
    weekEndingDate: legacy.weekEndingDate,
    weekLabel: legacy.weekLabel,
    remarks: legacy.remarks,
    source: 'legacy',
  }
  logWeeklyIjtemaRead('week', view.source, { karkunId, weekEndingDate })
  return view
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
