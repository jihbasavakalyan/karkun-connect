/**
 * Phase 3 — Occurrence → notification integration (TASK-026).
 * Authority: docs/architecture/kc-post-campaign-phase0-system-mapping.md §3.6
 *
 * Consumes Occurrence / programme state. Does NOT create Occurrences.
 * Does NOT invent a scheduler. Does NOT create Rukn/Karkun Inbox.
 * Reuses existing AutomationTrigger + notificationService rule registry.
 *
 * Deferred (Phase 6 / Work Phase 4): durable in-app inbox, push/WhatsApp dispatch,
 * pending_work / overdue_work / report_requirement (require Work entity).
 */

import type { AutomationTrigger } from '@/types/communication'
import type { LocalProgramme, ProgrammeKind } from '@/types/localProgramme.types'
import type { Occurrence } from '@/types/occurrence.types'
import { getRulesForTrigger } from '@/services/notificationService'

/** Categories justified by frozen architecture for Occurrence-related notices. */
export type OccurrenceNotificationCategory =
  | 'upcoming_occurrence'
  | 'attendance_requirement'
  | 'pending_work'
  | 'overdue_work'
  | 'report_requirement'

export type OccurrenceNotificationCandidate = {
  category: OccurrenceNotificationCategory
  /** Existing automation trigger when a mapping exists; null when deferred. */
  automationTrigger: AutomationTrigger | null
  occurrenceId: string
  programmeId: string
  occurrenceDate: string
  generationKey: string
  /** Why this candidate was produced (observable, not speculative). */
  reason: string
  deferred?: boolean
}

export type EvaluateOccurrenceNotificationsResult = {
  candidates: OccurrenceNotificationCandidate[]
  /** Rules matched via existing notificationService (touched, not dispatched). */
  matchedRuleIds: string[]
  deferredCategories: OccurrenceNotificationCategory[]
}

function addDaysToDateKey(dateKey: string, days: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

function programmeKindById(
  programmes: readonly Pick<LocalProgramme, 'id' | 'kind'>[],
): Map<string, ProgrammeKind> {
  return new Map(programmes.map((row) => [row.id, row.kind]))
}

/**
 * Map Occurrence + programme kind onto an existing AutomationTrigger when justified.
 * Returns null when no frozen mapping exists (do not invent new triggers here).
 */
export function mapOccurrenceToAutomationTrigger(
  category: OccurrenceNotificationCategory,
  programmeKind: ProgrammeKind | undefined,
): AutomationTrigger | null {
  switch (category) {
    case 'upcoming_occurrence':
      if (programmeKind === 'weekly_ijtema') return 'ijtema-tomorrow'
      if (programmeKind === 'follow_up') return 'follow-up-tomorrow'
      if (programmeKind === 'monthly_baitul_maal') return 'baitul-maal-due'
      return null
    case 'attendance_requirement':
      if (programmeKind === 'weekly_ijtema') return 'ijtema-window-open'
      return null
    case 'pending_work':
    case 'overdue_work':
    case 'report_requirement':
      return null
    default:
      return null
  }
}

/**
 * Evaluate Occurrence-driven notification candidates as of a civil date.
 * Upcoming = occurrenceDate is tomorrow relative to asOfDate.
 * Attendance = open Occurrence on asOfDate (window-open style).
 * Work / report categories remain deferred until Work SoT exists.
 */
export function evaluateOccurrenceNotificationCandidates(options: {
  occurrences: readonly Occurrence[]
  programmes: readonly Pick<LocalProgramme, 'id' | 'kind'>[]
  asOfDate: string
}): OccurrenceNotificationCandidate[] {
  const asOf = options.asOfDate.trim()
  const tomorrow = addDaysToDateKey(asOf, 1)
  if (!tomorrow) return []

  const kinds = programmeKindById(options.programmes)
  const candidates: OccurrenceNotificationCandidate[] = []

  for (const row of options.occurrences) {
    if (row.status === 'archived') continue
    const kind = kinds.get(row.programmeId)

    if (row.occurrenceDate === tomorrow && row.status === 'scheduled') {
      const category = 'upcoming_occurrence' as const
      candidates.push({
        category,
        automationTrigger: mapOccurrenceToAutomationTrigger(category, kind),
        occurrenceId: row.id,
        programmeId: row.programmeId,
        occurrenceDate: row.occurrenceDate,
        generationKey: row.generationKey,
        reason: 'occurrenceDate is tomorrow relative to asOfDate',
      })
    }

    if (row.occurrenceDate === asOf && row.status === 'open') {
      const category = 'attendance_requirement' as const
      candidates.push({
        category,
        automationTrigger: mapOccurrenceToAutomationTrigger(category, kind),
        occurrenceId: row.id,
        programmeId: row.programmeId,
        occurrenceDate: row.occurrenceDate,
        generationKey: row.generationKey,
        reason: 'open occurrence on asOfDate (attendance window style)',
      })
    }
  }

  return candidates
}

/**
 * Minimum integration hook: evaluate candidates and touch existing automation rules.
 * Does not create Occurrences, does not invent a scheduler, does not write Inbox.
 * Channel dispatch remains reserved (same posture as dispatchCampaignEvent).
 */
export function dispatchOccurrenceNotificationEvents(options: {
  occurrences: readonly Occurrence[]
  programmes: readonly Pick<LocalProgramme, 'id' | 'kind'>[]
  asOfDate: string
}): EvaluateOccurrenceNotificationsResult {
  const candidates = evaluateOccurrenceNotificationCandidates(options)
  const matchedRuleIds: string[] = []
  const deferredCategories = new Set<OccurrenceNotificationCategory>([
    'pending_work',
    'overdue_work',
    'report_requirement',
  ])

  for (const candidate of candidates) {
    if (!candidate.automationTrigger) {
      deferredCategories.add(candidate.category)
      candidate.deferred = true
      continue
    }
    const rules = getRulesForTrigger(candidate.automationTrigger)
    for (const rule of rules) {
      matchedRuleIds.push(rule.id)
    }
  }

  return {
    candidates,
    matchedRuleIds: [...new Set(matchedRuleIds)],
    deferredCategories: [...deferredCategories],
  }
}
