/**
 * Phase 3 — Automatic Occurrence generation (TASK-023).
 * Authority: docs/architecture/kc-phase3-occurrence-foundation-arch009-gate.md
 *
 * Horizon: Local Programme startDate → endDate inclusive.
 * Idempotency: durable generationKey via OccurrenceRepository.getByGenerationKey.
 * Callable domain operation — no scheduler invented here.
 *
 * Does NOT modify WI/BM SoTs or attendanceWindowEngine open/close behaviour.
 * Phase 5: optional activity catalog may set Occurrence.sourceRef to an existing
 * WI event or BM cycle. That is a wrap link only — it does not write WI/BM data.
 */

import type { AttendanceWindowScheduleConfig } from '@/lib/weeklyIjtema/attendanceWindowSchedule'
import {
  DEFAULT_OCCURRENCE_TIMEZONE,
  resolveProgrammeRecurrenceRules,
  type ResolvedRecurrenceRule,
  type ResolvedWeeklyRecurrenceRule,
} from '@/lib/occurrence/recurrence'
import {
  withResolvedActivitySourceRef,
  type ActivitySourceCatalog,
} from '@/lib/occurrence/activitySourceLink'
import type { OccurrenceRepository } from '@/repositories/interfaces/OccurrenceRepository'
import type { LocalProgramme } from '@/types/localProgramme.types'
import {
  buildOccurrenceGenerationKey,
  type Occurrence,
} from '@/types/occurrence.types'

export type { ActivitySourceCatalog }

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
const SYSTEM_ACTOR = 'system:occurrence-generation'

export type SkippedProgramme = {
  programmeId: string
  reason: string
}

export type GenerateOccurrencesResult = {
  created: Occurrence[]
  preserved: Occurrence[]
  skippedProgrammes: SkippedProgramme[]
  /** Programmes examined (including skipped) */
  examined: number
}

export type OccurrenceCandidate = {
  programmeId: string
  occurrenceDate: string
  generationKey: string
  title?: string
  openTime?: string
  closeTime?: string
  timezone: string
  audienceGender?: Occurrence['audienceGender']
}

function parseDateKey(value: string): { y: number; m: number; d: number } | null {
  if (!DATE_KEY.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null
  }
  return { y, m, d }
}

function formatDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function addDaysUtc(y: number, m: number, d: number, days: number): {
  y: number
  m: number
  d: number
} {
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
  }
}

/** Inclusive civil-date iteration (YYYY-MM-DD). */
export function eachDateKeyInclusive(startDate: string, endDate: string): string[] {
  const start = parseDateKey(startDate)
  const end = parseDateKey(endDate)
  if (!start || !end) return []
  if (startDate > endDate) return []

  const out: string[] = []
  let cur = start
  for (let i = 0; i < 3700; i += 1) {
    const key = formatDateKey(cur.y, cur.m, cur.d)
    out.push(key)
    if (key === endDate) break
    cur = addDaysUtc(cur.y, cur.m, cur.d, 1)
  }
  return out
}

function dayOfWeekForDateKey(dateKey: string): number {
  const parts = parseDateKey(dateKey)
  if (!parts) return -1
  return new Date(Date.UTC(parts.y, parts.m - 1, parts.d)).getUTCDay()
}

function dayOfMonthForDateKey(dateKey: string): number {
  const parts = parseDateKey(dateKey)
  return parts?.d ?? -1
}

/**
 * Stable document id derived from generationKey so overlapping saves upsert
 * the same row without inventing a second store or unique index.
 */
export function occurrenceIdForGenerationKey(generationKey: string): string {
  return `occurrence_${generationKey.replace(/[^A-Za-z0-9_-]/g, '_')}`
}

