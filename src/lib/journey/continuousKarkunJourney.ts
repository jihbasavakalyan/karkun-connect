/**
 * Phase 7 — Continuous Karkun journey (TASK-056).
 * Authority: docs/architecture/kc-phase7-journey-dashboards-arch009-gate.md
 *
 * Product journey (read model, not a database hierarchy):
 * Connection → Development → Participation → Responsibility → Leadership
 *
 * Derived from existing Connection, visit/orientation/JIH, participation,
 * Responsibility, and connected-Karkun signals.
 * Does NOT persist a journey entity. Does NOT replace the campaign 7-stage journey.
 */

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
import { todayWorkCalendarDate } from '@/lib/work/ruknActionItems'
import { unwrapRepository } from '@/repositories/errors'
import { getRepositories } from '@/repositories/provider'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { Responsibility } from '@/types/responsibility.types'

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

export type ContinuousKarkunJourneySnapshot = {
  currentStage: ContinuousJourneyStageId
  stageLabel: string
  steps: ContinuousJourneyStep[]
  completedCount: number
  totalCount: number
  signals: ContinuousJourneySignals
}

export type ContinuousJourneySignalInput = {
  assignmentId?: string
  karkun: KarkunRegistryRecord
  asOfDate: string
  responsibilities: readonly Responsibility[]
  connectedKarkunCount: number
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
  }
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

  return snapshotFromContinuousSignals({
    connection,
    development,
    participation,
    responsibility,
    leadership,
  })
}

export function loadContinuousKarkunJourney(
  karkunId: string,
  asOfDate = todayWorkCalendarDate(),
): ContinuousKarkunJourneySnapshot | null {
  const karkun = getKarkunById(karkunId)
  if (!karkun) return null
  const assignmentId = getActiveAssignmentsForKarkun(karkunId)[0]?.assignmentId
  const responsibilities = unwrapRepository(getRepositories().responsibility.loadAll(), [])
  return resolveContinuousKarkunJourney({
    karkun,
    assignmentId,
    asOfDate,
    responsibilities,
    connectedKarkunCount: getConnectedKarkunCountForRukn(karkunId),
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
