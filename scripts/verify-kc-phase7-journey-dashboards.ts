/**
 * Phase 7 — TASK-054–061 journey dashboards local smoke (no live Firestore / GCP).
 * Run: npm run verify:kc-phase7-journey-dashboards
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROUTES, adminAssignmentsPath, adminWeeklyIjtemaPath, ruknVisitPath } from '@/constants/routes'
import type { Rukn } from '@/data/ruknMaster'
import {
  CONTINUOUS_JOURNEY_STAGE_ORDER,
  countContinuousJourneyByStage,
  hasContinuousDevelopmentSignal,
  resolveContinuousKarkunJourney,
  resolveDevelopmentAction,
  resolveJourneyFollowUp,
  resolveJourneyResponsibilities,
  snapshotFromContinuousSignals,
} from '@/lib/journey/continuousKarkunJourney'
import { isResponsibilityInForce } from '@/lib/responsibility/tenure'
import { buildAdminAttentionRequired } from '@/lib/missionControl/adminCommandCenterWorkflow'
import { buildAdminOrganisationalPicture } from '@/lib/missionControl/adminOrganisationalPicture'
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
  assertNotIncludes(collections, 'developmentActions', 'no developmentActions collection')
  assertNotIncludes(collections, 'journeyFollowUps', 'no journeyFollowUps collection')
  assertNotIncludes(collections, 'organisationalPicture', 'no organisationalPicture collection')
  assertNotIncludes(collections, 'exceptions', 'no exceptions collection')
  assertNotIncludes(collections, 'attentionRecords', 'no attentionRecords collection')

  const journey = read('src/lib/journey/continuousKarkunJourney.ts')
  assertIncludes(journey, 'Does NOT persist a journey entity', 'journey is a read model')
  assertIncludes(journey, 'Connection → Development → Participation → Responsibility → Leadership', 'frozen journey')
  assertIncludes(journey, 'isResponsibilityInForce', 'responsibility uses Phase 4 in-force matching')
  assertIncludes(journey, 'getActiveFollowUpForKarkun', 'follow-up reads existing follow-up records')
  assertNotIncludes(journey, 'saveDurable', 'journey selectors do not persist')
  assertNotIncludes(journey, 'evaluateActionableNotifications', 'journey does not duplicate notifications')
  assert.equal(CONTINUOUS_JOURNEY_STAGE_ORDER.join(','), 'connection,development,participation,responsibility,leadership')

  const attention = read('src/lib/missionControl/adminCommandCenterWorkflow.ts')
  assertIncludes(attention, "id: 'overdue-work'", 'overdue work attention')
  assertIncludes(attention, 'ADMIN_PLANNING', 'overdue work destination')
  assertIncludes(attention, "id: 'connection-without-development'", 'connection without development')
  assertIncludes(attention, "id: 'developed-without-participation'", 'developed without participation')
  assertIncludes(attention, "id: 'work-without-in-force-responsibility'", 'unactionable work exception')
  assertIncludes(attention, 'canActOnWork', 'reuses Phase 4 work permission')
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

  const strip = read('src/components/journey/ContinuousKarkunJourneyStrip.tsx')
  assertIncludes(strip, 'Development action', 'development action on strip')
  assertIncludes(strip, 'Follow-up', 'follow-up on strip')
  assertIncludes(strip, 'Responsibility', 'responsibility visibility on strip')
  assertIncludes(strip, 'to={action.href}', 'actions deep-link to existing surfaces')

  const pictureHelper = read('src/lib/missionControl/adminOrganisationalPicture.ts')
  assertIncludes(pictureHelper, 'Open work', 'open work remains in internal picture helper')
  assertIncludes(pictureHelper, 'buildAdminOrganisationalPicture', 'picture builder retained')
  const commandCenter = read('src/components/mission-control/AdminCommandCenter.tsx')
  assertNotIncludes(commandCenter, 'OrganisationalPicturePanel', 'picture panel retired from Dashboard presentation')
  assertNotIncludes(commandCenter, 'Open work', 'Open work not user-facing on Dashboard')

  const inbox = read('src/lib/peopleLifecycle/InboxEngine.ts')
  assertIncludes(inbox, 'Admin Inbox', 'Phase 6 inbox intact')
}

console.log('▶ TASK-057 — development actions from existing visit / JIH / orientation signals')
{
  const pendingVisit = karkun({ visitStatus: 'pending' })
  assert.equal(resolveDevelopmentAction(pendingVisit), null, 'no development action without connection')
  const visitAction = resolveDevelopmentAction(pendingVisit, 'asg-1')
  assert.equal(visitAction?.kind, 'visit')
  assert.equal(visitAction?.href, ruknVisitPath(pendingVisit.id))

  const visited = karkun({ visitStatus: 'completed', jihAppRegistrationStatus: 'Not Discussed' })
  const jihAction = resolveDevelopmentAction(visited, 'asg-1')
  assert.equal(jihAction?.kind, 'jih-registration')
  assert.equal(jihAction?.href, ruknVisitPath(visited.id))

  const registered = karkun({
    visitStatus: 'completed',
    jihAppRegistrationStatus: 'Registered',
  })
  const orientationAction = resolveDevelopmentAction(registered, 'asg-1')
  assert.equal(orientationAction?.kind, 'orientation')

  const snapshot = resolveContinuousKarkunJourney({
    karkun: pendingVisit,
    assignmentId: 'asg-1',
    asOfDate,
    responsibilities: [],
    connectedKarkunCount: 0,
  })
  assert.equal(snapshot.developmentAction?.kind, 'visit')
  assert.equal(snapshot.followUp, null, 'development action is not duplicated as a follow-up')
}

console.log('▶ TASK-058 — follow-ups derived from existing records, not a second Work system')
{
  const person = karkun({ visitStatus: 'completed', jihAppRegistrationStatus: 'Registered' })
  const scheduled = resolveJourneyFollowUp({
    karkun: person,
    assignmentId: 'asg-1',
    asOfDate,
    pendingFollowUp: {
      followUpId: 'fu-phase7-1',
      purpose: 'Call after visit',
      followUpDate: '2026-08-14',
    },
    workRows: [],
    occurrences: [],
    programmes: [],
    responsibilityUnitIds: [],
    developmentAction: resolveDevelopmentAction(person, 'asg-1'),
    hasDevelopment: true,
  })
  assert.equal(scheduled?.kind, 'follow-up-record')
  assert.equal(scheduled?.href, ruknVisitPath(person.id))
  assert.equal(scheduled?.id, 'follow-up:fu-phase7-1')

  const openWork: Work = {
    id: createWorkId(),
    title: 'Prepare Ijtema list',
    ruknId: person.id,
    unitId: seedUnit.id,
    status: 'pending',
    dueDate: '2026-08-10',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const workFollowUp = resolveJourneyFollowUp({
    karkun: person,
    assignmentId: 'asg-1',
    asOfDate,
    workRows: [openWork],
    occurrences: [],
    programmes: [],
    responsibilityUnitIds: [],
    developmentAction: null,
    hasDevelopment: true,
  })
  assert.equal(workFollowUp?.kind, 'work')
  assert.equal(workFollowUp?.href, ROUTES.RUKN)
  assert.equal(workFollowUp?.id, `follow-up:work:${openWork.id}`)

  const occurrenceFollowUp = resolveJourneyFollowUp({
    karkun: person,
    assignmentId: 'asg-1',
    asOfDate,
    workRows: [],
    occurrences: [
      {
        id: 'occ-phase7-1',
        programmeId: 'prog-phase7-1',
        occurrenceDate: asOfDate,
        status: 'open',
        title: 'Weekly Ijtema',
      },
    ],
    programmes: [
      {
        id: 'prog-phase7-1',
        name: 'Weekly Ijtema',
        kind: 'weekly_ijtema',
        unitId: seedUnit.id,
      },
    ],
    responsibilityUnitIds: [seedUnit.id],
    developmentAction: null,
    hasDevelopment: true,
  })
  assert.equal(occurrenceFollowUp?.kind, 'occurrence')
  assert.equal(occurrenceFollowUp?.href, ROUTES.RUKN_WEEKLY_IJTEMA)

  const withFollowUp = resolveContinuousKarkunJourney({
    karkun: person,
    assignmentId: 'asg-1',
    asOfDate,
    responsibilities: [],
    connectedKarkunCount: 0,
    pendingFollowUp: {
      followUpId: 'fu-phase7-2',
      purpose: 'Reconnect',
      followUpDate: asOfDate,
    },
  })
  assert.ok(withFollowUp.developmentAction, 'development action remains')
  assert.equal(withFollowUp.followUp?.kind, 'follow-up-record')
  assert.notEqual(withFollowUp.followUp?.id, withFollowUp.developmentAction?.id)
}

console.log('▶ TASK-059 — responsibility visibility reads Phase 4 in-force matching')
{
  const person = karkun({ id: 'kr-phase7-responsibility' })
  const inForce: Responsibility = {
    id: createResponsibilityId(),
    ruknId: person.id,
    nature: 'Weekly Ijtema in-charge',
    unitId: seedUnit.id,
    startDate: '2026-01-01',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const expired: Responsibility = {
    ...inForce,
    id: createResponsibilityId(),
    nature: 'Past orientation lead',
    endDate: '2026-07-01',
  }
  const relatedWork: Work = {
    id: createWorkId(),
    title: 'Confirm attendance window',
    ruknId: person.id,
    unitId: seedUnit.id,
    responsibilityId: inForce.id,
    status: 'pending',
    dueDate: asOfDate,
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  assert.equal(isResponsibilityInForce(inForce, asOfDate), true)
  assert.equal(isResponsibilityInForce(expired, asOfDate), false)

  const rows = resolveJourneyResponsibilities(
    person.id,
    [inForce, expired],
    [seedUnit],
    [relatedWork],
    asOfDate,
  )
  assert.equal(rows.length, 2)
  assert.equal(rows[0]?.id, inForce.id)
  assert.equal(rows[0]?.inForce, true)
  assert.equal(rows[0]?.unitName, seedUnit.name)
  assert.equal(rows[0]?.tenureLabel, 'Since 2026-01-01')
  assert.equal(rows[0]?.relatedWorkTitle, relatedWork.title)
  assert.equal(rows[0]?.href, ROUTES.RUKN)
  assert.equal(rows[1]?.inForce, false)
  assert.equal(rows[1]?.tenureLabel, '2026-01-01 – 2026-07-01')

  const snapshot = resolveContinuousKarkunJourney({
    karkun: person,
    assignmentId: 'asg-1',
    asOfDate,
    responsibilities: [inForce],
    connectedKarkunCount: 0,
    units: [seedUnit],
    workRows: [relatedWork],
  })
  assert.equal(snapshot.responsibilities[0]?.nature, 'Weekly Ijtema in-charge')
  assert.equal(snapshot.responsibilities[0]?.relatedWorkTitle, 'Confirm attendance window')
}

console.log('▶ TASK-060 — organisational picture is a derived read model')
{
  await resetAndSeedParents()
  const pictureSrc = read('src/lib/missionControl/adminOrganisationalPicture.ts')
  assertIncludes(pictureSrc, 'Does NOT persist a picture', 'picture is a read model')
  assertNotIncludes(pictureSrc, 'saveDurable', 'picture selectors do not persist')
  assertNotIncludes(pictureSrc, 'evaluateActionableNotifications', 'picture does not duplicate notifications')
  assert.equal(countContinuousJourneyByStage(asOfDate).length, 5, 'all five journey stages listed')

  const picture = buildAdminOrganisationalPicture(asOfDate)
  assert.equal(picture.journey.length, 5)
  assert.deepEqual(
    picture.journey.map((cell) => cell.id),
    [
      'journey:connection',
      'journey:development',
      'journey:participation',
      'journey:responsibility',
      'journey:leadership',
    ],
  )
  assert.ok(picture.journey.every((cell) => cell.route.length > 0), 'journey cells deep-link')
  assert.ok(picture.operations.every((cell) => cell.route.length > 0), 'operation cells deep-link')
  assert.ok(picture.operations.some((cell) => cell.id === 'connected'))
  assert.ok(picture.operations.some((cell) => cell.id === 'in-force-responsibility'))
  assert.ok(picture.operations.some((cell) => cell.id === 'open-work'))
  assert.ok(picture.operations.some((cell) => cell.id === 'open-occurrences'))
  assert.equal(picture.operations.find((cell) => cell.id === 'open-work')?.route, ROUTES.ADMIN_PLANNING)
  assert.equal(picture.operations.find((cell) => cell.id === 'in-force-responsibility')?.count, 0)
}

console.log('▶ TASK-061 — exceptions reuse Attention Required without a new entity')
{
  await resetAndSeedParents()
  const repos = getRepositories()
  const inForce: Responsibility = {
    id: createResponsibilityId(),
    ruknId: seedRukn.id,
    nature: 'Weekly Ijtema in-charge',
    unitId: seedUnit.id,
    startDate: '2026-01-01',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  assert.equal((await repos.responsibility.saveDurable(inForce)).ok, true)

  const actionable: Work = {
    id: createWorkId(),
    title: 'Actionable planning work',
    ruknId: seedRukn.id,
    unitId: seedUnit.id,
    responsibilityId: inForce.id,
    status: 'pending',
    dueDate: '2099-01-01',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const blocked: Work = {
    id: createWorkId(),
    title: 'Work missing responsibility',
    ruknId: seedRukn.id,
    unitId: seedUnit.id,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  assert.equal((await repos.work.saveDurable(actionable)).ok, true)
  assert.equal((await repos.work.saveDurable(blocked)).ok, true)

  const items = buildAdminAttentionRequired()
  const overdueIds = items.filter((item) => item.id === 'overdue-work')
  assert.equal(overdueIds.length, 0, 'future/undated work is not overdue')
  const blockedItem = items.find((item) => item.id === 'work-without-in-force-responsibility')
  assert.ok(blockedItem, 'unactionable work is an exception')
  assert.equal(blockedItem?.count, 1, 'in-force work is not an exception')
  assert.equal(blockedItem?.route, ROUTES.ADMIN_PLANNING)
  assert.ok((blockedItem?.description ?? '').length > 0, 'exception has a reason')
  assert.equal(blockedItem?.tone, 'critical')

  const participationItem = items.find((item) => item.id === 'developed-without-participation')
  if (participationItem) {
    assert.equal(participationItem.route, adminWeeklyIjtemaPath())
    assert.ok(participationItem.description.includes('participation'))
  }

  assert.ok(!items.some((item) => item.id.includes('inbox')), 'does not copy Inbox')
  assert.equal(items.filter((item) => item.id === 'overdue-work').length <= 1, true)

  const picture = buildAdminOrganisationalPicture(asOfDate)
  assert.equal(picture.operations.find((cell) => cell.id === 'open-work')?.count, 2)
  assert.equal(picture.operations.find((cell) => cell.id === 'in-force-responsibility')?.count, 1)
}

console.log('✅ verify:kc-phase7-journey-dashboards PASS')
