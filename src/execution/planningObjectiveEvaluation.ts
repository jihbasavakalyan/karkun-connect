/**
 * Phase 8 / TASK-063 — Planning Objective evaluation (KC-020 Evaluation layer).
 * Authority: docs/architecture/kc-phase8-objective-evaluation-arch009-gate.md
 *
 * Answers: what evidence currently exists toward an Objective, and the current state.
 * Derived read model. Does NOT persist. Does NOT invent a performance score.
 * Does NOT generate Next Best Action or Rafeeq copy.
 *
 * PlanningObjective remains the Objective source of truth.
 * Per-execution progress remains evaluateCampaignObjective (unchanged).
 */

import type { CampaignListItem } from '@/constants/mockMissions'
import { getCanonicalConnectedKarkunCount } from '@/lib/connections/getConnectedKarkunsForRukn'
import {
  hasContinuousDevelopmentSignal,
} from '@/lib/journey/continuousKarkunJourney'
import {
  hasParticipationSignal,
  hasVisitRecorded,
  isJihRegistered,
} from '@/lib/guidance/journeyEngine'
import { getAllKarkuns } from '@/lib/peopleStore'
import { isResponsibilityInForce } from '@/lib/responsibility/tenure'
import { todayWorkCalendarDate } from '@/lib/work/ruknActionItems'
import { unwrapRepository } from '@/repositories/errors'
import { getRepositories } from '@/repositories/provider'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import type { LocalProgramme } from '@/types/localProgramme.types'
import type { Occurrence } from '@/types/occurrence.types'
import type { MeqatiMansooba, PlanningObjective } from '@/types/planning.types'
import type { Responsibility } from '@/types/responsibility.types'
import type { Work } from '@/types/work.types'
import { getAutomationEngine } from './AutomationEngine'
import type { ObjectiveEvaluation } from './objectiveEvaluation'
import type { CampaignObjectiveKind } from './types'

export const PLANNING_OBJECTIVE_KIND_KEYS: readonly CampaignObjectiveKind[] = [
  'first_meeting',
  'worker_development',
  'ijtema_participation',
  'compliance_update',
  'baitulmaal',
  'jih_portal',
  'connection',
  'generic',
]

const KIND_SET = new Set<string>(PLANNING_OBJECTIVE_KIND_KEYS)

export type PlanningObjectiveEvaluationState =
  | 'not_evaluated'
  | 'insufficient_evidence'
  | 'evidence_present'

export type PlanningObjectiveEvidenceKind =
  | 'campaign_link'
  | 'local_programme'
  | 'occurrence'
  | 'work'
  | 'responsibility'
  | 'journey_signal'
  | 'execution_outcome'

export type PlanningObjectiveEvidenceItem = {
  kind: PlanningObjectiveEvidenceKind
  sourceId: string
  label: string
  detail: string
}

export type PlanningObjectiveKindSignals = {
  connectedCount: number
  visitRecordedCount: number
  developmentCount: number
  participationCount: number
  jihRegisteredCount: number
}

export type PlanningObjectiveEvaluation = {
  objectiveId: string
  mansoobaId: string
  title: string
  state: PlanningObjectiveEvaluationState
  objectiveKind: CampaignObjectiveKind | null
  period: {
    startDate?: string
    endDate?: string
    asOfDate: string
  }
  evidence: PlanningObjectiveEvidenceItem[]
  explanation: string
  evaluatedAt: string
}

export type EvaluatePlanningObjectiveInput = {
  objective: PlanningObjective
  mansooba?: MeqatiMansooba
  asOfDate: string
  campaigns: readonly CampaignListItem[]
  programmes: readonly LocalProgramme[]
  occurrences: readonly Occurrence[]
  workRows: readonly Work[]
  responsibilities: readonly Responsibility[]
  kindSignals?: PlanningObjectiveKindSignals
  executionEvaluations?: readonly ObjectiveEvaluation[]
  evaluatedAt?: string
}

function inWindow(dateKey: string | undefined, start?: string, end?: string): boolean {
  const date = dateKey?.trim()
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  if (start && date < start) return false
  if (end && date > end) return false
  return true
}

/**
 * Explicit evaluation semantics only: legacyKey must equal a KC-020 CampaignObjectiveKind.
 * Unknown keys are not guessed from titles.
 */
export function resolvePlanningObjectiveKind(
  objective: Pick<PlanningObjective, 'legacyKey'>,
): CampaignObjectiveKind | null {
  const key = objective.legacyKey?.trim()
  if (!key || !KIND_SET.has(key)) return null
  return key as CampaignObjectiveKind
}

