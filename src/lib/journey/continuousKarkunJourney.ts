/**
 * Phase 7 — Continuous Karkun journey (TASK-056 + TASK-057–059).
 * Authority: docs/architecture/kc-phase7-journey-actions-arch009-gate.md
 *
 * Product journey (read model, not a database hierarchy):
 * Connection → Development → Participation → Responsibility → Leadership
 *
 * Derived from existing Connection, visit/orientation/JIH, participation,
 * Responsibility, Work, follow-up records, and occurrences.
 * Does NOT persist a journey entity. Does NOT replace the campaign 7-stage journey.
 * Does NOT create a development / follow-up / second Work / second Responsibility SoT.
 */

import { ROUTES, ruknVisitPath } from '@/constants/routes'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getConnectedKarkunCountForRukn, getConnectedKarkunsForRukn } from '@/lib/connections/getConnectedKarkunsForRukn'
import {
  hasManualDevelopmentDecision,
  hasOrientationSignal,
  hasParticipationSignal,
  hasVisitRecorded,
  isJihRegistered,
} from '@/lib/guidance/journeyEngine'
import { isResponsibilityInForce } from '@/lib/responsibility/tenure'
import { isWorkOverdue, todayWorkCalendarDate } from '@/lib/work/ruknActionItems'
import { unwrapRepository } from '@/repositories/errors'
import { getRepositories } from '@/repositories/provider'
import { getActiveFollowUpForKarkun } from '@/stores/followUpStore'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { LocalProgramme, ProgrammeKind } from '@/types/localProgramme.types'
import type { Occurrence, OccurrenceStatus } from '@/types/occurrence.types'
import type { Unit } from '@/types/planning.types'
import type { Responsibility } from '@/types/responsibility.types'
import type { Work } from '@/types/work.types'

export type ContinuousJourneyStageId =
  | 'connection'
  | 'development'
  | 'participation'
  | 'responsibility'
  | 'leadership'

export const CONTINUOUS_JOURNEY_STAGE_ORDER: readonly ContinuousJourneyStageId[] = [
  'connection',
  'development',
  'participation',
  'responsibility',
  'leadership',
]

export const CONTINUOUS_JOURNEY_STAGE_LABELS: Record<ContinuousJourneyStageId, string> = {
  connection: 'Connection',
  development: 'Development',
  participation: 'Participation',
  responsibility: 'Responsibility',
  leadership: 'Leadership',
}

export type ContinuousJourneyStep = {
  id: ContinuousJourneyStageId
  label: string
  complete: boolean
  current: boolean
}

export type ContinuousJourneySignals = {
  connection: boolean
  development: boolean
  participation: boolean
  responsibility: boolean
  leadership: boolean
}

export type JourneyActionKind =
  | 'visit'
  | 'jih-registration'
  | 'orientation'
  | 'development-record'
  | 'follow-up-record'
  | 'work'
  | 'occurrence'
  | 'participation'

export type JourneyLinkedAction = {
  id: string
  kind: JourneyActionKind
  title: string
  detail: string
  href: string
  actionLabel: string
}

export type JourneyResponsibilityVisibility = {
  id: string
  nature: string
  unitId: string
  unitName: string
  inForce: boolean
  startDate: string
  endDate?: string
  tenureLabel: string
  relatedWorkTitle: string | null
  href: string
}

export type ContinuousKarkunJourneySnapshot = {
  currentStage: ContinuousJourneyStageId
  stageLabel: string
  steps: ContinuousJourneyStep[]
  completedCount: number
  totalCount: number
  signals: ContinuousJourneySignals
  developmentAction: JourneyLinkedAction | null
  followUp: JourneyLinkedAction | null
  responsibilities: JourneyResponsibilityVisibility[]
}

export type ContinuousJourneyPendingFollowUp = {
  followUpId: string
  purpose: string
  followUpDate: string
}

