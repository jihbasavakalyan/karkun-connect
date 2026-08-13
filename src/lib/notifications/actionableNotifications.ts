/**
 * Phase 6 — Actionable notifications (TASK-050–052).
 * Authority: docs/architecture/kc-phase6-notifications-arch009-gate.md
 *
 * Derived read model from Calendar (Occurrence) + Work.
 * Does NOT persist a notification collection.
 * Does NOT create Occurrences.
 * Does NOT invent a scheduler.
 * Does NOT create Rukn/Karkun Inbox or dump into Admin Inbox.
 * Deep-links to existing action surfaces only.
 */

import { ROUTES } from '@/constants/routes'
import {
  buildOccurrenceCalendar,
  type OccurrenceCalendarEntry,
} from '@/lib/occurrence/calendar'
import { isWorkOverdue, todayWorkCalendarDate } from '@/lib/work/ruknActionItems'
import { unwrapRepository } from '@/repositories/errors'
import { getRepositories } from '@/repositories/provider'
import type { LocalProgramme, ProgrammeKind } from '@/types/localProgramme.types'
import type { Occurrence } from '@/types/occurrence.types'
import type {
  NotificationPreferences,
  NotificationChannelPrefs,
} from '@/types/userPreferences.types'
import type { Work } from '@/types/work.types'

export type ActionableNotificationAudience = 'administrator' | 'rukn'

export type ActionableNotificationKind =
  | 'upcoming_occurrence'
  | 'attendance_requirement'
  | 'pending_work'
  | 'overdue_work'

export type ActionableNotification = {
  id: string
  kind: ActionableNotificationKind
  title: string
  body: string
  actionLabel: string
  actionHref: string
  audience: ActionableNotificationAudience
  preferenceKey: keyof NotificationPreferences
  sourceKind: 'occurrence' | 'work'
  sourceId: string
  occurrenceId?: string
  workId?: string
  ruknId?: string
}

export type ProgrammeNotificationLookup = Pick<LocalProgramme, 'id' | 'kind' | 'name'>

const KIND_ORDER: Record<ActionableNotificationKind, number> = {
  overdue_work: 0,
  attendance_requirement: 1,
  pending_work: 2,
  upcoming_occurrence: 3,
}