function addKindSignalEvidence(
  kind: CampaignObjectiveKind,
  signals: PlanningObjectiveKindSignals | undefined,
  evidence: PlanningObjectiveEvidenceItem[],
): void {
  if (!signals) return
  if (kind === 'connection' && signals.connectedCount > 0) {
    evidence.push({
      kind: 'journey_signal',
      sourceId: 'connection',
      label: 'Active connections',
      detail: `${signals.connectedCount} connected Karkun(s) from the existing Connection record.`,
    })
  }
  if (kind === 'first_meeting' && signals.visitRecordedCount > 0) {
    evidence.push({
      kind: 'journey_signal',
      sourceId: 'visit',
      label: 'Visit recorded',
      detail: `${signals.visitRecordedCount} Karkun(s) have a visit recorded.`,
    })
  }
  if (kind === 'worker_development' && signals.developmentCount > 0) {
    evidence.push({
      kind: 'journey_signal',
      sourceId: 'development',
      label: 'Development signal',
      detail: `${signals.developmentCount} Karkun(s) have an existing development signal.`,
    })
  }
  if (kind === 'ijtema_participation' && signals.participationCount > 0) {
    evidence.push({
      kind: 'journey_signal',
      sourceId: 'participation',
      label: 'Participation signal',
      detail: `${signals.participationCount} Karkun(s) have an existing Ijtema participation signal.`,
    })
  }
  if ((kind === 'jih_portal' || kind === 'compliance_update') && signals.jihRegisteredCount > 0) {
    evidence.push({
      kind: 'journey_signal',
      sourceId: 'jih_portal',
      label: 'JIH App registration',
      detail: `${signals.jihRegisteredCount} Karkun(s) are registered in the JIH App.`,
    })
  }
}

function explain(
  state: PlanningObjectiveEvaluationState,
  objectiveKind: CampaignObjectiveKind | null,
  evidenceCount: number,
  linkedCampaignCount: number,
): string {
  if (state === 'not_evaluated') {
    return 'Not evaluated: this Objective has no explicit evaluation rule (no KC-020 kind on legacyKey and no Campaign objectiveIds link).'
  }
  if (state === 'insufficient_evidence') {
    const rule = objectiveKind
      ? `kind ${objectiveKind}`
      : `${linkedCampaignCount} Campaign link(s)`
    return `Insufficient evidence: evaluation rule is present (${rule}) but no operational evidence was found.`
  }
  return `Evidence present: ${evidenceCount} existing operational reference(s) toward this Objective. This is not a performance score.`
}

