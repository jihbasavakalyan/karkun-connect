/**
 * Phase 8 — TASK-069 intelligent monitoring local smoke (no live Firestore / GCP).
 * Run: npm run verify:kc-phase8-intelligent-monitoring
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROUTES } from '@/constants/routes'
import {
  captureIntelligenceMonitorSnapshot,
  detectMeaningfulIntelligenceChange,
  detectMeaningfulIntelligenceChanges,
  monitorLoadedRecommendations,
  type ObjectiveContextualRecommendation,
  type ObjectiveNextBestAction,
} from '@/execution'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'

const root = resolve(process.cwd())
const now = new Date().toISOString()

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `expected ${label}: ${needle}`)
}

function assertNotIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(!haystack.includes(needle), `did not expect ${label}: ${needle}`)
}

function recommendation(
  overrides: {
    objectiveState?: ObjectiveNextBestAction['objectiveState']
    activityState?: ObjectiveNextBestAction['activityState']
    code?: ObjectiveNextBestAction['code']
    evidence?: ObjectiveContextualRecommendation['supportingEvidence']
    overdueWorkDueDate?: string
    nextOccurrenceDate?: string
    routeHint?: string
  } = {},
): ObjectiveContextualRecommendation {
  const objectiveId = 'objective-mon-1'
  const mansoobaId = 'mansooba-mon-1'
  const code = overrides.code ?? 'RECORD_IJTEMA'
  const objectiveState = overrides.objectiveState ?? 'insufficient_evidence'
  const activityState = overrides.activityState ?? 'insufficient_activity'
  const routeHint = overrides.routeHint ?? ROUTES.RUKN_WEEKLY_IJTEMA
  const action: ObjectiveNextBestAction = {
    id: `nba-objective-${objectiveId}`,
    objectiveId,
    mansoobaId,
    code,
    reason: 'verify',
    priority: code === 'NO_EVALUATION_ACTION' ? 'low' : 'medium',
    routeHint,
    objectiveState,
    activityState,
    objectiveKind: 'ijtema_participation',
    createdAt: now,
  }
  return {
    id: `rec-${action.id}`,
    objectiveId,
    mansoobaId,
    title: 'Ijtema participation',
    action,
    whyNow: 'verify',
    destination: { routeHint, label: `Act at ${routeHint}` },
    supportingEvidence: overrides.evidence ?? [],
    subjects: [],
    timing: {
      asOfDate: '2026-08-13',
      overdueWorkDueDate: overrides.overdueWorkDueDate,
      nextOccurrenceDate: overrides.nextOccurrenceDate,
    },
    organisation: { connectedKarkunCount: 0, journeyStageCounts: [] },
    explanation: 'verify',
    createdAt: now,
  }
}

console.log('▶ architecture — derived monitor, no collection, no NBA/Rafeeq/TTS')
{
  const collections = read('src/repositories/firestore/collections.ts')
  assert.equal(FIRESTORE_COLLECTIONS.objectives, 'objectives')
  assertNotIncludes(collections, 'intelligenceMonitor', 'no monitoring collection')
  assertNotIncludes(collections, 'monitoringEvents', 'no monitoring events collection')

  const monitor = read('src/execution/intelligenceMonitor.ts')
  assertIncludes(monitor, 'Does NOT persist', 'read model')
  assertIncludes(monitor, 'Does NOT send notifications', 'no second notification engine')
  assertNotIncludes(monitor, 'saveDurable', 'does not persist')
  assertNotIncludes(monitor, 'deriveObjectiveNextBestAction', 'does not re-derive NBA')
  assertNotIncludes(monitor, 'presentContextualRecommendationForRafeeq', 'does not present Rafeeq')
  assertNotIncludes(monitor, 'presentNextBestActionForRafeeq', 'does not present execution Rafeeq')
  assertNotIncludes(monitor, '/api/tts', 'does not call TTS')
  assertNotIncludes(monitor, 'speakRafeeqCloudText', 'does not speak')
  assertNotIncludes(monitor, 'openai', 'no LLM')
  assertIncludes(monitor, 'loadObjectiveContextualRecommendations', 'consumes TASK-066')
}

console.log('▶ no previous / same fingerprint → no event')
{
  const current = captureIntelligenceMonitorSnapshot(recommendation())
  assert.equal(detectMeaningfulIntelligenceChange(null, current), null)
  const again = captureIntelligenceMonitorSnapshot(recommendation({ overdueWorkDueDate: undefined }))
  assert.equal(again.fingerprint, current.fingerprint)
  assert.equal(detectMeaningfulIntelligenceChange(current, again), null)
  const repeated = detectMeaningfulIntelligenceChanges({
    previous: [current],
    current: [recommendation()],
  })
  assert.equal(repeated.length, 0)
}

console.log('▶ evaluation transitions')
{
  const fromUnknown = captureIntelligenceMonitorSnapshot(
    recommendation({ objectiveState: 'not_evaluated', code: 'NO_EVALUATION_ACTION', routeHint: undefined }),
  )
  const insufficient = captureIntelligenceMonitorSnapshot(
    recommendation({ objectiveState: 'insufficient_evidence' }),
  )
  const present = captureIntelligenceMonitorSnapshot(
    recommendation({ objectiveState: 'evidence_present' }),
  )
  const first = detectMeaningfulIntelligenceChange(fromUnknown, insufficient)
  assert.ok(first)
  assert.ok(first.kinds.includes('evaluation_state'))
  assert.ok(first.reason.includes('not_evaluated'))
  assert.ok(first.reason.includes('insufficient_evidence'))
  const second = detectMeaningfulIntelligenceChange(insufficient, present)
  assert.ok(second)
  assert.ok(second.kinds.includes('evaluation_state'))
  assert.ok(second.reason.includes('evidence_present'))
}

console.log('▶ activity contribution transition')
{
  const none = captureIntelligenceMonitorSnapshot(
    recommendation({ activityState: 'insufficient_activity' }),
  )
  const yes = captureIntelligenceMonitorSnapshot(
    recommendation({
      activityState: 'activity_contributes',
      evidence: [
        {
          kind: 'occurrence_occurred',
          sourceId: 'occ-mon-1',
          label: 'Weekly Ijtema',
          detail: 'occurred',
        },
      ],
    }),
  )
  const event = detectMeaningfulIntelligenceChange(none, yes)
  assert.ok(event)
  assert.ok(event.kinds.includes('activity_contribution'))
  assert.ok(event.reason.includes('activity_contributes'))
}

console.log('▶ NBA transition RECORD_PENDING_ACTIVITY → CLOSE_LOOP')
{
  const pending = captureIntelligenceMonitorSnapshot(
    recommendation({
      code: 'RECORD_PENDING_ACTIVITY',
      routeHint: ROUTES.RUKN,
      activityState: 'insufficient_activity',
    }),
  )
  const closed = captureIntelligenceMonitorSnapshot(
    recommendation({
      code: 'CLOSE_LOOP',
      routeHint: ROUTES.ADMIN_PLANNING,
      activityState: 'activity_contributes',
    }),
  )
  const event = detectMeaningfulIntelligenceChange(pending, closed)
  assert.ok(event)
  assert.ok(event.kinds.includes('nba'))
  assert.equal(event.nbaCode, 'CLOSE_LOOP')
  assert.equal(event.actionable, true)
  assert.equal(event.changeId, `${closed.objectiveId}:${pending.fingerprint}->${closed.fingerprint}`)
}

console.log('▶ recommendation context change without NBA change')
{
  const before = captureIntelligenceMonitorSnapshot(recommendation())
  const after = captureIntelligenceMonitorSnapshot(
    recommendation({ nextOccurrenceDate: '2026-08-16' }),
  )
  const event = detectMeaningfulIntelligenceChange(before, after)
  assert.ok(event)
  assert.ok(event.kinds.includes('recommendation_context'))
  assert.equal(event.nbaCode, 'RECORD_IJTEMA')
  assert.equal(before.nbaCode, after.nbaCode)
}

console.log('▶ stable fingerprint ignores createdAt prose')
{
  const first = captureIntelligenceMonitorSnapshot(recommendation())
  const second = captureIntelligenceMonitorSnapshot(recommendation())
  assert.equal(first.fingerprint, second.fingerprint)
  assert.equal(first.fingerprint.includes(now), false)
}

console.log('▶ monitorLoadedRecommendations is a read of existing recommendations')
{
  const { snapshots, events } = monitorLoadedRecommendations([])
  assert.ok(Array.isArray(snapshots))
  assert.equal(events.length, 0)
  const again = monitorLoadedRecommendations(snapshots)
  assert.equal(again.events.length, 0)
}

console.log('✅ verify:kc-phase8-intelligent-monitoring PASS')