export type ContinuousJourneyOccurrenceInput = Pick<
  Occurrence,
  'id' | 'programmeId' | 'occurrenceDate' | 'status' | 'title'
>

export type ContinuousJourneyProgrammeInput = Pick<LocalProgramme, 'id' | 'kind' | 'unitId' | 'name'>

export type ContinuousJourneySignalInput = {
  assignmentId?: string
  karkun: KarkunRegistryRecord
  asOfDate: string
  responsibilities: readonly Responsibility[]
  connectedKarkunCount: number
  pendingFollowUp?: ContinuousJourneyPendingFollowUp | null
  workRows?: readonly Work[]
  units?: readonly Pick<Unit, 'id' | 'name'>[]
  occurrences?: readonly ContinuousJourneyOccurrenceInput[]
  programmes?: readonly ContinuousJourneyProgrammeInput[]
}

export function hasContinuousDevelopmentSignal(
  karkun: KarkunRegistryRecord,
  assignmentId?: string,
): boolean {
  return (
    hasVisitRecorded(karkun, assignmentId) ||
    isJihRegistered(karkun) ||
    hasOrientationSignal(karkun) ||
    hasManualDevelopmentDecision(karkun.id)
  )
}

export function hasContinuousResponsibilitySignal(
  personId: string,
  responsibilities: readonly Responsibility[],
  asOfDate: string,
): boolean {
  return responsibilities.some(
    (row) => row.ruknId === personId && isResponsibilityInForce(row, asOfDate),
  )
}

export function snapshotFromContinuousSignals(
  signals: ContinuousJourneySignals,
): ContinuousKarkunJourneySnapshot {
  const completed: ContinuousJourneyStageId[] = []
  let currentStage: ContinuousJourneyStageId = 'connection'
  for (const stageId of CONTINUOUS_JOURNEY_STAGE_ORDER) {
    if (signals[stageId]) {
      completed.push(stageId)
      continue
    }
    currentStage = stageId
    break
  }
  if (completed.length === CONTINUOUS_JOURNEY_STAGE_ORDER.length) {
    currentStage = 'leadership'
  }

  const steps: ContinuousJourneyStep[] = CONTINUOUS_JOURNEY_STAGE_ORDER.map((stageId) => ({
    id: stageId,
    label: CONTINUOUS_JOURNEY_STAGE_LABELS[stageId],
    complete: completed.includes(stageId),
    current: stageId === currentStage,
  }))

  return {
    currentStage,
    stageLabel: CONTINUOUS_JOURNEY_STAGE_LABELS[currentStage],
    steps,
    completedCount: completed.length,
    totalCount: CONTINUOUS_JOURNEY_STAGE_ORDER.length,
    signals,
    developmentAction: null,
    followUp: null,
    responsibilities: [],
  }
}

function visitHref(karkunId: string): string {
  return ruknVisitPath(karkunId)
}

/**
 * TASK-057 — next development action from existing operational signals.
 * Connection must exist. Does not invent scores or a development database.
 */
export function resolveDevelopmentAction(
  karkun: KarkunRegistryRecord,
  assignmentId?: string,
): JourneyLinkedAction | null {
  if (!assignmentId?.trim()) return null
  const href = visitHref(karkun.id)
  if (!hasVisitRecorded(karkun, assignmentId)) {
    return {
      id: `development:visit:${karkun.id}`,
      kind: 'visit',
      title: 'Record visit',
      detail: 'Visit is the relevant development action now.',
      href,
      actionLabel: 'Open visit',
    }
  }
  if (!isJihRegistered(karkun)) {
    return {
      id: `development:jih:${karkun.id}`,
      kind: 'jih-registration',
      title: 'Help JIH App registration',
      detail: 'Guide registration using the existing visit surface.',
      href,
      actionLabel: 'Open visit',
    }
  }
  if (!hasOrientationSignal(karkun)) {
    return {
      id: `development:orientation:${karkun.id}`,
      kind: 'orientation',
      title: 'Arrange orientation',
      detail: 'Orientation is still open on existing visit / commitment records.',
      href,
      actionLabel: 'Open visit',
    }
  }
  if (!hasManualDevelopmentDecision(karkun.id)) {
    return {
      id: `development:record:${karkun.id}`,
      kind: 'development-record',
      title: 'Continue development',
      detail: 'Existing development record is still open.',
      href,
      actionLabel: 'Open visit',
    }
  }
  return null
}