export function evaluatePlanningObjective(
  input: EvaluatePlanningObjectiveInput,
): PlanningObjectiveEvaluation {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString()
  const asOfDate = input.asOfDate
  const startDate = input.mansooba?.startDate?.trim() || undefined
  const endDate = input.mansooba?.endDate?.trim() || undefined
  const objectiveKind = resolvePlanningObjectiveKind(input.objective)

  const linkedCampaigns = input.campaigns.filter((row) =>
    row.objectiveIds?.includes(input.objective.id),
  )
  const linkedCampaignIds = new Set(linkedCampaigns.map((row) => row.id))
  const linkedProgrammes = input.programmes.filter((row) =>
    linkedCampaignIds.has(row.campaignId),
  )
  const programmeIds = new Set(linkedProgrammes.map((row) => row.id))
  const unitIds = new Set(
    linkedProgrammes.map((row) => row.unitId?.trim()).filter((id): id is string => Boolean(id)),
  )
  if (input.mansooba?.primaryUnitId?.trim() && linkedCampaigns.length > 0) {
    unitIds.add(input.mansooba.primaryUnitId.trim())
  }

  const evidence: PlanningObjectiveEvidenceItem[] = []

  if (input.objective.status === 'archived') {
    return {
      objectiveId: input.objective.id,
      mansoobaId: input.objective.mansoobaId,
      title: input.objective.title,
      state: 'not_evaluated',
      objectiveKind,
      period: { startDate, endDate, asOfDate },
      evidence: [],
      explanation: 'Not evaluated: archived Objectives are not evaluated.',
      evaluatedAt,
    }
  }

  for (const campaign of linkedCampaigns) {
    evidence.push({
      kind: 'campaign_link',
      sourceId: campaign.id,
      label: campaign.name,
      detail: 'Campaign lists this Objective in objectiveIds.',
    })
  }

  for (const programme of linkedProgrammes) {
    evidence.push({
      kind: 'local_programme',
      sourceId: programme.id,
      label: programme.name,
      detail: `Local Programme (${programme.kind}) under a linked Campaign.`,
    })
  }

  for (const occurrence of input.occurrences) {
    if (!programmeIds.has(occurrence.programmeId)) continue
    if (occurrence.status === 'archived') continue
    if (!inWindow(occurrence.occurrenceDate, startDate, endDate)) continue
    evidence.push({
      kind: 'occurrence',
      sourceId: occurrence.id,
      label: occurrence.title?.trim() || occurrence.occurrenceDate,
      detail: `${occurrence.status} occurrence on ${occurrence.occurrenceDate}.`,
    })
  }

  for (const work of input.workRows) {
    if (work.status === 'done') continue
    if (!work.unitId?.trim() || !unitIds.has(work.unitId.trim())) continue
    if (work.dueDate && !inWindow(work.dueDate, startDate, endDate)) continue
    evidence.push({
      kind: 'work',
      sourceId: work.id,
      label: work.title,
      detail: `Open Work on a unit linked to this Objective (${work.status}).`,
    })
  }

  for (const row of input.responsibilities) {
    if (!unitIds.has(row.unitId)) continue
    if (!isResponsibilityInForce(row, asOfDate)) continue
    evidence.push({
      kind: 'responsibility',
      sourceId: row.id,
      label: row.nature.trim() || 'Responsibility',
      detail: `In-force Responsibility on a unit linked to this Objective.`,
    })
  }

  if (objectiveKind) {
    addKindSignalEvidence(objectiveKind, input.kindSignals, evidence)
    const matchingExecutions = (input.executionEvaluations ?? []).filter(
      (row) => row.objectiveKind === objectiveKind,
    )
    if (matchingExecutions.length > 0) {
      const latest = matchingExecutions[matchingExecutions.length - 1]!
      evidence.push({
        kind: 'execution_outcome',
        sourceId: latest.id,
        label: 'KC-020 execution evaluation',
        detail: `${matchingExecutions.length} execution evaluation(s) for kind ${objectiveKind}; latest progress ${latest.progress}.`,
      })
    }
  }

  const hasSemantics = Boolean(objectiveKind) || linkedCampaigns.length > 0
  const state: PlanningObjectiveEvaluationState = !hasSemantics
    ? 'not_evaluated'
    : evidence.length === 0
      ? 'insufficient_evidence'
      : 'evidence_present'

  return {
    objectiveId: input.objective.id,
    mansoobaId: input.objective.mansoobaId,
    title: input.objective.title,
    state,
    objectiveKind,
    period: { startDate, endDate, asOfDate },
    evidence,
    explanation: explain(state, objectiveKind, evidence.length, linkedCampaigns.length),
    evaluatedAt,
  }
}

function collectKindSignals(): PlanningObjectiveKindSignals {
  const karkuns = getAllKarkuns()
  let visitRecordedCount = 0
  let developmentCount = 0
  let participationCount = 0
  let jihRegisteredCount = 0
  for (const karkun of karkuns) {
    const assignmentId = getActiveAssignmentsForKarkun(karkun.id)[0]?.assignmentId
    if (hasVisitRecorded(karkun, assignmentId)) visitRecordedCount += 1
    if (hasContinuousDevelopmentSignal(karkun, assignmentId)) developmentCount += 1
    if (hasParticipationSignal(karkun)) participationCount += 1
    if (isJihRegistered(karkun)) jihRegisteredCount += 1
  }
  return {
    connectedCount: getCanonicalConnectedKarkunCount(),
    visitRecordedCount,
    developmentCount,
    participationCount,
    jihRegisteredCount,
  }
}

/** Load derived evaluations for all Planning Objectives. No persistence. */
export function loadPlanningObjectiveEvaluations(
  asOfDate = todayWorkCalendarDate(),
): PlanningObjectiveEvaluation[] {
  const repos = getRepositories()
  const objectives = unwrapRepository(repos.objective.loadAll(), [])
  const mansoobas = unwrapRepository(repos.meqatiMansooba.loadAll(), [])
  const mansoobaById = new Map(mansoobas.map((row) => [row.id, row]))
  const campaigns = unwrapRepository(repos.campaign.getAll(), [])
  const programmes = unwrapRepository(repos.localProgramme.loadAll(), [])
  const occurrences = unwrapRepository(repos.occurrence.loadAll(), [])
  const workRows = unwrapRepository(repos.work.loadAll(), [])
  const responsibilities = unwrapRepository(repos.responsibility.loadAll(), [])
  const kindSignals = collectKindSignals()
  const executionEvaluations = getAutomationEngine().snapshot().objectiveEvaluations
  const evaluatedAt = new Date().toISOString()

  return objectives.map((objective) =>
    evaluatePlanningObjective({
      objective,
      mansooba: mansoobaById.get(objective.mansoobaId),
      asOfDate,
      campaigns,
      programmes,
      occurrences,
      workRows,
      responsibilities,
      kindSignals,
      executionEvaluations,
      evaluatedAt,
    }),
  )
}
