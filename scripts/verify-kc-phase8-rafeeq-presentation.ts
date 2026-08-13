/**
 * Phase 8 — TASK-067/068 Rafeeq presentation + voice wiring (no live Firestore / GCP).
 * Run: npm run verify:kc-phase8-rafeeq-presentation
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
  presentContextualRecommendationForRafeeq,
  presentNextBestActionForRafeeq,
  resolveActivityEvaluationPeriod,
  urduForRafeeqActionCode,
} from '@/execution'
import type { ActivityDerivedEvaluation, ObjectiveContextualRecommendation } from '@/execution'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
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
  id: 'mansooba-rf-1',
  name: 'Basavakalyan plan',
  status: 'active',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  createdAt: now,
  updatedAt: now,
  createdBy: 'verify',
  updatedBy: 'verify',
}

function objective(): PlanningObjective {
  return {
    id: 'objective-rf-1',
    mansoobaId: mansooba.id,
    title: 'Ijtema participation',
    status: 'active',
    legacyKey: 'ijtema_participation',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
}

const period = resolveActivityEvaluationPeriod(mansooba, asOfDate)

function wrapRecommendation(
  rec: ObjectiveContextualRecommendation,
): ObjectiveContextualRecommendation {
  return rec
}

console.log('▶ architecture — presentation consumes TASK-066; voice uses existing TTS')
{
  const collections = read('src/repositories/firestore/collections.ts')
  assert.equal(FIRESTORE_COLLECTIONS.objectives, 'objectives')
  assertNotIncludes(collections, 'rafeeqPresentations', 'no Rafeeq presentation collection')

  const presenter = read('src/execution/rafeeq/presentContextualRecommendation.ts')
  assertIncludes(presenter, 'Does NOT override actionCode', 'does not reinterpret NBA')
  assertIncludes(presenter, 'Does NOT generate Rafeeq copy with an LLM', 'no LLM')
  assertNotIncludes(presenter, 'deriveObjectiveNextBestAction', 'does not re-derive NBA')
  assertNotIncludes(presenter, 'openai', 'no OpenAI')
  assertNotIncludes(presenter, 'generateText', 'no AI SDK generation')

  const cloud = read('src/features/digitalRafeeq/voice/cloudSpeechPlayback.ts')
  assertIncludes(cloud, "fetch('/api/tts'", 'client uses /api/tts')
  assertIncludes(cloud, 'voiceResponses', 'respects voice enabled preference')
  assertIncludes(cloud, 'voiceSpeed', 'respects speed preference')
  assertNotIncludes(cloud, 'GOOGLE_APPLICATION_CREDENTIALS', 'no Google credentials in client')
  assertNotIncludes(cloud, 'texttospeech.googleapis.com', 'client does not call Google TTS')

  const tts = read('src/server/voice/providers/GoogleTTSProvider.ts')
  assertIncludes(tts, 'prepareUrduTtsText', 'server-side Google TTS remains')

  const strip = read('src/features/digitalRafeeq/companion/RafeeqObjectiveGuidanceStrip.tsx')
  assertIncludes(strip, 'RafeeqSpeakButton', 'existing speak control')
  assertIncludes(strip, 'spokenText', 'speaks the presented text')

  const drawer = read('src/features/digitalRafeeq/voice/DigitalRafeeqVoiceDrawer.tsx')
  assertIncludes(drawer, 'RafeeqObjectiveGuidanceStrip', 'drawer presents Phase 8 recommendation')
}

console.log('▶ TASK-067 — CLOSE_LOOP stays CLOSE_LOOP; spoken text matches visual')
{
  const evaluation = evaluatePlanningObjective({
    objective: objective(),
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
    activityState: 'activity_contributes',
    objectiveKind: evaluation.objectiveKind,
    period,
    counts: {
      scheduled: 1,
      occurred: 1,
      completed: 1,
      pending: 0,
      wiPresent: 0,
      wiAbsent: 0,
      bmContributed: 0,
      bmPending: 0,
      workCompleted: 0,
      workPending: 0,
      executionsAdvanced: 0,
    },
    evidence: [
      {
        kind: 'occurrence_completed',
        sourceId: 'occ-rf-1',
        label: 'Weekly Ijtema',
        detail: 'Occurrence on 2026-08-10 completed.',
      },
    ],
    explanation: evaluation.explanation,
    evaluatedAt: now,
    objectiveEvaluation: evaluation,
  }
  const action = deriveObjectiveNextBestAction({ evaluation: derived, createdAt: now })
  assert.equal(action.code, 'CLOSE_LOOP')
  const recommendation = wrapRecommendation(
    buildObjectiveContextualRecommendation({
      action,
      evaluation: derived,
      createdAt: now,
    }),
  )
  const presented = presentContextualRecommendationForRafeeq(recommendation)
  assert.equal(presented.actionCode, 'CLOSE_LOOP')
  assert.equal(presented.actionCode, recommendation.action.code)
  assert.equal(presented.urduAction, urduForRafeeqActionCode('CLOSE_LOOP'))
  assert.equal(presented.spokenText, `${presented.urduAction} ${presented.urduWhy}`)
  assert.equal(presented.routeHint, ROUTES.ADMIN_PLANNING)
}

console.log('▶ TASK-067 — forced NBA is not remapped by Rafeeq')
{
  const evaluation = evaluatePlanningObjective({
    objective: objective(),
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
  const forced = buildObjectiveContextualRecommendation({
    action: {
      ...action,
      code: 'CLOSE_LOOP',
      reason: 'Forced',
      priority: 'low',
      routeHint: ROUTES.ADMIN_PLANNING,
    },
    evaluation: derived,
    createdAt: now,
  })
  const presented = presentContextualRecommendationForRafeeq(forced)
  assert.equal(forced.action.code, 'CLOSE_LOOP')
  assert.equal(presented.actionCode, 'CLOSE_LOOP')
  assert.ok(presented.urduAction.includes('مکمل'))
}

console.log('▶ KC-020 execution NBA Urdu remains intact')
{
  const urdu = presentNextBestActionForRafeeq({
    id: 'nba-rf-1',
    code: 'SCHEDULE_MEETING',
    executionContextId: 'exec-rf-1',
    executionType: 'phone_call',
    reason: 'Phone contact succeeded',
    priority: 'high',
    createdAt: now,
  })
  assert.equal(urdu.actionCode, 'SCHEDULE_MEETING')
  assert.ok(urdu.urdu.includes('ملاقات'))
}

console.log('✅ verify:kc-phase8-rafeeq-presentation PASS')