function programmeHorizon(
  programme: LocalProgramme,
): { startDate: string; endDate: string } | { reason: string } {
  if (!programme.startDate?.trim() || !programme.endDate?.trim()) {
    return {
      reason: 'missing startDate or endDate (horizon required; no today fallback)',
    }
  }
  const startDate = programme.startDate.trim()
  const endDate = programme.endDate.trim()
  if (!parseDateKey(startDate) || !parseDateKey(endDate)) {
    return { reason: 'invalid startDate or endDate (YYYY-MM-DD required)' }
  }
  if (startDate > endDate) {
    return { reason: 'startDate after endDate' }
  }
  return { startDate, endDate }
}

function isEligibleProgramme(programme: LocalProgramme): string | null {
  if (programme.status !== 'active') {
    return `ineligible status: ${programme.status}`
  }
  return null
}

function candidatesForWeeklyRule(
  programmeId: string,
  dates: string[],
  rule: ResolvedWeeklyRecurrenceRule,
): OccurrenceCandidate[] {
  return dates
    .filter((dateKey) => dayOfWeekForDateKey(dateKey) === rule.dayOfWeek)
    .map((occurrenceDate) => ({
      programmeId,
      occurrenceDate,
      generationKey: buildOccurrenceGenerationKey(
        programmeId,
        occurrenceDate,
        rule.audienceGender,
      ),
      title: rule.title,
      openTime: rule.openTime,
      closeTime: rule.closeTime,
      timezone: rule.timezone,
      audienceGender: rule.audienceGender,
    }))
}

/**
 * Expand resolved recurrence rules into candidates inside startDate–endDate.
 * `custom` is not date-generative — returns [] (caller records skip reason when empty).
 * `once` yields a single candidate on startDate (within horizon).
 */
export function expandOccurrenceCandidates(options: {
  programmeId: string
  startDate: string
  endDate: string
  rules: ResolvedRecurrenceRule[]
}): { candidates: OccurrenceCandidate[]; notes: string[] } {
  const { programmeId, startDate, endDate, rules } = options
  const dates = eachDateKeyInclusive(startDate, endDate)
  const candidates: OccurrenceCandidate[] = []
  const notes: string[] = []

  for (const rule of rules) {
    switch (rule.cadence) {
      case 'weekly': {
        candidates.push(...candidatesForWeeklyRule(programmeId, dates, rule))
        break
      }
      case 'monthly': {
        for (const occurrenceDate of dates) {
          if (dayOfMonthForDateKey(occurrenceDate) !== rule.dayOfMonth) continue
          candidates.push({
            programmeId,
            occurrenceDate,
            generationKey: buildOccurrenceGenerationKey(programmeId, occurrenceDate),
            timezone: rule.timezone,
          })
        }
        break
      }
      case 'once': {
        // Single occurrence on programme startDate (always within inclusive horizon).
        candidates.push({
          programmeId,
          occurrenceDate: startDate,
          generationKey: buildOccurrenceGenerationKey(programmeId, startDate),
          timezone: rule.timezone,
        })
        break
      }
      case 'custom': {
        notes.push(
          'custom recurrence is not date-generative (note-only; no candidates)',
        )
        break
      }
      case 'quarterly': {
        notes.push(
          'quarterly recurrence is schedule SoT only (not date-generative yet)',
        )
        break
      }
      case 'yearly': {
        notes.push(
          'yearly recurrence is schedule SoT only (not date-generative yet)',
        )
        break
      }
      default:
        break
    }
  }

  return { candidates, notes }
}

function candidateToOccurrence(
  candidate: OccurrenceCandidate,
  nowIso: string,
): Occurrence {
  return {
    id: occurrenceIdForGenerationKey(candidate.generationKey),
    programmeId: candidate.programmeId,
    occurrenceDate: candidate.occurrenceDate,
    status: 'scheduled',
    generationKey: candidate.generationKey,
    title: candidate.title,
    openTime: candidate.openTime,
    closeTime: candidate.closeTime,
    timezone: candidate.timezone || DEFAULT_OCCURRENCE_TIMEZONE,
    audienceGender: candidate.audienceGender,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: SYSTEM_ACTOR,
    updatedBy: SYSTEM_ACTOR,
  }
}

