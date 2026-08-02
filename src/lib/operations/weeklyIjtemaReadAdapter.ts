/**
 * KC-0110 / KC-037C2A / KC-037C2D — Weekly Ijtema read adapter.
 *
 * Two presentation concerns (do not mix):
 * - Attendance / Reminder: event/cycle submissions (`weeklyIjtema*`) — recurring weekly.
 * - Commitment: legacy `ijtema_*` campaign remarks — one-time Matrix objective.
 *
 * Dev diagnostics: set localStorage `kc.debug.weeklyIjtemaReads=1` (DEV only).
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
import { getCurrentWeeklyIjtemaEvent, listOpenWeeklyIjtemaEvents } from '@/services/weeklyIjtemaService'
import {
  getAllWeeklyIjtemaEvents,
  getWeeklyIjtemaSubmissionsForEvent,
} from '@/stores/weeklyIjtemaStore'
import type { WeeklyIjtemaEvent, WeeklyIjtemaMarkStatus } from '@/types/weeklyIjtema'

/** KC-037C2D — Weekly Ijtema Commitment (one-time Matrix objective). */
export type WeeklyIjtemaCommitmentState =
  | 'not_discussed'
  | 'discussed'
  | 'committed'
  | 'deferred'
  | 'not_interested'

/** Canonical commitment remarks on legacy `ijtema_*` docs. */
export const IJTEMA_CAMPAIGN_COMMITTED = 'Campaign: Committed'
export const IJTEMA_CAMPAIGN_DISCUSSED = 'Campaign: Discussed'
export const IJTEMA_CAMPAIGN_NOT_INTERESTED = 'Campaign: Not Interested'
export const IJTEMA_CAMPAIGN_DEFERRED = 'Campaign: Deferred'
export const IJTEMA_CAMPAIGN_NOT_DISCUSSED = 'Campaign: Not Discussed'

/** Legacy invitation remarks — still read as Commitment for backward compat. */
export const IJTEMA_CAMPAIGN_INVITED = 'Campaign: Invited'
export const IJTEMA_CAMPAIGN_NOT_INVITED = 'Campaign: Not Invited'
export const IJTEMA_CAMPAIGN_EXCUSED = 'Campaign: Excused'

export function isIjtemaCampaignCommitmentRemarks(remarks?: string): boolean {
  const value = (remarks ?? '').trim().toLowerCase()
  if (!value) return false
  return (
    value.includes('campaign: committed') ||
    value.includes('campaign: discussed') ||
    value.includes('campaign: not discussed') ||
    value.includes('campaign: not interested') ||
    value.includes('campaign: deferred') ||
    value.includes('campaign: invited') ||
    value.includes('campaign: not invited') ||
    value.includes('campaign: excused')
  )
}

/** @deprecated Prefer isIjtemaCampaignCommitmentRemarks (KC-037C2D). */
export function isIjtemaCampaignInvitationRemarks(remarks?: string): boolean {
  return isIjtemaCampaignCommitmentRemarks(remarks)
}

export function commitmentStateFromRemarks(
  remarks?: string,
): WeeklyIjtemaCommitmentState | null {
  const value = (remarks ?? '').trim().toLowerCase()
  if (!value) return null
  // Longer / more specific phrases first.
  if (value.includes('campaign: not interested') || value.includes('campaign: not invited')) {
    return 'not_interested'
  }
  if (value.includes('campaign: not discussed')) return 'not_discussed'
  if (value.includes('campaign: deferred') || value.includes('campaign: excused')) {
    return 'deferred'
  }
  if (value.includes('campaign: discussed')) return 'discussed'
  if (value.includes('campaign: committed') || value.includes('campaign: invited')) {
    return 'committed'
  }
  return null
}

function statusFromCampaignRemarks(
  remarks?: string,
): IjtemaAttendanceStatus | null {
  const state = commitmentStateFromRemarks(remarks)
  if (!state || state === 'not_discussed') return null
  return commitmentStateToStoredStatus(state)
}

export function campaignRemarksForCommitment(
  state: WeeklyIjtemaCommitmentState,
): string {
  switch (state) {
    case 'committed':
      return IJTEMA_CAMPAIGN_COMMITTED
    case 'discussed':
      return IJTEMA_CAMPAIGN_DISCUSSED
    case 'deferred':
      return IJTEMA_CAMPAIGN_DEFERRED
    case 'not_interested':
      return IJTEMA_CAMPAIGN_NOT_INTERESTED
    case 'not_discussed':
      return IJTEMA_CAMPAIGN_NOT_DISCUSSED
  }
}

