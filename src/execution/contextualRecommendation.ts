/**
 * Phase 8 / TASK-066 — Contextual recommendations around an already-selected NBA.
 * Authority: docs/architecture/kc-phase8-contextual-recommendations-arch009-gate.md
 *
 * Answers: why this TASK-065 Next Best Action is relevant here and now.
 * Consumes ObjectiveNextBestAction. Does NOT re-derive the Next Best Action.
 * Derived read model. Does NOT persist. Does NOT invent a performance score.
 * Does NOT rank people or produce a recommendation feed.
 * Does NOT generate Rafeeq / Urdu copy.
 */

import { getCanonicalConnectedKarkunCount } from '@/lib/connections/getConnectedKarkunsForRukn'
import {
  countContinuousJourneyByStage,
  type ContinuousJourneyStageId,
} from '@/lib/journey/continuousKarkunJourney'
import { todayWorkCalendarDate } from '@/lib/work/ruknActionItems'
import { unwrapRepository } from '@/repositories/errors'
import { getRepositories } from '@/repositories/provider'
import type { Occurrence } from '@/types/occurrence.types'
import type { Work } from '@/types/work.types'
import type {
  ActivityDerivedEvaluation,
  ActivityDerivedEvidenceItem,
} from './activityDerivedEvaluation'
import { loadActivityDerivedEvaluations } from './activityDerivedEvaluation'
import {
  deriveObjectiveNextBestAction,
  type ObjectiveNextBestAction,
} from './objectiveNextBestAction'

export type RecommendationSubjectKind = 'work' | 'occurrence' | 'journey_signal'

export type RecommendationSubject = {
  kind: RecommendationSubjectKind
  sourceId: string
  label: string
  detail: string
}

export type RecommendationTiming = {
  asOfDate: string
  periodStart?: string
  periodEnd?: string
  nextOccurrenceDate?: string
  overdueWorkDueDate?: string
}

export type RecommendationOrganisationContext = {
  connectedKarkunCount: number
  journeyStageCounts: { stageId: ContinuousJourneyStageId; label: string; count: number }[]
}

export type ObjectiveContextualRecommendation = {
  id: string
  objectiveId: string
  mansoobaId: string
  title: string
  /** TASK-065 NBA consumed as given — not re-derived here. */
  action: ObjectiveNextBestAction
  whyNow: string
  destination: {
    routeHint?: string
    label: string
  }
  supportingEvidence: ActivityDerivedEvidenceItem[]
  subjects: RecommendationSubject[]
  timing: RecommendationTiming
  organisation: RecommendationOrganisationContext
  explanation: string
  createdAt: string
}

export type ContextualRecommendationRefs = {
  workById?: ReadonlyMap<string, Work>
  occurrenceById?: ReadonlyMap<string, Occurrence>
  connectedKarkunCount?: number
  journeyStageCounts?: RecommendationOrganisationContext['journeyStageCounts']
}

export type BuildObjectiveContextualRecommendationInput = {
  action: ObjectiveNextBestAction
  evaluation: ActivityDerivedEvaluation
  refs?: ContextualRecommendationRefs
  createdAt?: string
}

function destinationLabel(action: ObjectiveNextBestAction): string {
  if (action.routeHint) return `Act at ${action.routeHint}`
  return 'No operational destination (no evaluation rule)'
}

function supportingEvidence(
  action: ObjectiveNextBestAction,
  evaluation: ActivityDerivedEvaluation,
): ActivityDerivedEvidenceItem[] {
  if (action.objectiveId !== evaluation.objectiveId) return []
  if (action.code === 'NO_EVALUATION_ACTION') return []

  const kinds = new Set<ActivityDerivedEvidenceItem['kind']>()
  if (action.code === 'RECORD_PENDING_ACTIVITY') {
    kinds.add('work_pending')
    kinds.add('occurrence_pending')
  } else if (action.code === 'CLOSE_LOOP') {
    kinds.add('occurrence_occurred')
    kinds.add('occurrence_completed')
    kinds.add('wi_attendance')
    kinds.add('bm_contribution')
    kinds.add('work_completed')
    kinds.add('execution_advanced')
  } else {
    kinds.add('occurrence_pending')
    kinds.add('occurrence_occurred')
    kinds.add('work_pending')
    kinds.add('wi_attendance')
    kinds.add('bm_contribution')
  }

  return evaluation.evidence.filter((row) => kinds.has(row.kind))
}

function dateFromDetail(detail: string, pattern: RegExp): string | undefined {
  const match = detail.match(pattern)
  return match?.[1]
}

function buildTiming(
  evaluation: ActivityDerivedEvaluation,
  evidence: ActivityDerivedEvidenceItem[],
  refs?: ContextualRecommendationRefs,
): RecommendationTiming {
  const period = evaluation.objectiveEvaluation.period
  let nextOccurrenceDate: string | undefined
  let overdueWorkDueDate: string | undefined

  for (const row of evidence) {
    if (row.kind === 'occurrence_pending' || row.kind === 'occurrence_occurred') {
      const fromRef = refs?.occurrenceById?.get(row.sourceId)?.occurrenceDate
      const fromDetail = dateFromDetail(row.detail, /\b(\d{4}-\d{2}-\d{2})\b/)
      const date = fromRef ?? fromDetail
      if (date && (!nextOccurrenceDate || date < nextOccurrenceDate)) nextOccurrenceDate = date
    }
    if (row.kind === 'work_pending' && row.detail.includes('overdue')) {
      const fromRef = refs?.workById?.get(row.sourceId)?.dueDate
      const fromDetail = dateFromDetail(row.detail, /\b(\d{4}-\d{2}-\d{2})\b/)
      const date = fromRef ?? fromDetail
      if (date && (!overdueWorkDueDate || date < overdueWorkDueDate)) overdueWorkDueDate = date
    }
  }

  return {
    asOfDate: period.asOfDate,
    periodStart: period.startDate ?? evaluation.period.startDate,
    periodEnd: period.endDate ?? evaluation.period.endDate,
    nextOccurrenceDate,
    overdueWorkDueDate,
  }
}