function occurrenceHref(kind: ProgrammeKind | undefined): string {
  if (kind === 'weekly_ijtema') return ROUTES.RUKN_WEEKLY_IJTEMA
  if (kind === 'monthly_baitul_maal') return ROUTES.RUKN_MONTHLY_BAITUL_MAAL
  return ROUTES.RUKN
}

function isOpenOrUpcomingOccurrence(status: OccurrenceStatus, occurrenceDate: string, asOfDate: string): boolean {
  if (status === 'open' && occurrenceDate === asOfDate) return true
  if (status === 'scheduled' && occurrenceDate >= asOfDate) return true
  return false
}

function pickOpenWork(workRows: readonly Work[], asOfDate: string): Work | undefined {
  const open = workRows.filter((row) => row.status !== 'done')
  return [...open].sort((a, b) => {
    const aOverdue = isWorkOverdue(a.dueDate, asOfDate)
    const bOverdue = isWorkOverdue(b.dueDate, asOfDate)
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1
    const aDue = a.dueDate?.trim() ?? '9999-99-99'
    const bDue = b.dueDate?.trim() ?? '9999-99-99'
    if (aDue !== bDue) return aDue < bDue ? -1 : 1
    return a.title.localeCompare(b.title)
  })[0]
}

/**
 * TASK-058 — next follow-up from existing follow-up records, Work, occurrences,
 * participation, or the development action. Not a second Work/task system.
 */
export function resolveJourneyFollowUp(input: {
  karkun: KarkunRegistryRecord
  assignmentId?: string
  asOfDate: string
  pendingFollowUp?: ContinuousJourneyPendingFollowUp | null
  workRows: readonly Work[]
  occurrences: readonly ContinuousJourneyOccurrenceInput[]
  programmes: readonly ContinuousJourneyProgrammeInput[]
  responsibilityUnitIds: readonly string[]
  developmentAction: JourneyLinkedAction | null
  hasDevelopment: boolean
}): JourneyLinkedAction | null {
  const pending = input.pendingFollowUp
  if (pending) {
    return {
      id: `follow-up:${pending.followUpId}`,
      kind: 'follow-up-record',
      title: pending.purpose.trim() || 'Follow up',
      detail: `Scheduled for ${pending.followUpDate}`,
      href: visitHref(input.karkun.id),
      actionLabel: 'Open',
    }
  }

  const work = pickOpenWork(
    input.workRows.filter((row) => row.ruknId === input.karkun.id),
    input.asOfDate,
  )
  if (work) {
    const due = work.dueDate?.trim()
    return {
      id: `follow-up:work:${work.id}`,
      kind: 'work',
      title: work.title,
      detail: due
        ? isWorkOverdue(due, input.asOfDate)
          ? `Overdue work · ${due}`
          : `Open work · due ${due}`
        : 'Open work on the existing Work panel',
      href: ROUTES.RUKN,
      actionLabel: 'Open work',
    }
  }

  const programmeById = new Map(input.programmes.map((row) => [row.id, row]))
  const unitSet = new Set(input.responsibilityUnitIds.filter(Boolean))
  const occurrence = [...input.occurrences]
    .filter((row) => {
      if (!isOpenOrUpcomingOccurrence(row.status, row.occurrenceDate, input.asOfDate)) return false
      const programme = programmeById.get(row.programmeId)
      const unitId = programme?.unitId?.trim()
      return Boolean(unitId && unitSet.has(unitId))
    })
    .sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate))[0]
  if (occurrence) {
    const programme = programmeById.get(occurrence.programmeId)
    return {
      id: `follow-up:occurrence:${occurrence.id}`,
      kind: 'occurrence',
      title: occurrence.title?.trim() || programme?.name || 'Upcoming occurrence',
      detail: `${occurrence.status} · ${occurrence.occurrenceDate}`,
      href: occurrenceHref(programme?.kind),
      actionLabel: 'Open',
    }
  }

  if (input.hasDevelopment && !hasParticipationSignal(input.karkun)) {
    return {
      id: `follow-up:participation:${input.karkun.id}`,
      kind: 'participation',
      title: 'Invite to Ijtema',
      detail: 'Participation is the next continuation after development.',
      href: ROUTES.RUKN_WEEKLY_IJTEMA,
      actionLabel: 'Open Ijtema',
    }
  }

  if (input.developmentAction) {
    return {
      ...input.developmentAction,
      id: `follow-up:${input.developmentAction.id}`,
      kind: input.developmentAction.kind,
    }
  }

  return null
}