export function commitmentStateToStoredStatus(
  state: WeeklyIjtemaCommitmentState,
): IjtemaAttendanceStatus {
  switch (state) {
    case 'committed':
    case 'discussed':
      return 'Present'
    case 'not_interested':
    case 'not_discussed':
      return 'Absent'
    case 'deferred':
      return 'Excused'
  }
}

export function invitationStatusToCommitmentState(
  status: IjtemaAttendanceStatus | 'Not recorded' | 'Pending',
  remarks?: string,
): WeeklyIjtemaCommitmentState {
  const fromRemarks = commitmentStateFromRemarks(remarks)
  if (fromRemarks) return fromRemarks
  if (status === 'Present') return 'committed'
  if (status === 'Absent') return 'not_interested'
  if (status === 'Excused') return 'deferred'
  return 'not_discussed'
}

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

/** KC-037C2A / C2D — one-time campaign commitment (Matrix / Journey). */
export type WeeklyIjtemaInvitationView = {
  karkunId: string
  status: IjtemaAttendanceStatus | 'Not recorded'
  commitment: WeeklyIjtemaCommitmentState
  weekEndingDate: string
  weekLabel: string
  remarks?: string
  source: 'legacy'
}

type CanonicalMark = {
  /** Absent when Reminded-only (attendance Pending). */
  status?: WeeklyIjtemaMarkStatus
  reminded?: boolean
  ruknId: string
  updatedAt: string
  /** Submission operator (Rukn / Admin) — presentation audit only. */
  updatedBy?: string
  submittedAt?: string
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
        reminded: mark.reminded,
        ruknId: submission.ruknId,
        updatedAt: submission.updatedAt,
        updatedBy: submission.updatedBy || submission.submittedBy,
        submittedAt: submission.submittedAt,
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
        reminded: mark.reminded,
        ruknId: submission.ruknId,
        updatedAt: submission.updatedAt,
        updatedBy: submission.updatedBy || submission.submittedBy,
        submittedAt: submission.submittedAt,
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
    status: mark.status ?? 'Not recorded',
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

function preferCanonicalMark(
  current: CanonicalMark | undefined,
  next: CanonicalMark,
): CanonicalMark {
  if (!current) return next
  const currentRank = current.status === 'Present' || current.status === 'Absent' ? 2 : current.reminded ? 1 : 0
  const nextRank = next.status === 'Present' || next.status === 'Absent' ? 2 : next.reminded ? 1 : 0
  return nextRank >= currentRank ? next : current
}

/** KC-037C2E — Merge submission marks across Open events (Male + Female). */
function buildOpenEventsMarkIndex(
  events: WeeklyIjtemaEvent[],
): {
  markIndex: Map<string, CanonicalMark>
  eventByKarkun: Map<string, WeeklyIjtemaEvent>
  primaryEvent: WeeklyIjtemaEvent | undefined
} {
  const markIndex = new Map<string, CanonicalMark>()
  const eventByKarkun = new Map<string, WeeklyIjtemaEvent>()
  const ordered = [...events].sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))
  for (const event of ordered) {
    for (const [karkunId, mark] of buildCanonicalMarkIndex(event)) {
      const preferred = preferCanonicalMark(markIndex.get(karkunId), mark)
      if (preferred === mark || !markIndex.has(karkunId)) {
        markIndex.set(karkunId, preferred)
        eventByKarkun.set(karkunId, event)
      }
    }
  }
  return { markIndex, eventByKarkun, primaryEvent: ordered[0] }
}

function emptyCanonicalAttendance(
  karkunId: string,
  event: WeeklyIjtemaEvent,
): WeeklyIjtemaCurrentAttendanceView {
  return {
    karkunId,
    status: 'Not recorded',
    weekEndingDate: event.meetingDate,
    weekLabel: formatCycleDateLabel(event.meetingDate),
    source: 'canonical',
    eventId: event.id,
    meetingDate: event.meetingDate,
  }
}

/**
 * Current Weekly Ijtema attendance for presentation (recurring event track).
 * Prefers canonical event marks. Does not treat campaign invitation legacy
 * records as attendance (KC-037C2A).
 * KC-037C2E — scans all Open events so gender-scoped writes are visible.
 */
