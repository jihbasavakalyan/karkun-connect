/**
 * Phase 8 — TASK-064 activity-derived evaluation local smoke (no live Firestore / GCP).
 * Run: npm run verify:kc-phase8-activity-derived-evaluation
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CampaignListItem } from '@/constants/mockMissions'
import {
  evaluateActivityDerivedObjective,
  evaluateCampaignObjective,
  evaluatePlanningObjective,
  loadActivityDerivedEvaluations,
  resolveActivityEvaluationPeriod,
} from '@/execution'
import { buildMansoobaActivityReport } from '@/lib/mansoobaReporting/buildMansoobaActivityReport'
import type { MansoobaActivityRow } from '@/lib/mansoobaReporting/buildMansoobaActivityReport'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import type { LocalProgramme } from '@/types/localProgramme.types'
import type { Occurrence } from '@/types/occurrence.types'
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
  id: 'mansooba-act-1',
  name: 'Basavakalyan plan',
  status: 'active',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  primaryUnitId: 'unit-act-1',
  createdAt: now,
  updatedAt: now,
  createdBy: 'verify',
  updatedBy: 'verify',
}

function objective(overrides: Partial<PlanningObjective> = {}): PlanningObjective {
  return {
    id: 'objective-act-1',
    mansoobaId: mansooba.id,
    shobahId: 'shobah-act-1',
    title: 'Ijtema participation',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
    ...overrides,
  }
}

const campaign: CampaignListItem = {
  id: 'campaign-act-1',
  name: 'Linked campaign',
  status: 'active',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  theme: 'theme',
  objective: 'copy',
  objectives: ['copy'],
  nextMilestone: 'n',
  mansoobaId: mansooba.id,
  objectiveIds: ['objective-act-1'],
}

const programme: LocalProgramme = {
    id: 'prog-act-1',
    mansoobaId: mansooba.id,
    shobahId: 'shobah-act-1',
    objectiveId: 'objective-act-1',
    campaignId: campaign.id,
  name: 'Weekly Ijtema',
  kind: 'weekly_ijtema',
  status: 'active',
  unitId: 'unit-act-1',
  createdAt: now,
  updatedAt: now,
  createdBy: 'verify',
  updatedBy: 'verify',
}

const period = resolveActivityEvaluationPeriod(mansooba, asOfDate)

function baseEvaluation(legacyKey: PlanningObjective['legacyKey'] = 'ijtema_participation') {
  return evaluatePlanningObjective({
    objective: objective({ legacyKey }),
    mansooba,
    asOfDate,
    campaigns: [campaign],
    programmes: [programme],
    occurrences: [],
    workRows: [],
    responsibilities: [],
  })
}

console.log('▶ architecture — derived activity evaluation, no new SoT, no NBA/Rafeeq')
{
  const collections = read('src/repositories/firestore/collections.ts')
  assert.equal(FIRESTORE_COLLECTIONS.objectives, 'objectives')
  assertNotIncludes(collections, 'activityEvaluations', 'no activityEvaluations collection')
  assertNotIncludes(collections, 'activityDerived', 'no activity-derived collection')

  const evaluator = read('src/execution/activityDerivedEvaluation.ts')
  assertIncludes(evaluator, 'Does NOT persist', 'evaluation is a read model')
  assertIncludes(evaluator, 'Does NOT invent a performance score', 'no universal score')
  assertNotIncludes(evaluator, 'saveDurable', 'selectors do not persist')
  assertNotIncludes(evaluator, 'deriveNextBestAction', 'does not generate NBA')
  assertNotIncludes(evaluator, 'presentNextBestActionForRafeeq', 'does not present Rafeeq')
  assertNotIncludes(evaluator, 'completionRate', 'no completion-rate formula')
  assertIncludes(evaluator, 'buildMansoobaActivityReport', 'reuses Phase 5 activity report')
  assertIncludes(evaluator, 'loadPlanningObjectiveEvaluations', 'consumes TASK-063')

  const phase5 = read('src/lib/mansoobaReporting/buildMansoobaActivityReport.ts')
  assertIncludes(phase5, 'no_approved_performance_score', 'Phase 5 score gap remains')
}

console.log('▶ TASK-064 — not_evaluated Objective does not interpret activity')
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
  const row: MansoobaActivityRow = {
    occurrenceId: 'occ-ignored',
    occurrenceDate: '2026-08-10',
    occurrenceStatus: 'open',
    programmeId: programme.id,
    programmeName: programme.name,
    programmeKind: programme.kind,
    programmeStatus: programme.status,
    campaignId: campaign.id,
    objectiveIds: ['objective-act-1'],
    execution: { scheduled: true, occurred: true, completed: false, pending: true },
    attention: [],
  }
  const derived = evaluateActivityDerivedObjective({
    evaluation,
    period,
    activityRows: [row],
  })
  assert.equal(evaluation.state, 'not_evaluated')
  assert.equal(derived.activityState, 'not_evaluated')
  assert.equal(derived.evidence.length, 0)
  assert.ok(derived.explanation.includes('Not evaluated'))
}

console.log('▶ TASK-064 — scheduled-only is insufficient activity, not a score')
{
  const scheduled: Occurrence = {
    id: 'occ-sched-1',
    programmeId: programme.id,
    occurrenceDate: '2026-08-16',
    status: 'scheduled',
    generationKey: 'prog-act-1:2026-08-16',
    title: 'Future Ijtema',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const report = buildMansoobaActivityReport({
    mansooba,
    period,
    asOfDate,
    objectives: [objective({ legacyKey: 'ijtema_participation' })],
    campaigns: [campaign],
    programmes: [programme],
    occurrences: [scheduled],
    work: [],
  })
  const derived = evaluateActivityDerivedObjective({
    evaluation: baseEvaluation(),
    period,
    activityRows: report.activityRows,
  })
  assert.equal(derived.objectiveState, 'evidence_present')
  assert.equal(derived.activityState, 'insufficient_activity')
  assert.ok(derived.counts.scheduled >= 1)
  assert.equal(derived.counts.occurred, 0)
  assert.ok(derived.evidence.some((row) => row.kind === 'occurrence_pending'))
  assert.ok(!derived.evidence.some((row) => row.kind === 'occurrence_occurred'))
  assert.ok(derived.explanation.includes('not a performance score'))
  assert.equal('score' in derived, false)
  assert.equal('completionRate' in derived, false)
}

console.log('▶ TASK-064 — journey snapshot is not period activity')
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
    kindSignals: {
      connectedCount: 0,
      visitRecordedCount: 0,
      developmentCount: 0,
      participationCount: 4,
      jihRegisteredCount: 0,
    },
  })
  assert.equal(evaluation.state, 'evidence_present')
  const derived = evaluateActivityDerivedObjective({
    evaluation,
    period,
    activityRows: [],
  })
  assert.equal(derived.activityState, 'insufficient_activity')
  assert.ok(derived.explanation.includes('Journey snapshots'))
}

console.log('▶ TASK-064 — occurred occurrence and WI marks contribute')
{
  const occurred: Occurrence = {
    id: 'occ-open-1',
    programmeId: programme.id,
    occurrenceDate: '2026-08-10',
    status: 'open',
    generationKey: 'prog-act-1:2026-08-10',
    title: 'Weekly Ijtema',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const report = buildMansoobaActivityReport({
    mansooba,
    period,
    asOfDate,
    objectives: [objective({ legacyKey: 'ijtema_participation' })],
    campaigns: [campaign],
    programmes: [programme],
    occurrences: [occurred],
    work: [],
  })
  const withMarks: MansoobaActivityRow[] = report.activityRows.map((row) => ({
    ...row,
    attendance: { present: 3, absent: 1, reminded: 4, source: 'weekly_ijtema' },
  }))
  const derived = evaluateActivityDerivedObjective({
    evaluation: baseEvaluation(),
    period,
    activityRows: withMarks,
    evaluatedAt: now,
  })
  assert.equal(derived.activityState, 'activity_contributes')
  assert.ok(derived.evidence.some((row) => row.kind === 'occurrence_occurred'))
  assert.ok(derived.evidence.some((row) => row.kind === 'wi_attendance'))
  assert.equal(derived.counts.wiPresent, 3)
  assert.equal(derived.counts.wiAbsent, 1)
  assert.ok(derived.explanation.includes('not a performance score'))

  const again = evaluateActivityDerivedObjective({
    evaluation: baseEvaluation(),
    period,
    activityRows: withMarks,
    evaluatedAt: now,
  })
  assert.equal(again.activityState, derived.activityState)
  assert.equal(again.evidence.length, derived.evidence.length)
  assert.deepEqual(again.counts, derived.counts)
}

console.log('▶ TASK-064 — completed Work and advanced execution contribute')
{
  const work: Work = {
    id: 'work-done-1',
    title: 'Close attendance',
    ruknId: 'R-act-1',
    unitId: 'unit-act-1',
    status: 'done',
    dueDate: '2026-08-10',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const report = buildMansoobaActivityReport({
    mansooba,
    period,
    asOfDate,
    objectives: [objective({ legacyKey: 'ijtema_participation' })],
    campaigns: [campaign],
    programmes: [programme],
    occurrences: [],
    work: [work],
  })
  const execution = evaluateCampaignObjective({
    executionContextId: 'exec-act-1',
    objectiveKind: 'ijtema_participation',
    executionType: 'ijtema',
    outcome: { code: 'success', recordedAt: now },
  })
  assert.equal(execution.progress, 'advanced')
  const derived = evaluateActivityDerivedObjective({
    evaluation: baseEvaluation(),
    period,
    activityRows: report.activityRows,
    workRows: report.workRows,
    executionEvaluations: [execution],
  })
  assert.equal(derived.activityState, 'activity_contributes')
  assert.ok(derived.evidence.some((row) => row.kind === 'work_completed'))
  assert.ok(derived.evidence.some((row) => row.kind === 'execution_advanced'))
}

console.log('▶ TASK-063 and KC-020 remain intact')
{
  const structural = evaluatePlanningObjective({
    objective: objective({ legacyKey: 'first_meeting' }),
    mansooba,
    asOfDate,
    campaigns: [],
    programmes: [],
    occurrences: [],
    workRows: [],
    responsibilities: [],
    kindSignals: {
      connectedCount: 0,
      visitRecordedCount: 0,
      developmentCount: 0,
      participationCount: 0,
      jihRegisteredCount: 0,
    },
  })
  assert.equal(structural.state, 'insufficient_evidence')
  const campaignEval = evaluateCampaignObjective({
    executionContextId: 'exec-act-2',
    objectiveKind: 'first_meeting',
    executionType: 'meeting',
    outcome: { code: 'success', recordedAt: now },
  })
  assert.equal(campaignEval.progress, 'advanced')
}

console.log('▶ loadActivityDerivedEvaluations is a read of existing Objectives')
{
  const rows = loadActivityDerivedEvaluations(asOfDate)
  assert.ok(Array.isArray(rows), 'returns an array')
  assert.ok(
    rows.every(
      (row) =>
        row.objectiveId.length > 0 &&
        row.explanation.length > 0 &&
        row.objectiveEvaluation.objectiveId === row.objectiveId,
    ),
    'every row consumes TASK-063 and is explainable',
  )
}

console.log('✅ verify:kc-phase8-activity-derived-evaluation PASS')
