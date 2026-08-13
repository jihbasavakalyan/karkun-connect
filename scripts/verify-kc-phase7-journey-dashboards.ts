/**
 * Phase 7 — TASK-054–056 journey dashboards local smoke (no live Firestore / GCP).
 * Run: npm run verify:kc-phase7-journey-dashboards
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROUTES, adminAssignmentsPath } from '@/constants/routes'
import type { Rukn } from '@/data/ruknMaster'
import {
  CONTINUOUS_JOURNEY_STAGE_ORDER,
  hasContinuousDevelopmentSignal,
  resolveContinuousKarkunJourney,
  snapshotFromContinuousSignals,
} from '@/lib/journey/continuousKarkunJourney'
import { buildAdminAttentionRequired } from '@/lib/missionControl/adminCommandCenterWorkflow'
import { buildRuknNowActions } from '@/lib/rukn/ruknActionDashboard'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import {
  getRepositories,
  resetRepositoryProviderForTests,
} from '@/repositories/provider'
import { clearLocalPlanningForTests } from '@/repositories/local/planningLocalRepositories'
import { clearLocalResponsibilitiesForTests } from '@/repositories/local/responsibilityLocalRepositories'
import { clearLocalWorkForTests } from '@/repositories/local/workLocalRepositories'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { Unit } from '@/types/planning.types'
import { createResponsibilityId, type Responsibility } from '@/types/responsibility.types'
import { createWorkId, type Work } from '@/types/work.types'

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

function karkun(overrides: Partial<KarkunRegistryRecord> = {}): KarkunRegistryRecord {
  return {
    id: 'kr-phase7-journey',
    name: 'Journey Verify Karkun',
    gender: 'Male',
    mobile: '9990007001',
    place: 'Basavakalyan',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    updatedBy: 'verify',
    address: '',
    area: '',
    assignedRukn: '',
    assignedRuknId: '',
    assignmentStatus: 'Assigned',
    campaignStatus: 'active',
    visitStatus: 'pending',
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: '',
    isArchived: false,
    ...overrides,
  }
}

const seedRukn: Rukn = {
  id: 'R-phase7-verify',
  name: 'Phase 7 Verify Rukn',
  gender: 'Male',
  mobile: '9990007002',
  place: 'Basavakalyan',
  status: 'active',
  createdAt: now,
  updatedAt: now,
  updatedBy: 'verify',
}

const seedUnit: Unit = {
  id: 'unit-phase7-verify',
  name: 'Basavakalyan',
  status: 'active',
  placeAliases: ['Basavakalyan'],
  createdAt: now,
  updatedAt: now,
  createdBy: 'verify',
  updatedBy: 'verify',
}

async function resetAndSeedParents(ruknId = seedRukn.id): Promise<void> {
  resetRepositoryProviderForTests()
  clearLocalPlanningForTests()
  clearLocalResponsibilitiesForTests()
  clearLocalWorkForTests()
  const repos = getRepositories()
  repos.rukn.saveAll([{ ...seedRukn, id: ruknId }])
  assert.equal((await repos.unit.saveDurable(seedUnit)).ok, true)
}

console.log('▶ architecture — derived journey/attention, no new SoT')
{
  const collections = read('src/repositories/firestore/collections.ts')
  assert.equal(FIRESTORE_COLLECTIONS.work, 'work')
  assert.equal(FIRESTORE_COLLECTIONS.responsibilities, 'responsibilities')
  assert.equal(FIRESTORE_COLLECTIONS.connections, 'connections')
  assert.equal(FIRESTORE_COLLECTIONS.karkuns, 'karkuns')
  assert.equal(FIRESTORE_COLLECTIONS.rukns, 'rukns')
  assertNotIncludes(collections, 'continuousJourney', 'no continuousJourney collection')
  assertNotIncludes(collections, 'attentionRequired', 'no attention collection')
  assertNotIncludes(collections, "journeys: 'journeys'", 'no journeys collection')

  const journey = read('src/lib/journey/continuousKarkunJourney.ts')
  assertIncludes(journey, 'Does NOT persist a journey entity', 'journey is a read model')
  assertIncludes(journey, 'Connection → Development → Participation → Responsibility → Leadership', 'frozen journey')
  assert.equal(CONTINUOUS_JOURNEY_STAGE_ORDER.join(','), 'connection,development,participation,responsibility,leadership')

  const attention = read('src/lib/missionControl/adminCommandCenterWorkflow.ts')
  assertIncludes(attention, "id: 'overdue-work'", 'overdue work attention')
  assertIncludes(attention, 'ADMIN_PLANNING', 'overdue work destination')
  assertIncludes(attention, "id: 'connection-without-development'", 'connection without development')
  assertIncludes(attention, 'adminAssignmentsPath()', 'assignments destination')
  assertNotIncludes(attention, 'InboxEngine', 'attention does not duplicate Inbox')
  assertNotIncludes(attention, 'evaluateActionableNotifications', 'attention does not duplicate notifications')

  const ruknActions = read('src/lib/rukn/ruknActionDashboard.ts')
  assertNotIncludes(ruknActions, 'listRuknWorkActionItems', 'now-actions omit Work SoT')
  assertNotIncludes(ruknActions, 'evaluateActionableNotifications', 'now-actions omit notifications')
  assertIncludes(ruknActions, 'buildTodaysFocusItems', 'reuses follow-up focus')
}

console.log('▶ TASK-056 — continuous journey mapping from existing signals')
{
  const none = snapshotFromContinuousSignals({
    connection: false,
    development: false,
    participation: false,
    responsibility: false,
    leadership: false,
  })
  assert.equal(none.currentStage, 'connection')
  assert.equal(none.completedCount, 0)

  const connected = snapshotFromContinuousSignals({
    connection: true,
    development: false,
    participation: false,
    responsibility: false,
    leadership: false,
  })
  assert.equal(connected.currentStage, 'development')
  assert.equal(connected.completedCount, 1)

  const developing = snapshotFromContinuousSignals({
    connection: true,
    development: true,
    participation: false,
    responsibility: false,
    leadership: false,
  })
  assert.equal(developing.currentStage, 'participation')

  const participating = snapshotFromContinuousSignals({
    connection: true,
    development: true,
    participation: true,
    responsibility: false,
    leadership: false,
  })
  assert.equal(participating.currentStage, 'responsibility')

  const responsible = snapshotFromContinuousSignals({
    connection: true,
    development: true,
    participation: true,
    responsibility: true,
    leadership: false,
  })
  assert.equal(responsible.currentStage, 'leadership')
  assert.equal(responsible.steps.find((step) => step.id === 'leadership')?.complete, false)

  const leading = snapshotFromContinuousSignals({
    connection: true,
    development: true,
    participation: true,
    responsibility: true,
    leadership: true,
  })
  assert.equal(leading.currentStage, 'leadership')
  assert.equal(leading.completedCount, 5)
  assert.ok(leading.steps.every((step) => step.complete))

  const pendingVisit = karkun({ visitStatus: 'pending' })
  assert.equal(hasContinuousDevelopmentSignal(pendingVisit, 'asg-1'), false)
  const visited = karkun({ visitStatus: 'completed' })
  assert.equal(hasContinuousDevelopmentSignal(visited, 'asg-1'), true)
  const jih = karkun({ jihAppRegistrationStatus: 'Registered' })
  assert.equal(hasContinuousDevelopmentSignal(jih, 'asg-1'), true)

  const unresolved = resolveContinuousKarkunJourney({
    karkun: pendingVisit,
    assignmentId: 'asg-1',
    asOfDate,
    responsibilities: [],
    connectedKarkunCount: 0,
  })
  assert.equal(unresolved.currentStage, 'development')
  assert.equal(unresolved.signals.connection, true)
  assert.equal(unresolved.signals.development, false)

  const unassigned = resolveContinuousKarkunJourney({
    karkun: pendingVisit,
    asOfDate,
    responsibilities: [],
    connectedKarkunCount: 0,
  })
  assert.equal(unassigned.currentStage, 'connection')
}

console.log('▶ TASK-054 — Admin Attention Required uses existing destinations')
{
  await resetAndSeedParents()
  const repos = getRepositories()
  const overdue: Work = {
    id: createWorkId(),
    title: 'Overdue planning work',
    ruknId: seedRukn.id,
    unitId: seedUnit.id,
    status: 'pending',
    dueDate: '2020-01-01',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const future: Work = {
    ...overdue,
    id: createWorkId(),
    title: 'Future work',
    dueDate: '2099-01-01',
  }
  assert.equal((await repos.work.saveDurable(overdue)).ok, true)
  assert.equal((await repos.work.saveDurable(future)).ok, true)

  const items = buildAdminAttentionRequired()
  assert.ok(items.every((item) => item.route.length > 0), 'every attention item has a destination')
  const overdueItem = items.find((item) => item.id === 'overdue-work')
  assert.ok(overdueItem, 'overdue work is surfaced')
  assert.equal(overdueItem?.route, ROUTES.ADMIN_PLANNING)
  assert.equal(overdueItem?.count, 1, 'future due dates are not attention items')

  const withoutDevelopment = items.find((item) => item.id === 'connection-without-development')
  if (withoutDevelopment) {
    assert.equal(withoutDevelopment.route, adminAssignmentsPath())
  }

  assert.ok(!items.some((item) => item.id.includes('inbox')), 'does not copy Inbox')
  assert.ok(!items.some((item) => item.route === ROUTES.ADMIN_INBOX), 'does not deep-link Inbox as attention SoT')
}

console.log('▶ TASK-055 — Rukn now-actions reuse existing records and destinations')
{
  const ruknId = 'R-phase7-action-verify'
  await resetAndSeedParents(ruknId)
  const repos = getRepositories()
  const responsibility: Responsibility = {
    id: createResponsibilityId(),
    ruknId,
    nature: 'Weekly Ijtema in-charge',
    unitId: seedUnit.id,
    startDate: '2026-01-01',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  assert.equal((await repos.responsibility.saveDurable(responsibility)).ok, true)

  const items = buildRuknNowActions(ruknId, asOfDate)
  assert.ok(items.length <= 8, 'capped action list')
  assert.ok(items.every((item) => item.href.length > 0), 'every action has a destination')
  assert.ok(!items.some((item) => item.id.startsWith('work:')), 'does not duplicate Work records')
  assert.ok(
    items.some((item) => item.id === `responsibility:${responsibility.id}`),
    'in-force responsibility is actionable',
  )
  assert.equal(items.find((item) => item.source === 'responsibility')?.href, ROUTES.RUKN)
}

console.log('▶ UI wiring — existing Admin/Rukn/Person surfaces, campaign journey kept')
{
  const home = read('src/pages/rukn/RuknHomePage.tsx')
  assertIncludes(home, 'RuknActionDashboardPanel', 'Rukn action dashboard on Home')
  assertIncludes(home, 'RuknWorkActionPanel', 'Work panel retained')
  assertIncludes(home, 'ActionableNotificationsPanel', 'Phase 6 notifications retained')
  assertIncludes(home, 'RuknMessageAdminPanel', 'Phase 6 message Admin retained')
  assertIncludes(home, 'ContinuousJourneyCountsStrip', 'journey counts on Home')
  assertIncludes(home, 'What needs my action?', 'action question')

  const connection = read('src/pages/rukn/ConnectionJourneyPage.tsx')
  assertIncludes(connection, 'ConnectionProgressTracker', 'campaign journey tracker kept')
  assertIncludes(connection, 'ContinuousKarkunJourneyStrip', 'continuous journey strip added')

  const person360 = read('src/components/personProfile/Person360Overview.tsx')
  assertIncludes(person360, 'Campaign Journey', 'campaign journey kept')
  assertIncludes(person360, 'ContinuousKarkunJourneyStrip', 'continuous journey on 360')

  const commandCenter = read('src/components/mission-control/AdminCommandCenter.tsx')
  assertIncludes(commandCenter, 'AttentionRequiredPanel', 'existing attention panel reused')
  assertIncludes(commandCenter, 'buildAdminAttentionRequired', 'attention builder reused')

  const inbox = read('src/lib/peopleLifecycle/InboxEngine.ts')
  assertIncludes(inbox, 'Admin Inbox', 'Phase 6 inbox intact')
}

console.log('✅ verify:kc-phase7-journey-dashboards PASS')