export function getWeeklyIjtemaCurrentAttendanceView(
  karkunId: string,
): WeeklyIjtemaCurrentAttendanceView {
  const openEvents = listOpenWeeklyIjtemaEvents()
  if (openEvents.length > 0) {
    for (const event of openEvents) {
      const mark = findCanonicalMark(event, karkunId)
      if (mark) {
        const view = viewFromCanonicalMark(karkunId, event, mark)
        logWeeklyIjtemaRead('current', view.source, { karkunId, eventId: event.id })
        return view
      }
    }
    const primary = openEvents[0]
    const empty = emptyCanonicalAttendance(karkunId, primary)
    logWeeklyIjtemaRead('current', 'canonical', {
      karkunId,
      eventId: primary.id,
      unmarked: true,
      openEvents: openEvents.length,
    })
    return empty
  }

  const event = getCurrentWeeklyIjtemaEvent()
  if (event) {
    const mark = findCanonicalMark(event, karkunId)
    if (mark) {
      const view = viewFromCanonicalMark(karkunId, event, mark)
      logWeeklyIjtemaRead('current', view.source, { karkunId, eventId: event.id })
      return view
    }
    const empty = emptyCanonicalAttendance(karkunId, event)
    logWeeklyIjtemaRead('current', 'canonical', { karkunId, eventId: event.id, unmarked: true })
    return empty
  }

  const legacy = getCurrentIjtemaAttendance(karkunId)
  if (isIjtemaCampaignInvitationRemarks(legacy.remarks)) {
    const empty: WeeklyIjtemaCurrentAttendanceView = {
      karkunId,
      status: 'Not recorded',
      weekEndingDate: legacy.weekEndingDate,
      weekLabel: legacy.weekLabel,
      source: 'legacy',
    }
    logWeeklyIjtemaRead('current', 'legacy', { karkunId, skippedInvitation: true })
    return empty
  }

  const view = viewFromLegacyCurrent(karkunId)
  logWeeklyIjtemaRead('current', view.source, { karkunId })
  return view
}

/**
 * KC-037C2A / C2D — Weekly Ijtema Commitment (campaign objective).
 * Legacy-only, campaign-stable: commitment survives week rollover and is
 * never derived from event attendance submissions.
 */
export function getWeeklyIjtemaInvitationView(
  karkunId: string,
): WeeklyIjtemaInvitationView {
  const weekEndingDate = getWeekEndingDate()
  const history = getIjtemaAttendanceHistory(karkunId, 104)

  let campaignBest: IjtemaAttendanceRecord | null = null
  for (const record of history) {
    if (!isIjtemaCampaignCommitmentRemarks(record.remarks)) continue
    if (!campaignBest || record.updatedAt.localeCompare(campaignBest.updatedAt) > 0) {
      campaignBest = record
    }
  }
  if (campaignBest) {
    const commitment = invitationStatusToCommitmentState(
      campaignBest.status,
      campaignBest.remarks,
    )
    const fromRemarks = statusFromCampaignRemarks(campaignBest.remarks)
    const status = fromRemarks ?? campaignBest.status
    const view: WeeklyIjtemaInvitationView = {
      karkunId,
      status,
      commitment,
      weekEndingDate: campaignBest.weekEndingDate,
      weekLabel: formatWeekLabel(campaignBest.weekEndingDate),
      remarks: campaignBest.remarks,
      source: 'legacy',
    }
    logWeeklyIjtemaRead('invitation', 'legacy', { karkunId, via: 'campaign-remarks', commitment })
    return view
  }

  // Backward compatibility: prior Matrix dual-writes left Present on legacy.
  const stickyPresent = history.find((record) => record.status === 'Present')
  if (stickyPresent) {
    const view: WeeklyIjtemaInvitationView = {
      karkunId,
      status: 'Present',
      commitment: 'committed',
      weekEndingDate: stickyPresent.weekEndingDate,
      weekLabel: formatWeekLabel(stickyPresent.weekEndingDate),
      remarks: stickyPresent.remarks,
      source: 'legacy',
    }
    logWeeklyIjtemaRead('invitation', 'legacy', { karkunId, via: 'legacy-present' })
    return view
  }

  const current = getCurrentIjtemaAttendance(karkunId)
  if (current.status === 'Absent' || current.status === 'Excused') {
    const commitment = invitationStatusToCommitmentState(current.status, current.remarks)
    const view: WeeklyIjtemaInvitationView = {
      karkunId,
      status: current.status,
      commitment,
      weekEndingDate: current.weekEndingDate,
      weekLabel: current.weekLabel,
      remarks: current.remarks,
      source: 'legacy',
    }
    logWeeklyIjtemaRead('invitation', 'legacy', { karkunId, via: 'current-week' })
    return view
  }

  const empty: WeeklyIjtemaInvitationView = {
    karkunId,
    status: 'Not recorded',
    commitment: 'not_discussed',
    weekEndingDate,
    weekLabel: formatWeekLabel(weekEndingDate),
    source: 'legacy',
  }
  logWeeklyIjtemaRead('invitation', 'legacy', { karkunId, via: 'empty' })
  return empty
}