export function formatResponsibilityTenureLabel(row: Pick<Responsibility, 'startDate' | 'endDate'>): string {
  const start = row.startDate.trim()
  const end = row.endDate?.trim()
  return end ? `${start} – ${end}` : `Since ${start}`
}

/**
 * TASK-059 — Phase 4 Responsibility visibility. In-force matching unchanged.
 */
export function resolveJourneyResponsibilities(
  personId: string,
  responsibilities: readonly Responsibility[],
  units: readonly Pick<Unit, 'id' | 'name'>[],
  workRows: readonly Work[],
  asOfDate: string,
): JourneyResponsibilityVisibility[] {
  const unitName = new Map(units.map((row) => [row.id, row.name]))
  const rows = responsibilities.filter((row) => row.ruknId === personId && row.status !== 'archived')
  return rows
    .map((row) => {
      const related = pickOpenWork(
        workRows.filter((work) => work.responsibilityId === row.id),
        asOfDate,
      )
      return {
        id: row.id,
        nature: row.nature.trim() || 'Responsibility',
        unitId: row.unitId,
        unitName: unitName.get(row.unitId)?.trim() || row.unitId,
        inForce: isResponsibilityInForce(row, asOfDate),
        startDate: row.startDate,
        endDate: row.endDate,
        tenureLabel: formatResponsibilityTenureLabel(row),
        relatedWorkTitle: related?.title ?? null,
        href: ROUTES.RUKN,
      }
    })
    .sort((a, b) => {
      if (a.inForce !== b.inForce) return a.inForce ? -1 : 1
      return a.nature.localeCompare(b.nature)
    })
}

function dedupeFollowUp(
  followUp: JourneyLinkedAction | null,
  developmentAction: JourneyLinkedAction | null,
): JourneyLinkedAction | null {
  if (!followUp || !developmentAction) return followUp
  if (followUp.id === `follow-up:${developmentAction.id}` && followUp.href === developmentAction.href) {
    return null
  }
  return followUp
}