function addDaysToDateKey(dateKey: string, days: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

function programmeById(
  programmes: readonly ProgrammeNotificationLookup[],
): Map<string, ProgrammeNotificationLookup> {
  return new Map(programmes.map((row) => [row.id, row]))
}

export function isInAppNotificationEnabled(
  preferences: NotificationPreferences,
  key: keyof NotificationPreferences,
): boolean {
  const channel: NotificationChannelPrefs | undefined = preferences[key]
  return channel?.inApp === true
}

export function preferenceKeyForOccurrenceKind(
  kind: ProgrammeKind | undefined,
  category: 'upcoming_occurrence' | 'attendance_requirement',
): keyof NotificationPreferences {
  if (category === 'attendance_requirement') return 'ijtemaReminders'
  if (kind === 'weekly_ijtema') return 'ijtemaReminders'
  if (kind === 'follow_up') return 'followUpReminders'
  return 'meetingReminders'
}

export function occurrenceActionHref(
  audience: ActionableNotificationAudience,
  kind: ProgrammeKind | undefined,
): string {
  if (kind === 'weekly_ijtema') {
    return audience === 'administrator' ? ROUTES.ADMIN_WEEKLY_IJTEMA : ROUTES.RUKN_WEEKLY_IJTEMA
  }
  if (kind === 'monthly_baitul_maal') {
    return audience === 'administrator'
      ? ROUTES.ADMIN_MONTHLY_BAITUL_MAAL
      : ROUTES.RUKN_MONTHLY_BAITUL_MAAL
  }
  if (kind === 'follow_up') {
    return audience === 'administrator' ? ROUTES.ADMIN_FOLLOW_UP : ROUTES.RUKN
  }
  return audience === 'administrator' ? ROUTES.ADMIN_PLANNING : ROUTES.RUKN
}

function workActionHref(audience: ActionableNotificationAudience): string {
  return audience === 'administrator' ? ROUTES.ADMIN_PLANNING : ROUTES.RUKN
}

function occurrenceCopy(
  category: 'upcoming_occurrence' | 'attendance_requirement',
  entry: OccurrenceCalendarEntry,
  programme: ProgrammeNotificationLookup | undefined,
): { title: string; body: string; actionLabel: string } {
  const name = programme?.name?.trim() || entry.title?.trim() || 'Programme'
  if (category === 'attendance_requirement') {
    return {
      title: `${name} is open today`,
      body: 'Record attendance on the existing Ijtema surface.',
      actionLabel: 'Open attendance',
    }
  }
  return {
    title: `${name} is tomorrow`,
    body: `Scheduled ${entry.occurrenceDate}. Open the existing action surface.`,
    actionLabel: 'Open schedule',
  }
}

/**
 * TASK-052 — Calendar projection is the evaluation input.
 * Occurrence remains the durable scheduling anchor; calendar does not persist events.
 */
export function evaluateActionableNotificationsFromCalendar(options: {
  audience: ActionableNotificationAudience
  ruknId?: string
  asOfDate: string
  calendar: readonly OccurrenceCalendarEntry[]
  programmes: readonly ProgrammeNotificationLookup[]
  work: readonly Work[]
  preferences: NotificationPreferences
}): ActionableNotification[] {
  const asOf = options.asOfDate.trim()
  const tomorrow = addDaysToDateKey(asOf, 1)
  if (!tomorrow) return []

  const programmes = programmeById(options.programmes)
  const items: ActionableNotification[] = []

  for (const entry of options.calendar) {
    if (entry.status === 'archived') continue
    const programme = programmes.get(entry.programmeId)
    const kind = programme?.kind

    if (entry.occurrenceDate === tomorrow && entry.status === 'scheduled') {
      const preferenceKey = preferenceKeyForOccurrenceKind(kind, 'upcoming_occurrence')
      if (!isInAppNotificationEnabled(options.preferences, preferenceKey)) continue
      const copy = occurrenceCopy('upcoming_occurrence', entry, programme)
      items.push({
        id: `an:upcoming_occurrence:${entry.occurrenceId}`,
        kind: 'upcoming_occurrence',
        ...copy,
        actionHref: occurrenceActionHref(options.audience, kind),
        audience: options.audience,
        preferenceKey,
        sourceKind: 'occurrence',
        sourceId: entry.occurrenceId,
        occurrenceId: entry.occurrenceId,
      })
    }

    if (entry.occurrenceDate === asOf && entry.status === 'open') {
      const preferenceKey = preferenceKeyForOccurrenceKind(kind, 'attendance_requirement')
      if (!isInAppNotificationEnabled(options.preferences, preferenceKey)) continue
      const copy = occurrenceCopy('attendance_requirement', entry, programme)
      items.push({
        id: `an:attendance_requirement:${entry.occurrenceId}`,
        kind: 'attendance_requirement',
        ...copy,
        actionHref: occurrenceActionHref(options.audience, kind),
        audience: options.audience,
        preferenceKey,
        sourceKind: 'occurrence',
        sourceId: entry.occurrenceId,
        occurrenceId: entry.occurrenceId,
      })
    }
  }

  const ruknId = options.ruknId?.trim()
  for (const work of options.work) {
    if (work.status === 'done') continue
    if (options.audience === 'rukn' && ruknId && work.ruknId !== ruknId) continue
    const due = work.dueDate?.trim()
    if (!due) continue

    const overdue = isWorkOverdue(due, asOf)
    const dueToday = due === asOf
    if (!overdue && !dueToday) continue

    const kind: ActionableNotificationKind = overdue ? 'overdue_work' : 'pending_work'
    if (!isInAppNotificationEnabled(options.preferences, 'workReminders')) continue

    items.push({
      id: `an:${kind}:${work.id}`,
      kind,
      title: overdue ? `Overdue work: ${work.title}` : `Work due today: ${work.title}`,
      body: overdue
        ? `Due ${due}. Open the existing Work surface.`
        : 'Open the existing Work surface to act.',
      actionLabel: options.audience === 'administrator' ? 'Review work' : 'Open work',
      actionHref: workActionHref(options.audience),
      audience: options.audience,
      preferenceKey: 'workReminders',
      sourceKind: 'work',
      sourceId: work.id,
      workId: work.id,
      ruknId: work.ruknId,
    })
  }

  return items
    .sort((a, b) => {
      const order = KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
      if (order !== 0) return order
      return a.id.localeCompare(b.id)
    })
    .slice(0, 12)
}

/**
 * TASK-050 / TASK-052 — derive calendar from Occurrence, then evaluate.
 * Does not create Occurrences. Window is asOfDate → tomorrow (inclusive).
 */
export function evaluateActionableNotifications(options: {
  audience: ActionableNotificationAudience
  ruknId?: string
  asOfDate: string
  occurrences: readonly Occurrence[]
  programmes: readonly ProgrammeNotificationLookup[]
  work: readonly Work[]
  preferences: NotificationPreferences
}): ActionableNotification[] {
  const asOf = options.asOfDate.trim()
  const tomorrow = addDaysToDateKey(asOf, 1)
  if (!tomorrow) return []

  const names = new Map(options.programmes.map((row) => [row.id, row.name]))
  const calendar = buildOccurrenceCalendar(
    options.occurrences,
    {
      fromDate: asOf,
      toDate: tomorrow,
      statuses: ['scheduled', 'open'],
    },
    names,
  )

  return evaluateActionableNotificationsFromCalendar({
    audience: options.audience,
    ruknId: options.ruknId,
    asOfDate: asOf,
    calendar,
    programmes: options.programmes,
    work: options.work,
    preferences: options.preferences,
  })
}

/** UI helper — reads existing Occurrence / Programme / Work repositories. */
export function loadActionableNotificationsForUser(options: {
  audience: ActionableNotificationAudience
  ruknId?: string
  asOfDate?: string
  preferences: NotificationPreferences
}): ActionableNotification[] {
  const repos = getRepositories()
  const occurrences = unwrapRepository(repos.occurrence.loadAll(), [])
  const programmes = unwrapRepository(repos.localProgramme.loadAll(), [])
  const work =
    options.audience === 'rukn' && options.ruknId?.trim()
      ? unwrapRepository(repos.work.listByRuknId(options.ruknId), [])
      : unwrapRepository(repos.work.loadAll(), [])
  return evaluateActionableNotifications({
    audience: options.audience,
    ruknId: options.ruknId,
    asOfDate: options.asOfDate ?? todayWorkCalendarDate(),
    occurrences,
    programmes,
    work,
    preferences: options.preferences,
  })
}

export { todayWorkCalendarDate }
