/**
 * Phase 6 — TASK-050–052 actionable notifications local smoke (no live Firestore / GCP).
 * Run: npm run verify:kc-phase6-notifications
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Rukn } from '@/data/ruknMaster'
import {
  evaluateActionableNotifications,
  evaluateActionableNotificationsFromCalendar,
  isInAppNotificationEnabled,
} from '@/lib/notifications/actionableNotifications'
import { buildOccurrenceCalendar } from '@/lib/occurrence/calendar'
import {
  generateOccurrencesForProgramme,
} from '@/lib/occurrence/generateOccurrences'
import { DEFAULT_ATTENDANCE_WINDOW_SCHEDULE } from '@/lib/weeklyIjtema/attendanceWindowSchedule'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import {
  getRepositories,
  resetRepositoryProviderForTests,
} from '@/repositories/provider'
import { clearLocalProgrammesForTests } from '@/repositories/local/localProgrammeLocalRepositories'
import {
  seedLocalPlanningParentForTests,
  VERIFY_ACTIVITY_OBJECTIVE_ID,
} from '@/repositories/local/planningLocalRepositories'
import { clearLocalOccurrencesForTests } from '@/repositories/local/occurrenceLocalRepositories'
import { clearLocalPlanningForTests } from '@/repositories/local/planningLocalRepositories'
import { clearLocalResponsibilitiesForTests } from '@/repositories/local/responsibilityLocalRepositories'
import { clearLocalWorkForTests } from '@/repositories/local/workLocalRepositories'
import {
  bindUserPreferences,
  getUserPreferences,
  resetUserPreferencesForTests,
  updateNotificationPreferences,
} from '@/stores/userPreferencesStore'
import { ACTIVE_CAMPAIGN_ID } from '@/types/assignment.types'
import type { LocalProgramme } from '@/types/localProgramme.types'
import {
  buildOccurrenceGenerationKey,
  type Occurrence,
} from '@/types/occurrence.types'
import type { Unit } from '@/types/planning.types'
import {
  createResponsibilityId,
  type Responsibility,
} from '@/types/responsibility.types'
import {
  DEFAULT_USER_PREFERENCES,
  normalizeNotificationPreferences,
} from '@/types/userPreferences.types'
import { createWorkId, type Work } from '@/types/work.types'

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

function baseProgramme(
  overrides: Partial<LocalProgramme> & Pick<LocalProgramme, 'id' | 'name' | 'kind'>,
): LocalProgramme {
  return {
    objectiveId: VERIFY_ACTIVITY_OBJECTIVE_ID,
    campaignId: ACTIVE_CAMPAIGN_ID,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
    ...overrides,
  }
}

const seedRukn: Rukn = {
  id: 'R-notif-verify',
  name: 'Notification Verify Rukn',
  gender: 'Male',
  mobile: '9990004444',
  place: 'Basavakalyan',
  status: 'active',
  createdAt: now,
  updatedAt: now,
  updatedBy: 'verify',
}

const seedUnit: Unit = {
  id: 'unit-notif-verify',
  name: 'Basavakalyan',
  status: 'active',
  placeAliases: ['Basavakalyan'],
  createdAt: now,
  updatedAt: now,
  createdBy: 'verify',
  updatedBy: 'verify',
}

async function reset(): Promise<void> {
  resetRepositoryProviderForTests()
  clearLocalProgrammesForTests()
  clearLocalOccurrencesForTests()
  clearLocalPlanningForTests()
  clearLocalResponsibilitiesForTests()
  clearLocalWorkForTests()
  resetUserPreferencesForTests()
  await seedLocalPlanningParentForTests()
}

console.log('▶ architecture — derived notifications, no new collection or inbox')
{
  const collections = read('src/repositories/firestore/collections.ts')
  assertIncludes(collections, "occurrences: 'occurrences'", 'occurrences collection')
  assertIncludes(collections, "work: 'work'", 'work collection')
  assertNotIncludes(collections, 'actionableNotifications', 'no actionableNotifications collection')
  assertNotIncludes(collections, 'calendarEvents', 'no calendarEvents collection')
  assertIncludes(
    collections,
    'settingsNotificationPreferencesDocId',
    'per-user settings doc helper',
  )

  const inbox = read('src/lib/peopleLifecycle/InboxEngine.ts')
  assertNotIncludes(inbox, 'evaluateActionableNotifications', 'inbox does not consume notifications')
  assertNotIncludes(inbox, 'loadActionableNotificationsForUser', 'inbox not a notification dump')

  const routes = read('src/constants/routes.ts')
  assertNotIncludes(routes, 'RUKN_INBOX', 'no Rukn Inbox')
  assertNotIncludes(routes, 'KARKUN_INBOX', 'no Karkun Inbox')

  const evaluator = read('src/lib/notifications/actionableNotifications.ts')
  assertIncludes(evaluator, 'Does NOT persist a notification collection', 'no notif SoT')
  assertIncludes(evaluator, 'Does NOT create Occurrences', 'no occurrence create')
  assertIncludes(evaluator, 'buildOccurrenceCalendar', 'calendar integration')
  assertIncludes(evaluator, 'Does NOT create Rukn/Karkun Inbox', 'no inbox product')
}

console.log('▶ TASK-051 — SettingsRepository per-user prefs affect evaluation')
{
  await reset()
  const repos = getRepositories()
  const enabled = normalizeNotificationPreferences(
    DEFAULT_USER_PREFERENCES.notifications,
  )
  const disabled = normalizeNotificationPreferences({
    ...enabled,
    ijtemaReminders: { push: false, inApp: false },
    workReminders: { push: false, inApp: false },
  })
  assert.equal(isInAppNotificationEnabled(enabled, 'ijtemaReminders'), true)
  assert.equal(isInAppNotificationEnabled(disabled, 'ijtemaReminders'), false)

  bindUserPreferences('user-notif-a')
  updateNotificationPreferences('ijtemaReminders', { inApp: false })
  const saved = repos.settings.loadNotificationPreferences('user-notif-a')
  assert.equal(saved.ok, true)
  assert.equal(saved.data?.ijtemaReminders.inApp, false)

  bindUserPreferences('user-notif-b')
  assert.equal(getUserPreferences().notifications.ijtemaReminders.inApp, true)

  bindUserPreferences('user-notif-a')
  assert.equal(getUserPreferences().notifications.ijtemaReminders.inApp, false, 'per-user overlay')
}

console.log('▶ TASK-052 — Calendar/Occurrence integration (no Occurrence created by evaluator)')
{
  await reset()
  const repos = getRepositories()
  const programme = baseProgramme({
    id: 'prog-notif-wi',
    name: 'Weekly Ijtema',
    kind: 'weekly_ijtema',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
  })
  assert.equal((await repos.localProgramme.saveDurable(programme)).ok, true)
  const generated = await generateOccurrencesForProgramme(
    programme,
    repos.occurrence,
    DEFAULT_ATTENDANCE_WINDOW_SCHEDULE,
  )
  assert.ok(generated.created.length > 0, 'occurrences generated by existing generator')
  const beforeCount = repos.occurrence.loadAll().data?.length ?? 0

  const rows = [...(repos.occurrence.loadAll().data ?? [])]
  const sample = rows.find((row) => row.status === 'scheduled')
  assert.ok(sample, 'scheduled occurrence exists')
  const [y, m, d] = sample!.occurrenceDate.split('-').map(Number)
  const asOfDt = new Date(Date.UTC(y, m - 1, d - 1))
  const asOfDate = `${asOfDt.getUTCFullYear()}-${String(asOfDt.getUTCMonth() + 1).padStart(2, '0')}-${String(asOfDt.getUTCDate()).padStart(2, '0')}`

  const calendar = buildOccurrenceCalendar(
    rows,
    { fromDate: asOfDate, toDate: sample!.occurrenceDate, statuses: ['scheduled', 'open'] },
    new Map([[programme.id, programme.name]]),
  )
  assert.ok(calendar.some((entry) => entry.occurrenceId === sample!.id), 'calendar contains occurrence')

  const prefs = normalizeNotificationPreferences(DEFAULT_USER_PREFERENCES.notifications)
  const fromCalendar = evaluateActionableNotificationsFromCalendar({
    audience: 'administrator',
    asOfDate,
    calendar,
    programmes: [programme],
    work: [],
    preferences: prefs,
  })
  assert.ok(
    fromCalendar.some(
      (item) =>
        item.kind === 'upcoming_occurrence' &&
        item.occurrenceId === sample!.id &&
        item.actionHref.length > 0,
    ),
    'calendar upcoming is actionable',
  )

  const fromOccurrences = evaluateActionableNotifications({
    audience: 'rukn',
    ruknId: seedRukn.id,
    asOfDate,
    occurrences: rows,
    programmes: [programme],
    work: [],
    preferences: prefs,
  })
  assert.ok(
    fromOccurrences.some((item) => item.kind === 'upcoming_occurrence'),
    'occurrence path uses calendar internally',
  )

  const suppressed = evaluateActionableNotifications({
    audience: 'administrator',
    asOfDate,
    occurrences: rows,
    programmes: [programme],
    work: [],
    preferences: normalizeNotificationPreferences({
      ...prefs,
      ijtemaReminders: { push: false, inApp: false },
    }),
  })
  assert.equal(
    suppressed.filter((item) => item.kind === 'upcoming_occurrence').length,
    0,
    'ijtema preference off suppresses upcoming WI',
  )

  const afterCount = repos.occurrence.loadAll().data?.length ?? 0
  assert.equal(afterCount, beforeCount, 'evaluator did not create Occurrences')
  assert.equal(
    sample!.generationKey,
    buildOccurrenceGenerationKey(programme.id, sample!.occurrenceDate, sample!.audienceGender),
    'generationKey unchanged',
  )
}

console.log('▶ TASK-050 — Work pending/overdue is actionable and preference-gated')
{
  await reset()
  const repos = getRepositories()
  repos.rukn.saveAll([seedRukn])
  assert.equal((await repos.unit.saveDurable(seedUnit)).ok, true)
  const responsibility: Responsibility = {
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
  assert.equal((await repos.responsibility.saveDurable(responsibility)).ok, true)

  const dueToday: Work = {
    id: createWorkId(),
    title: 'Prepare attendance sheet',
    ruknId: seedRukn.id,
    unitId: seedUnit.id,
    responsibilityId: responsibility.id,
    status: 'pending',
    dueDate: '2026-08-13',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const overdue: Work = {
    ...dueToday,
    id: createWorkId(),
    title: 'Submit weekly report',
    dueDate: '2026-08-10',
  }
  const later: Work = {
    ...dueToday,
    id: createWorkId(),
    title: 'Future work',
    dueDate: '2026-08-20',
  }
  assert.equal((await repos.work.saveDurable(dueToday)).ok, true)
  assert.equal((await repos.work.saveDurable(overdue)).ok, true)
  assert.equal((await repos.work.saveDurable(later)).ok, true)

  const prefs = normalizeNotificationPreferences(DEFAULT_USER_PREFERENCES.notifications)
  const items = evaluateActionableNotifications({
    audience: 'rukn',
    ruknId: seedRukn.id,
    asOfDate: '2026-08-13',
    occurrences: [],
    programmes: [],
    work: [...(repos.work.loadAll().data ?? [])],
    preferences: prefs,
  })
  assert.ok(items.some((item) => item.kind === 'pending_work' && item.workId === dueToday.id))
  assert.ok(items.some((item) => item.kind === 'overdue_work' && item.workId === overdue.id))
  assert.ok(!items.some((item) => item.workId === later.id), 'future due date is not notified')
  assert.ok(items.every((item) => item.actionHref.length > 0), 'every item has an action')

  const off = evaluateActionableNotifications({
    audience: 'rukn',
    ruknId: seedRukn.id,
    asOfDate: '2026-08-13',
    occurrences: [],
    programmes: [],
    work: [...(repos.work.loadAll().data ?? [])],
    preferences: normalizeNotificationPreferences({
      ...prefs,
      workReminders: { push: false, inApp: false },
    }),
  })
  assert.equal(off.length, 0, 'workReminders inApp=false suppresses work notifications')
}

console.log('▶ open Occurrence on asOfDate produces attendance action')
{
  const programme = baseProgramme({
    id: 'prog-open',
    name: 'Weekly Ijtema',
    kind: 'weekly_ijtema',
  })
  const openRow: Occurrence = {
    id: 'occurrence-open-1',
    programmeId: programme.id,
    occurrenceDate: '2026-08-13',
    status: 'open',
    generationKey: buildOccurrenceGenerationKey(programme.id, '2026-08-13'),
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const prefs = normalizeNotificationPreferences(DEFAULT_USER_PREFERENCES.notifications)
  const items = evaluateActionableNotifications({
    audience: 'rukn',
    asOfDate: '2026-08-13',
    occurrences: [openRow],
    programmes: [programme],
    work: [],
    preferences: prefs,
  })
  assert.ok(
    items.some(
      (item) => item.kind === 'attendance_requirement' && item.actionHref.includes('weekly-ijtema'),
    ),
    'open occurrence deep-links to existing WI surface',
  )
}

console.log('▶ Firestore collection constants unchanged (settings docs, not a new collection)')
{
  assert.equal(FIRESTORE_COLLECTIONS.settings, 'settings')
  const rules = read('firestore.rules')
  assertIncludes(
    rules,
    "docId == 'notificationPreferences_' + request.auth.uid",
    'own-doc notification prefs rules',
  )
}

console.log('✅ verify:kc-phase6-notifications PASS')
