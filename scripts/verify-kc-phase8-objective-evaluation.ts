/**
 * Phase 8 — TASK-063 objective evaluation local smoke (no live Firestore / GCP).
 * Run: npm run verify:kc-phase8-objective-evaluation
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CampaignListItem } from '@/constants/mockMissions'
import {
  evaluateCampaignObjective,
  evaluatePlanningObjective,
  loadPlanningObjectiveEvaluations,
  resolvePlanningObjectiveKind,
} from '@/execution'
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
  id: 'mansooba-eval-1',
  name: 'Basavakalyan plan',
  status: 'active',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  primaryUnitId: 'unit-eval-1',
  createdAt: now,
  updatedAt: now,
  createdBy: 'verify',
  updatedBy: 'verify',
}

function objective(overrides: Partial<PlanningObjective> = {}): PlanningObjective {
  return {
    id: 'objective-eval-1',
    mansoobaId: mansooba.id,
    shobahId: 'shobah-eval-1',
    title: 'First meetings',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
    ...overrides,
  }
}

const emptyInput = {
  mansooba,
  asOfDate,
  campaigns: [] as CampaignListItem[],
  programmes: [] as LocalProgramme[],
  occurrences: [] as Occurrence[],
  workRows: [] as Work[],
  responsibilities: [],
}

console.log('▶ architecture — derived evaluation, no new SoT, no NBA/Rafeeq')
{
  const collections = read('src/repositories/firestore/collections.ts')
  assert.equal(FIRESTORE_COLLECTIONS.objectives, 'objectives')
  assertNotIncludes(collections, 'objectiveEvaluations', 'no objectiveEvaluations collection')
  assertNotIncludes(collections, 'evaluationSnapshots', 'no evaluation snapshot collection')

  const evaluator = read('src/execution/planningObjectiveEvaluation.ts')
  assertIncludes(evaluator, 'Does NOT persist', 'evaluation is a read model')
  assertIncludes(evaluator, 'Does NOT invent a performance score', 'no universal score')
  assertNotIncludes(evaluator, 'saveDurable', 'selectors do not persist')
  assertNotIncludes(evaluator, 'deriveNextBestAction', 'does not generate NBA')
  assertNotIncludes(evaluator, 'presentNextBestActionForRafeeq', 'does not present Rafeeq')
  assertNotIncludes(evaluator, 'pct', 'no percentage field in evaluator source')
}

console.log('▶ TASK-063 — explicit states, no guessing')
{
  const unknown = evaluatePlanningObjective({
    ...emptyInput,
    objective: objective({ legacyKey: 'something-invented' }),
  })
  assert.equal(resolvePlanningObjectiveKind(objective({ legacyKey: 'something-invented' })), null)
  assert.equal(unknown.state, 'not_evaluated')
  assert.ok(unknown.explanation.includes('Not evaluated'))
  assert.equal(unknown.evidence.length, 0)
  assert.equal(unknown.objectiveKind, null)

  const archived = evaluatePlanningObjective({
    ...emptyInput,
    objective: objective({ status: 'archived', legacyKey: 'first_meeting' }),
  })
  assert.equal(archived.state, 'not_evaluated')
  assert.ok(archived.explanation.includes('archived'))

  const mapped = evaluatePlanningObjective({
    ...emptyInput,
    objective: objective({ legacyKey: 'first_meeting' }),
    kindSignals: {
      connectedCount: 0,
      visitRecordedCount: 0,
      developmentCount: 0,
      participationCount: 0,
      jihRegisteredCount: 0,
    },
  })
  assert.equal(mapped.objectiveKind, 'first_meeting')
  assert.equal(mapped.state, 'insufficient_evidence')
  assert.ok(mapped.explanation.includes('Insufficient evidence'))
}

console.log('▶ TASK-063 — evidence from existing operational links, not a score')
{
  const campaign: CampaignListItem = {
    id: 'campaign-eval-1',
    name: 'Linked campaign',
    status: 'active',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    theme: 'theme',
    objective: 'copy',
    objectives: ['copy'],
    nextMilestone: 'n',
    mansoobaId: mansooba.id,
    objectiveIds: ['objective-eval-1'],
  }
  const programme: LocalProgramme = {
    id: 'prog-eval-1',
    mansoobaId: mansooba.id,
    shobahId: 'shobah-eval-1',
    objectiveId: 'objective-eval-1',
    campaignId: campaign.id,
    name: 'Weekly Ijtema',
    kind: 'weekly_ijtema',
    status: 'active',
    unitId: 'unit-eval-1',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const occurrence: Occurrence = {
    id: 'occ-eval-1',
    programmeId: programme.id,
    occurrenceDate: '2026-08-10',
    status: 'open',
    generationKey: 'prog-eval-1:2026-08-10',
    title: 'Weekly Ijtema',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const work: Work = {
    id: 'work-eval-1',
    title: 'Prepare attendance',
    ruknId: 'R-eval-1',
    unitId: 'unit-eval-1',
    status: 'pending',
    dueDate: '2026-08-12',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }

  const first = evaluatePlanningObjective({
    ...emptyInput,
    objective: objective({ legacyKey: 'ijtema_participation' }),
    campaigns: [campaign],
    programmes: [programme],
    occurrences: [occurrence],
    workRows: [work],
    kindSignals: {
      connectedCount: 4,
      visitRecordedCount: 2,
      developmentCount: 1,
      participationCount: 3,
      jihRegisteredCount: 0,
    },
  })
  assert.equal(first.state, 'evidence_present')
  assert.ok(first.evidence.some((row) => row.kind === 'campaign_link'))
  assert.ok(first.evidence.some((row) => row.kind === 'local_programme'))
  assert.ok(first.evidence.some((row) => row.kind === 'occurrence'))
  assert.ok(first.evidence.some((row) => row.kind === 'work'))
  assert.ok(first.evidence.some((row) => row.kind === 'journey_signal' && row.sourceId === 'participation'))
  assert.ok(!first.evidence.some((row) => row.sourceId === 'visit'), 'visit signal is not used for ijtema kind')
  assert.ok(first.explanation.includes('not a performance score'))
  assert.equal('pct' in first, false)
  assert.equal('score' in first, false)

  const again = evaluatePlanningObjective({
    ...emptyInput,
    objective: objective({ legacyKey: 'ijtema_participation' }),
    campaigns: [campaign],
    programmes: [programme],
    occurrences: [occurrence],
    workRows: [work],
    kindSignals: {
      connectedCount: 4,
      visitRecordedCount: 2,
      developmentCount: 1,
      participationCount: 3,
      jihRegisteredCount: 0,
    },
    evaluatedAt: first.evaluatedAt,
  })
  assert.deepEqual(again.state, first.state)
  assert.equal(again.evidence.length, first.evidence.length)
}

console.log('▶ KC-020 per-execution evaluator remains intact')
{
  const evaluation = evaluateCampaignObjective({
    executionContextId: 'exec-eval-1',
    objectiveKind: 'first_meeting',
    executionType: 'meeting',
    outcome: { code: 'success', recordedAt: now },
  })
  assert.equal(evaluation.progress, 'advanced')
}

console.log('▶ loadPlanningObjectiveEvaluations is a read of existing Objectives')
{
  const rows = loadPlanningObjectiveEvaluations(asOfDate)
  assert.ok(Array.isArray(rows), 'returns an array')
  assert.ok(
    rows.every((row) => row.objectiveId.length > 0 && row.explanation.length > 0),
    'every row is explainable',
  )
}

console.log('✅ verify:kc-phase8-objective-evaluation PASS')