function buildSubjects(
  evidence: ActivityDerivedEvidenceItem[],
  refs?: ContextualRecommendationRefs,
): RecommendationSubject[] {
  const subjects: RecommendationSubject[] = []
  for (const row of evidence) {
    if (row.kind === 'work_pending' || row.kind === 'work_completed') {
      const work = refs?.workById?.get(row.sourceId)
      subjects.push({
        kind: 'work',
        sourceId: row.sourceId,
        label: work?.title ?? row.label,
        detail: work
          ? `Work ${work.status}${work.dueDate ? `; due ${work.dueDate}` : ''}${work.ruknId ? `; rukn ${work.ruknId}` : ''}.`
          : row.detail,
      })
      continue
    }
    if (
      row.kind === 'occurrence_pending' ||
      row.kind === 'occurrence_occurred' ||
      row.kind === 'occurrence_completed'
    ) {
      const occurrence = refs?.occurrenceById?.get(row.sourceId)
      subjects.push({
        kind: 'occurrence',
        sourceId: row.sourceId,
        label: occurrence?.title?.trim() || row.label,
        detail: occurrence
          ? `${occurrence.status} occurrence on ${occurrence.occurrenceDate}.`
          : row.detail,
      })
    }
  }
  return subjects
}

function whyNow(
  action: ObjectiveNextBestAction,
  evaluation: ActivityDerivedEvaluation,
  timing: RecommendationTiming,
): string {
  const parts = [action.reason]
  if (timing.overdueWorkDueDate) {
    parts.push(`Overdue Work due ${timing.overdueWorkDueDate} is still open as of ${timing.asOfDate}.`)
  } else if (timing.nextOccurrenceDate) {
    parts.push(`Relevant occurrence date ${timing.nextOccurrenceDate} is in the current evaluation period.`)
  }
  parts.push(
    `Objective state is ${evaluation.objectiveState}; activity state is ${evaluation.activityState}.`,
  )
  return parts.join(' ')
}

function explain(recommendation: {
  action: ObjectiveNextBestAction
  whyNow: string
  supportingEvidence: ActivityDerivedEvidenceItem[]
  destination: { routeHint?: string; label: string }
  title: string
}): string {
  const where = recommendation.action.routeHint
    ? `Act at ${recommendation.action.routeHint}.`
    : 'No route hint.'
  return `Recommend ${recommendation.action.code} for Objective "${recommendation.title}" because ${recommendation.whyNow} Supporting evidence: ${recommendation.supportingEvidence.length} reference(s). ${where}`
}

/**
 * Wrap a TASK-065 NBA with explainable here-and-now context.
 * Does NOT re-derive the Next Best Action. Does NOT persist. Does NOT present Rafeeq copy.
 */
export function buildObjectiveContextualRecommendation(
  input: BuildObjectiveContextualRecommendationInput,
): ObjectiveContextualRecommendation {
  const action = input.action
  const evaluation = input.evaluation
  const createdAt = input.createdAt ?? action.createdAt
  const evidence = supportingEvidence(action, evaluation)
  const timing = buildTiming(evaluation, evidence, input.refs)
  const why = whyNow(action, evaluation, timing)
  const destination = {
    routeHint: action.routeHint,
    label: destinationLabel(action),
  }
  const title = evaluation.title
  const organisation: RecommendationOrganisationContext = {
    connectedKarkunCount: input.refs?.connectedKarkunCount ?? 0,
    journeyStageCounts: input.refs?.journeyStageCounts ?? [],
  }

  const recommendation: ObjectiveContextualRecommendation = {
    id: `rec-${action.id}`,
    objectiveId: action.objectiveId,
    mansoobaId: action.mansoobaId,
    title,
    action,
    whyNow: why,
    destination,
    supportingEvidence: evidence,
    subjects: buildSubjects(evidence, input.refs),
    timing,
    organisation,
    explanation: '',
    createdAt,
  }
  recommendation.explanation = explain(recommendation)
  return recommendation
}

/** Load one contextual recommendation per Objective. NBA is derived once via TASK-065, then wrapped. */
export function loadObjectiveContextualRecommendations(
  asOfDate = todayWorkCalendarDate(),
): ObjectiveContextualRecommendation[] {
  const evaluations = loadActivityDerivedEvaluations(asOfDate)
  const repos = getRepositories()
  const workRows = unwrapRepository(repos.work.loadAll(), [])
  const occurrences = unwrapRepository(repos.occurrence.loadAll(), [])
  const refs: ContextualRecommendationRefs = {
    workById: new Map(workRows.map((row) => [row.id, row])),
    occurrenceById: new Map(occurrences.map((row) => [row.id, row])),
    connectedKarkunCount: getCanonicalConnectedKarkunCount(),
    journeyStageCounts: countContinuousJourneyByStage(asOfDate),
  }
  const createdAt = new Date().toISOString()
  return evaluations.map((evaluation) => {
    const action = deriveObjectiveNextBestAction({ evaluation, createdAt })
    return buildObjectiveContextualRecommendation({
      action,
      evaluation,
      refs,
      createdAt,
    })
  })
}
