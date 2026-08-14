/**
 * Phase 8 — TASK-065 objective Next Best Action local smoke (no live Firestore / GCP).
 * Run: npm run verify:kc-phase8-next-best-action
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROUTES } from '@/constants/routes'
import {
  deriveNextBestAction,
  deriveObjectiveNextBestAction,
  evaluateActivityDerivedObjective,
  evaluateCampaignObjective,
  evaluatePlanningObjective,
  loadObjectiveNextBestActions,
  resolveActivityEvaluationPeriod,
} from '@/execution'
import type { ActivityDerivedEvaluation } from '@/execution'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import type { MansoobaActivityRow } from '@/lib/mansoobaReporting/buildMansoobaActivityReport'
import type { MeqatiMansooba, PlanningObjective } from '@/types/planning.types'

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
  id: 'mansooba-nba-1',
  name: 'Basavakalyan plan',
  status: 'active',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  primaryUnitId: 'unit-nba-1',
  createdAt: now,
  updatedAt: now,
  createdBy: 'verify',
  updatedBy: 'verify',
}

function objective(overrides: Partial<PlanningObjective> = {}): PlanningObjective {
  return {
    id: 'objective-nba-1',
    mansoobaId: mansooba.id,
    shobahId: 'shobah-nba-1',
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

function wrap(
  evaluation: ReturnType<typeof evaluatePlanningObjective>,
  activity: ReturnType<typeof evaluateActivityDerivedObjective> | Partial<ActivityDerivedEvaluation>,
): ActivityDerivedEvaluation {
  if ('objectiveEvaluation' in activity && activity.objectiveEvaluation) {
    return activity as ActivityDerivedEvaluation
  }
  return {
    objectiveId: evaluation.objectiveId,
    mansoobaId: evaluation.mansoobaId,
    title: evaluation.title,
    objectiveState: evaluation.state,
    activityState: 'insufficient_activity',
    objectiveKind: evaluation.objectiveKind,
    period,
    counts: emptyCounts(),
    evidence: [],
    explanation: evaluation.explanation,
    evaluatedAt: now,
    objectiveEvaluation: evaluation,
    ...activity,
  }
}

console.log('▶ architecture — derived NBA, no new SoT, no Rafeeq/recommendations')
{
  const collections = read('src/repositories/firestore/collections.ts')
  assert.equal(FIRESTORE_COLLECTIONS.objectives, 'objectives')
  assertNotIncludes(collections, 'nextBestActions', 'no NBA collection')
  assertNotIncludes(collections, 'objectiveNextBestActions', 'no objective NBA collection')

  const nba = read('src/execution/objectiveNextBestAction.ts')
  assertIncludes(nba, 'Does NOT persist', 'NBA is a read model')
  assertIncludes(nba, 'Does NOT generate Rafeeq', 'no Rafeeq copy')
  assertNotIncludes(nba, 'saveDurable', 'selectors do not persist')
  assertNotIncludes(nba, 'presentNextBestActionForRafeeq', 'does not present Rafeeq')
  assertNotIncludes(nba, 'deriveNextBestAction(', 'does not call execution NBA mapper')
  assertNotIncludes(nba, 'recommendationBuilder', 'does not rank recommendations')
  assertNotIncludes(nba, 'completionRate', 'no completion-rate formula')
  assertIncludes(nba, 'loadActivityDerivedEvaluations', 'consumes TASK-064')

  const executionNba = read('src/execution/nextBestAction.ts')
  assertIncludes(executionNba, 'SCHEDULE_MEETING', 'execution NBA codes intact')
}

console.log('▶ TASK-065 — not_evaluated does not invent an operational action')
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
  })
  const action = deriveObjectiveNextBestAction({ evaluation: derived, createdAt: now })
  assert.equal(action.code, 'NO_EVALUATION_ACTION')
  assert.equal(action.priority, 'low')
  assert.equal(action.routeHint, undefined)
  assert.ok(action.reason.includes('no evaluation rule'))
}

console.log('▶ TASK-065 — pending occurrence maps to kind action')
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
    occurrenceId: 'occ-nba-1',
    occurrenceDate: '2026-08-16',
    occurrenceStatus: 'scheduled',
    programmeId: 'prog-nba-1',
    programmeName: 'Weekly Ijtema',
    programmeKind: 'weekly_ijtema',
    programmeStatus: 'active',
    campaignId: 'campaign-nba-1',
    objectiveIds: ['objective-nba-1'],
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
  assert.equal(derived.activityState, 'insufficient_activity')
  assert.equal(action.code, 'RECORD_IJTEMA')
  assert.equal(action.priority, 'high')
  assert.equal(action.routeHint, ROUTES.RUKN_WEEKLY_IJTEMA)

  const again = deriveObjectiveNextBestAction({ evaluation: derived, createdAt: now })
  assert.deepEqual(again, action)
}

console.log('▶ TASK-065 — overdue Work outranks pending occurrence')
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
  const derived = wrap(evaluation, {
    activityState: 'insufficient_activity',
    counts: { ...emptyCounts(), scheduled: 1, pending: 1, workPending: 1 },
    evidence: [
      {
        kind: 'occurrence_pending',
        sourceId: 'occ-nba-2',
        label: 'Weekly Ijtema',
        detail: 'Occurrence on 2026-08-16 is scheduled/pending and has not occurred.',
      },
      {
        kind: 'work_pending',
        sourceId: 'work-nba-1',
        label: 'Prepare register',
        detail: 'Work still pending (due 2026-08-10, overdue).',
      },
    ],
  })
  const action = deriveObjectiveNextBestAction({ evaluation: derived, createdAt: now })
  assert.equal(action.code, 'RECORD_PENDING_ACTIVITY')
  assert.equal(action.priority, 'high')
  assert.equal(action.routeHint, ROUTES.RUKN)
}

console.log('▶ TASK-065 — activity contributes with nothing pending → CLOSE_LOOP')
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
  const derived = wrap(evaluation, {
    activityState: 'activity_contributes',
    counts: { ...emptyCounts(), occurred: 1, completed: 1 },
    evidence: [
      {
        kind: 'occurrence_completed',
        sourceId: 'occ-nba-3',
        label: 'Weekly Ijtema',
        detail: 'Occurrence on 2026-08-10 completed.',
      },
    ],
  })
  const action = deriveObjectiveNextBestAction({ evaluation: derived, createdAt: now })
  assert.equal(action.code, 'CLOSE_LOOP')
  assert.equal(action.priority, 'low')
  assert.equal(action.routeHint, ROUTES.ADMIN_PLANNING)
  assert.equal('score' in action, false)
}

console.log('▶ TASK-065 — insufficient activity with no pending uses kind start action')
{
  const evaluation = evaluatePlanningObjective({
    objective: objective({ legacyKey: 'first_meeting' }),
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
  assert.equal(derived.activityState, 'insufficient_activity')
  assert.equal(action.code, 'SCHEDULE_MEETING')
  assert.equal(action.priority, 'medium')
  assert.equal(action.routeHint, ROUTES.RUKN_MY_KARKUN)
}

console.log('▶ KC-020 per-execution NBA remains intact')
{
  const executionNba = deriveNextBestAction({
    executionType: 'phone_call',
    outcomeCode: 'success',
    executionContextId: 'exec-nba-1',
    now,
  })
  assert.equal(executionNba.code, 'SCHEDULE_MEETING')
  const campaignEval = evaluateCampaignObjective({
    executionContextId: 'exec-nba-1',
    objectiveKind: 'first_meeting',
    executionType: 'meeting',
    outcome: { code: 'success', recordedAt: now },
  })
  assert.equal(campaignEval.progress, 'advanced')
}

console.log('▶ loadObjectiveNextBestActions is a read of existing Objectives')
{
  const rows = loadObjectiveNextBestActions(asOfDate)
  assert.ok(Array.isArray(rows), 'returns an array')
  assert.ok(
    rows.every((row) => row.objectiveId.length > 0 && row.reason.length > 0 && row.code.length > 0),
    'every row is explainable',
  )
}

console.log('✅ verify:kc-phase8-next-best-action PASS')
