/**
 * Phase 8 — TASK-066 contextual recommendations local smoke (no live Firestore / GCP).
 * Run: npm run verify:kc-phase8-contextual-recommendations
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROUTES } from '@/constants/routes'
import {
  buildObjectiveContextualRecommendation,
  deriveObjectiveNextBestAction,
  evaluateActivityDerivedObjective,
  evaluatePlanningObjective,
  loadObjectiveContextualRecommendations,
  resolveActivityEvaluationPeriod,
} from '@/execution'
import type { ActivityDerivedEvaluation, ObjectiveNextBestAction } from '@/execution'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import type { MansoobaActivityRow } from '@/lib/mansoobaReporting/buildMansoobaActivityReport'
import type { MeqatiMansooba, PlanningObjective } from '@/types/planning.types'
import type { Work } from '@/types/work.types'

const root = resolve(process.cwd())
const now = new Date().toISOString()
const asOfDate = '2026-08-13'

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `expected ${label}: ${needle}`)
}

function assertNotIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(!haystack.includes(needle), `did not expect ${label}: ${needle}`)
}

const mansooba: MeqatiMansooba = {
  id: 'mansooba-rec-1',
  name: 'Basavakalyan plan',
  status: 'active',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  primaryUnitId: 'unit-rec-1',
  createdAt: now,
  updatedAt: now,
  createdBy: 'verify',
  updatedBy: 'verify',
}

function objective(overrides: Partial<PlanningObjective> = {}): PlanningObjective {
  return {
    id: 'objective-rec-1',
    mansoobaId: mansooba.id,
    shobahId: 'shobah-rec-1',
    title: 'Ijtema participation',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
    ...overrides,
  }
}

const period = resolveActivityEvaluationPeriod(mansooba, asOfDate)

function emptyCounts(): ActivityDerivedEvaluation['counts'] {
  return {
    scheduled: 0,
    occurred: 0,
    completed: 0,
    pending: 0,
    wiPresent: 0,
    wiAbsent: 0,
    bmContributed: 0,
    bmPending: 0,
    workCompleted: 0,
    workPending: 0,
    executionsAdvanced: 0,
  }
}

console.log('▶ architecture — derived context wrap, no new SoT, no Rafeeq/ranking')
{
  const collections = read('src/repositories/firestore/collections.ts')
  assert.equal(FIRESTORE_COLLECTIONS.objectives, 'objectives')
  assertNotIncludes(collections, 'recommendations', 'no recommendations collection')
  assertNotIncludes(collections, 'contextualRecommendations', 'no contextual recommendation collection')

  const moduleSource = read('src/execution/contextualRecommendation.ts')
  assertIncludes(moduleSource, 'Does NOT re-derive the Next Best Action', 'consumes NBA')
  assertIncludes(moduleSource, 'Does NOT persist', 'read model')
  assertIncludes(moduleSource, 'Does NOT generate Rafeeq', 'no Rafeeq copy')
  assertNotIncludes(moduleSource, 'saveDurable', 'selectors do not persist')
  assertNotIncludes(moduleSource, 'presentNextBestActionForRafeeq', 'does not present Rafeeq')
  assertNotIncludes(moduleSource, 'recommendationBuilder', 'does not use priority ranking builder')
  assertNotIncludes(moduleSource, 'completionRate', 'no completion-rate formula')
  assertIncludes(moduleSource, 'deriveObjectiveNextBestAction', 'loader consumes TASK-065')

  const nba = read('src/execution/objectiveNextBestAction.ts')
  assertIncludes(nba, 'RECORD_IJTEMA', 'TASK-065 NBA remains intact')
}

console.log('▶ TASK-066 — consumes passed NBA; does not re-derive')
{
  const evaluation = evaluatePlanningObjective({
    objective: objective({ legacyKey: 'ijtema_participation' }),
    mansooba,
    asOfDate,
    campaigns: [],
    programmes: [],
    occurrences: [],
    workRows: [],
    responsibilities: [],
  })
  const row: MansoobaActivityRow = {
    occurrenceId: 'occ-rec-1',
    occurrenceDate: '2026-08-16',
    occurrenceStatus: 'scheduled',
    programmeId: 'prog-rec-1',
    programmeName: 'Weekly Ijtema',
    programmeKind: 'weekly_ijtema',
    programmeStatus: 'active',
    campaignId: 'campaign-rec-1',
    objectiveIds: ['objective-rec-1'],
    execution: { scheduled: true, occurred: false, completed: false, pending: true },
    attention: [],
  }
  const derived = evaluateActivityDerivedObjective({
    evaluation,
    period,
    activityRows: [row],
    evaluatedAt: now,
  })
  const action = deriveObjectiveNextBestAction({ evaluation: derived, createdAt: now })
  assert.equal(action.code, 'RECORD_IJTEMA')

  const forced: ObjectiveNextBestAction = {
    ...action,
    code: 'CLOSE_LOOP',
    reason: 'Forced NBA to prove the wrapper does not re-derive.',
    priority: 'low',
    routeHint: ROUTES.ADMIN_PLANNING,
  }
  const wrapped = buildObjectiveContextualRecommendation({
    action: forced,
    evaluation: derived,
    createdAt: now,
  })
  assert.equal(wrapped.action.code, 'CLOSE_LOOP')
  assert.equal(wrapped.action.reason, forced.reason)
  assert.deepEqual(wrapped.action, forced)
  assert.ok(wrapped.whyNow.includes('Forced NBA'))
  assert.equal(wrapped.destination.routeHint, ROUTES.ADMIN_PLANNING)
}

console.log('▶ TASK-066 — why-now context from pending occurrence and destination')
{
  const evaluation = evaluatePlanningObjective({
    objective: objective({ legacyKey: 'ijtema_participation' }),
    mansooba,
    asOfDate,
    campaigns: [],
    programmes: [],
    occurrences: [],
    workRows: [],
    responsibilities: [],
  })
  const row: MansoobaActivityRow = {
    occurrenceId: 'occ-rec-2',
    occurrenceDate: '2026-08-16',
    occurrenceStatus: 'scheduled',
    programmeId: 'prog-rec-1',
    programmeName: 'Weekly Ijtema',
    programmeKind: 'weekly_ijtema',
    programmeStatus: 'active',
    campaignId: 'campaign-rec-1',
    objectiveIds: ['objective-rec-1'],
    execution: { scheduled: true, occurred: false, completed: false, pending: true },
    attention: [],
  }
  const derived = evaluateActivityDerivedObjective({
    evaluation,
    period,
    activityRows: [row],
    evaluatedAt: now,
  })
  const action = deriveObjectiveNextBestAction({ evaluation: derived, createdAt: now })
  const rec = buildObjectiveContextualRecommendation({
    action,
    evaluation: derived,
    createdAt: now,
  })
  assert.equal(rec.action.code, 'RECORD_IJTEMA')
  assert.equal(rec.destination.routeHint, ROUTES.RUKN_WEEKLY_IJTEMA)
  assert.ok(rec.supportingEvidence.some((row) => row.kind === 'occurrence_pending'))
  assert.equal(rec.timing.nextOccurrenceDate, '2026-08-16')
  assert.ok(rec.whyNow.includes('activity state is insufficient_activity'))
  assert.ok(rec.explanation.includes('RECORD_IJTEMA'))
  assert.ok(rec.explanation.includes(ROUTES.RUKN_WEEKLY_IJTEMA))
  assert.equal('score' in rec, false)
  assert.equal('rank' in rec, false)

  const again = buildObjectiveContextualRecommendation({
    action,
    evaluation: derived,
    createdAt: now,
  })
  assert.deepEqual(again, rec)
}

console.log('▶ TASK-066 — overdue Work timing and subject from existing Work SoT')
{
  const evaluation = evaluatePlanningObjective({
    objective: objective({ legacyKey: 'ijtema_participation' }),
    mansooba,
    asOfDate,
    campaigns: [],
    programmes: [],
    occurrences: [],
    workRows: [],
    responsibilities: [],
  })
  const derived: ActivityDerivedEvaluation = {
    objectiveId: evaluation.objectiveId,
    mansoobaId: evaluation.mansoobaId,
    title: evaluation.title,
    objectiveState: evaluation.state,
    activityState: 'insufficient_activity',
    objectiveKind: evaluation.objectiveKind,
    period,
    counts: { ...emptyCounts(), workPending: 1 },
    evidence: [
      {
        kind: 'work_pending',
        sourceId: 'work-rec-1',
        label: 'Prepare register',
        detail: 'Work still pending (due 2026-08-10, overdue).',
      },
    ],
    explanation: evaluation.explanation,
    evaluatedAt: now,
    objectiveEvaluation: evaluation,
  }
  const action = deriveObjectiveNextBestAction({ evaluation: derived, createdAt: now })
  const work: Work = {
    id: 'work-rec-1',
    title: 'Prepare register',
    ruknId: 'R-rec-1',
    unitId: 'unit-rec-1',
    status: 'pending',
    dueDate: '2026-08-10',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const rec = buildObjectiveContextualRecommendation({
    action,
    evaluation: derived,
    refs: { workById: new Map([[work.id, work]]), connectedKarkunCount: 4 },
    createdAt: now,
  })
  assert.equal(action.code, 'RECORD_PENDING_ACTIVITY')
  assert.equal(rec.action.code, action.code)
  assert.equal(rec.timing.overdueWorkDueDate, '2026-08-10')
  assert.ok(rec.whyNow.includes('Overdue Work due 2026-08-10'))
  assert.ok(rec.subjects.some((row) => row.kind === 'work' && row.detail.includes('R-rec-1')))
  assert.equal(rec.organisation.connectedKarkunCount, 4)
  assert.equal(rec.destination.routeHint, ROUTES.RUKN)
}

console.log('▶ TASK-066 — not_evaluated NBA stays NO_EVALUATION_ACTION with empty operational evidence')
{
  const evaluation = evaluatePlanningObjective({
    objective: objective({ legacyKey: 'something-invented' }),
    mansooba,
    asOfDate,
    campaigns: [],
    programmes: [],
    occurrences: [],
    workRows: [],
    responsibilities: [],
  })
  const derived = evaluateActivityDerivedObjective({
    evaluation,
    period,
    activityRows: [],
    evaluatedAt: now,
  })
  const action = deriveObjectiveNextBestAction({ evaluation: derived, createdAt: now })
  const rec = buildObjectiveContextualRecommendation({
    action,
    evaluation: derived,
    createdAt: now,
  })
  assert.equal(rec.action.code, 'NO_EVALUATION_ACTION')
  assert.equal(rec.supportingEvidence.length, 0)
  assert.equal(rec.destination.routeHint, undefined)
  assert.ok(rec.explanation.includes('NO_EVALUATION_ACTION'))
}

console.log('▶ loadObjectiveContextualRecommendations is a read of existing Objectives')
{
  const rows = loadObjectiveContextualRecommendations(asOfDate)
  assert.ok(Array.isArray(rows), 'returns an array')
  assert.ok(
    rows.every(
      (row) =>
        row.action.objectiveId === row.objectiveId &&
        row.explanation.length > 0 &&
        row.whyNow.length > 0,
    ),
    'every row consumes NBA and is explainable',
  )
}

console.log('✅ verify:kc-phase8-contextual-recommendations PASS')