/** KC-037C2D — Commitment view (Matrix). */
export function getWeeklyIjtemaCommitmentView(karkunId: string): WeeklyIjtemaInvitationView {
  return getWeeklyIjtemaInvitationView(karkunId)
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
    if (!mark?.status) continue
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
 * KC-0110.3 / KC-037C2E — Compliance list rows: one summary per active Karkun.
 * Builds a mark index across all Open events (Male + Female). When any Open
 * event exists, missing marks are Not recorded — never legacy ijtema_*.
 */
export function getWeeklyIjtemaAttendanceSummariesView(): IjtemaAttendanceKarkunSummary[] {
  const openEvents = listOpenWeeklyIjtemaEvents()
  const closedFallback =
    openEvents.length === 0 ? getCurrentWeeklyIjtemaEvent() : undefined
  const events = openEvents.length > 0 ? openEvents : closedFallback ? [closedFallback] : []
  const { markIndex, eventByKarkun, primaryEvent } = buildOpenEventsMarkIndex(events)
  const preferCanonicalOnly = openEvents.length > 0
  let canonicalCount = 0
  let legacyCount = 0
  let unmarkedCanonical = 0

  const summaries = getAllKarkuns().map((karkun) => {
    let attendance: WeeklyIjtemaCurrentAttendanceView
    const mark = markIndex.get(karkun.id)
    const markEvent = eventByKarkun.get(karkun.id) ?? primaryEvent
    if (markEvent && mark) {
      attendance = viewFromCanonicalMark(karkun.id, markEvent, mark)
      canonicalCount += 1
    } else if (preferCanonicalOnly && primaryEvent) {
      attendance = emptyCanonicalAttendance(karkun.id, primaryEvent)
      unmarkedCanonical += 1
    } else if (markEvent && !mark) {
      attendance = emptyCanonicalAttendance(karkun.id, markEvent)
      unmarkedCanonical += 1
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
      updatedAt: mark?.updatedAt ?? mark?.submittedAt,
      updatedBy: mark?.updatedBy,
      ruknId: mark?.ruknId,
    }
  })

  if (isWeeklyIjtemaReadDebugEnabled()) {
    console.debug('[KC-0110.5] Weekly Ijtema summaries:', {
      openEvents: openEvents.map((event) => event.id),
      primaryEventId: primaryEvent?.id ?? null,
      canonical: canonicalCount,
      unmarkedCanonical,
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
 * KC-0110.4 / KC-037C2E — Attendance for a specific week ending date (People filters).
 * Prefers canonical events whose meetingDate matches (all audiences); for the
 * current week ending, reuses the current-attendance view; else legacy week record.
 */
export function getWeeklyIjtemaAttendanceForWeekView(
  karkunId: string,
  weekEndingDate: string,
): WeeklyIjtemaCurrentAttendanceView {
  const eventsByDate = getAllWeeklyIjtemaEvents().filter(
    (event) => event.meetingDate === weekEndingDate,
  )
  for (const eventByDate of eventsByDate) {
    const mark = findCanonicalMark(eventByDate, karkunId)
    if (mark) {
      const view = viewFromCanonicalMark(karkunId, eventByDate, mark)
      logWeeklyIjtemaRead('week', view.source, {
        karkunId,
        weekEndingDate,
        eventId: eventByDate.id,
      })
      return view
    }
  }
  if (eventsByDate.length > 0) {
    const empty = emptyCanonicalAttendance(karkunId, eventsByDate[0])
    logWeeklyIjtemaRead('week', 'canonical', {
      karkunId,
      weekEndingDate,
      eventId: eventsByDate[0].id,
      unmarked: true,
    })
    return empty
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