export function resolveContinuousKarkunJourney(
  input: ContinuousJourneySignalInput,
): ContinuousKarkunJourneySnapshot {
  const connection = Boolean(input.assignmentId?.trim())
  const development = connection && hasContinuousDevelopmentSignal(input.karkun, input.assignmentId)
  const participation = development && hasParticipationSignal(input.karkun)
  const responsibility =
    participation &&
    hasContinuousResponsibilitySignal(input.karkun.id, input.responsibilities, input.asOfDate)
  const leadership = responsibility && input.connectedKarkunCount > 0

  const snapshot = snapshotFromContinuousSignals({
    connection,
    development,
    participation,
    responsibility,
    leadership,
  })

  const workRows = input.workRows ?? []
  const units = input.units ?? []
  const developmentAction = resolveDevelopmentAction(input.karkun, input.assignmentId)
  const inForceUnitIds = input.responsibilities
    .filter((row) => row.ruknId === input.karkun.id && isResponsibilityInForce(row, input.asOfDate))
    .map((row) => row.unitId)
  const followUp = dedupeFollowUp(
    resolveJourneyFollowUp({
      karkun: input.karkun,
      assignmentId: input.assignmentId,
      asOfDate: input.asOfDate,
      pendingFollowUp: input.pendingFollowUp,
      workRows,
      occurrences: input.occurrences ?? [],
      programmes: input.programmes ?? [],
      responsibilityUnitIds: inForceUnitIds,
      developmentAction,
      hasDevelopment: development,
    }),
    developmentAction,
  )
  const responsibilities = resolveJourneyResponsibilities(
    input.karkun.id,
    input.responsibilities,
    units,
    workRows,
    input.asOfDate,
  )

  return {
    ...snapshot,
    developmentAction,
    followUp,
    responsibilities,
  }
}

function loadWorkForPerson(personId: string): Work[] {
  const repos = getRepositories()
  const byRukn = unwrapRepository(repos.work.listByRuknId(personId), [])
  const byResponsibility: Work[] = []
  const responsibilities = unwrapRepository(repos.responsibility.listByRuknId(personId), [])
  for (const row of responsibilities) {
    byResponsibility.push(...unwrapRepository(repos.work.listByResponsibilityId(row.id), []))
  }
  const seen = new Set<string>()
  const merged: Work[] = []
  for (const row of [...byRukn, ...byResponsibility]) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    merged.push(row)
  }
  return merged
}

export function loadContinuousKarkunJourney(
  karkunId: string,
  asOfDate = todayWorkCalendarDate(),
): ContinuousKarkunJourneySnapshot | null {
  const karkun = getKarkunById(karkunId)
  if (!karkun) return null
  const assignmentId = getActiveAssignmentsForKarkun(karkunId)[0]?.assignmentId
  const repos = getRepositories()
  const responsibilities = unwrapRepository(repos.responsibility.loadAll(), [])
  const pending = getActiveFollowUpForKarkun(karkunId)
  return resolveContinuousKarkunJourney({
    karkun,
    assignmentId,
    asOfDate,
    responsibilities,
    connectedKarkunCount: getConnectedKarkunCountForRukn(karkunId),
    pendingFollowUp: pending
      ? {
          followUpId: pending.followUpId,
          purpose: pending.purpose,
          followUpDate: pending.followUpDate,
        }
      : null,
    workRows: loadWorkForPerson(karkunId),
    units: unwrapRepository(repos.unit.loadAll(), []),
    occurrences: unwrapRepository(repos.occurrence.loadAll(), []),
    programmes: unwrapRepository(repos.localProgramme.loadAll(), []),
  })
}

export function countContinuousJourneyByStageForRukn(
  ruknId: string,
  asOfDate = todayWorkCalendarDate(),
): { stageId: ContinuousJourneyStageId; label: string; count: number }[] {
  const responsibilities = unwrapRepository(getRepositories().responsibility.loadAll(), [])
  const counts = new Map<ContinuousJourneyStageId, number>()
  for (const karkun of getConnectedKarkunsForRukn(ruknId)) {
    const assignmentId = getActiveAssignmentsForKarkun(karkun.id)[0]?.assignmentId
    const snapshot = resolveContinuousKarkunJourney({
      karkun,
      assignmentId,
      asOfDate,
      responsibilities,
      connectedKarkunCount: getConnectedKarkunCountForRukn(karkun.id),
    })
    counts.set(snapshot.currentStage, (counts.get(snapshot.currentStage) ?? 0) + 1)
  }
  return CONTINUOUS_JOURNEY_STAGE_ORDER.map((stageId) => ({
    stageId,
    label: CONTINUOUS_JOURNEY_STAGE_LABELS[stageId],
    count: counts.get(stageId) ?? 0,
  })).filter((row) => row.count > 0)
}