/**
 * Generate Occurrences for one Local Programme within startDate–endDate.
 * Existing rows matched by generationKey are preserved (not overwritten).
 */
export async function generateOccurrencesForProgramme(
  programme: LocalProgramme,
  occurrenceRepo: OccurrenceRepository,
  schedule?: AttendanceWindowScheduleConfig,
  activitySources?: ActivitySourceCatalog,
): Promise<GenerateOccurrencesResult> {
  const created: Occurrence[] = []
  const preserved: Occurrence[] = []
  const skippedProgrammes: SkippedProgramme[] = []

  const ineligible = isEligibleProgramme(programme)
  if (ineligible) {
    skippedProgrammes.push({ programmeId: programme.id, reason: ineligible })
    return { created, preserved, skippedProgrammes, examined: 1 }
  }

  const horizon = programmeHorizon(programme)
  if ('reason' in horizon) {
    skippedProgrammes.push({ programmeId: programme.id, reason: horizon.reason })
    return { created, preserved, skippedProgrammes, examined: 1 }
  }

  const rules = resolveProgrammeRecurrenceRules(programme, schedule)
  if (rules.length === 0) {
    skippedProgrammes.push({
      programmeId: programme.id,
      reason: 'no resolvable recurrence rules',
    })
    return { created, preserved, skippedProgrammes, examined: 1 }
  }

  const { candidates, notes } = expandOccurrenceCandidates({
    programmeId: programme.id,
    startDate: horizon.startDate,
    endDate: horizon.endDate,
    rules,
  })

  if (candidates.length === 0) {
    skippedProgrammes.push({
      programmeId: programme.id,
      reason: notes[0] ?? 'no occurrence candidates in horizon',
    })
    return { created, preserved, skippedProgrammes, examined: 1 }
  }

  const nowIso = new Date().toISOString()
  for (const candidate of candidates) {
    const existing = occurrenceRepo.getByGenerationKey(candidate.generationKey)
    if (existing.ok && existing.data) {
      const linked = withResolvedActivitySourceRef(
        existing.data,
        programme.kind,
        activitySources,
      )
      if (!existing.data.sourceRef && linked.sourceRef) {
        const saved = await occurrenceRepo.saveDurable({
          ...linked,
          updatedAt: nowIso,
          updatedBy: SYSTEM_ACTOR,
        })
        preserved.push(saved.ok ? saved.data : existing.data)
      } else {
        preserved.push(existing.data)
      }
      continue
    }

    const next = withResolvedActivitySourceRef(
      candidateToOccurrence(candidate, nowIso),
      programme.kind,
      activitySources,
    )
    const saved = await occurrenceRepo.saveDurable(next)
    if (saved.ok) {
      created.push(saved.data)
    }
  }

  return { created, preserved, skippedProgrammes, examined: 1 }
}

/**
 * Generate Occurrences for a programme list (empty list is safe).
 * No scheduler — callable domain operation only.
 */
export async function generateOccurrencesForProgrammes(
  programmes: readonly LocalProgramme[],
  occurrenceRepo: OccurrenceRepository,
  schedule?: AttendanceWindowScheduleConfig,
  activitySources?: ActivitySourceCatalog,
): Promise<GenerateOccurrencesResult> {
  const created: Occurrence[] = []
  const preserved: Occurrence[] = []
  const skippedProgrammes: SkippedProgramme[] = []

  for (const programme of programmes) {
    const partial = await generateOccurrencesForProgramme(
      programme,
      occurrenceRepo,
      schedule,
      activitySources,
    )
    created.push(...partial.created)
    preserved.push(...partial.preserved)
    skippedProgrammes.push(...partial.skippedProgrammes)
  }

  return {
    created,
    preserved,
    skippedProgrammes,
    examined: programmes.length,
  }
}
