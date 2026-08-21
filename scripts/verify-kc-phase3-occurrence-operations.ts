/**
 * Phase 3 — History / Calendar / Notification ops + integration (BATCH-03C).
 * Run: npm run verify:kc-phase3-occurrence-operations
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildOccurrenceCalendar } from '@/lib/occurrence/calendar'
import {
  eachDateKeyInclusive,
  generateOccurrencesForProgramme,
} from '@/lib/occurrence/generateOccurrences'
import {
  listOccurrenceHistory,
  listPastOccurrenceHistory,
} from '@/lib/occurrence/history'
import {
  dispatchOccurrenceNotificationEvents,
  evaluateOccurrenceNotificationCandidates,
  mapOccurrenceToAutomationTrigger,
} from '@/lib/occurrence/notifications'
import { resolveProgrammeRecurrenceRules } from '@/lib/occurrence/recurrence'
import { DEFAULT_ATTENDANCE_WINDOW_SCHEDULE } from '@/lib/weeklyIjtema/attendanceWindowSchedule'
import {
  getRepositories,
  resetRepositoryProviderForTests,
} from '@/repositories/provider'
import { clearLocalProgrammesForTests } from '@/repositories/local/localProgrammeLocalRepositories'
import {
  seedLocalPlanningParentForTests,
  VERIFY_ACTIVITY_OBJECTIVE_ID,
  VERIFY_ACTIVITY_MANSOOBA_ID,
  VERIFY_ACTIVITY_SHOBAH_ID,
} from '@/repositories/local/planningLocalRepositories'
import { clearLocalOccurrencesForTests } from '@/repositories/local/occurrenceLocalRepositories'
import { ACTIVE_CAMPAIGN_ID } from '@/types/assignment.types'
import type { LocalProgramme } from '@/types/localProgramme.types'
import {
  buildOccurrenceGenerationKey,
  type Occurrence,
} from '@/types/occurrence.types'

const root = resolve(process.cwd())
const now = new Date().toISOString()

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

function baseProgramme(
  overrides: Partial<LocalProgramme> & Pick<LocalProgramme, 'id' | 'name' | 'kind'>,
): LocalProgramme {
  return {
    mansoobaId: VERIFY_ACTIVITY_MANSOOBA_ID,
    shobahId: VERIFY_ACTIVITY_SHOBAH_ID,
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

async function reset(): Promise<void> {
  resetRepositoryProviderForTests()
  clearLocalProgrammesForTests()
  clearLocalOccurrencesForTests()
  await seedLocalPlanningParentForTests()
}

console.log('▶ architecture chain — History/Calendar/Notifications consume Occurrence')
{
  const history = read('src/lib/occurrence/history.ts')
  const calendar = read('src/lib/occurrence/calendar.ts')
  const notifications = read('src/lib/occurrence/notifications.ts')
  assert.ok(history.includes('Canonical history = existing Occurrence'), 'history SoT')
  assert.ok(!history.includes('FIRESTORE_COLLECTIONS'), 'history no new collection')
  assert.ok(calendar.includes('derived read model'), 'calendar derived')
  assert.ok(!calendar.includes('saveDurable'), 'calendar no persistence')
  assert.ok(notifications.includes('Does NOT create Occurrences'), 'notif no create')
  assert.ok(notifications.includes('Does NOT invent a scheduler'), 'notif no scheduler')
  assert.ok(
    notifications.includes('Does NOT create Rukn') ||
      notifications.includes('no Rukn') ||
      notifications.includes('Do NOT create Rukn'),
    'documents no Rukn/Karkun inbox creation',
  )
}

console.log('▶ no second calendar/event/notification SoT collections')
{
  const collections = read('src/repositories/firestore/collections.ts')
  assert.ok(collections.includes('occurrences'), 'occurrences collection exists')
  assert.ok(!collections.includes('calendarEvents'), 'no calendarEvents collection')
  assert.ok(!collections.includes('occurrenceHistory'), 'no occurrenceHistory collection')
  assert.ok(
    !/occurrenceNotifications\s*:/.test(collections),
    'no occurrenceNotifications collection',
  )
}

console.log('▶ recurrence resolve + inclusive horizon + generationKey intact')
{
  await reset()
  const repos = getRepositories()
  const programme = baseProgramme({
    id: 'prog-ops-wi',
    name: 'WI Ops',
    kind: 'weekly_ijtema',
    startDate: '2026-08-01',
    endDate: '2026-08-16',
  })
  const saved = await repos.localProgramme.saveDurable(programme)
  assert.equal(saved.ok, true)

  const rules = resolveProgrammeRecurrenceRules(programme)
  assert.ok(rules.length > 0, 'WI recurrence resolves from schedule')

  const dates = eachDateKeyInclusive('2026-08-01', '2026-08-16')
  assert.equal(dates[0], '2026-08-01')
  assert.equal(dates[dates.length - 1], '2026-08-16')

  const first = await generateOccurrencesForProgramme(programme, repos.occurrence)
  assert.ok(first.created.length > 0, 'created occurrences')
  const keys = new Set(first.created.map((row) => row.generationKey))
  assert.equal(keys.size, first.created.length, 'unique generationKeys')

  const second = await generateOccurrencesForProgramme(programme, repos.occurrence)
  assert.equal(second.created.length, 0, 'idempotent — no duplicates')
  assert.equal(second.preserved.length, first.created.length, 'existing preserved')

  const all = repos.occurrence.loadAll()
  assert.equal(all.ok, true)
  assert.equal(all.data?.length, first.created.length)
}

console.log('▶ history reads canonical Occurrence records (no rewrite)')
{
  await reset()
  const repos = getRepositories()
  const programme = baseProgramme({
    id: 'prog-hist',
    name: 'History Prog',
    kind: 'monthly_baitul_maal',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    frequency: { cadence: 'monthly', dayOfMonth: 15 },
  })
  await repos.localProgramme.saveDurable(programme)
  await generateOccurrencesForProgramme(programme, repos.occurrence)

  const rows = [...(repos.occurrence.loadAll().data ?? [])]
  const history = listOccurrenceHistory(rows, { programmeId: programme.id })
  assert.equal(history.length, rows.length)
  assert.ok(
    history.every((row) => row.programmeId === programme.id),
    'history scoped to programme',
  )
  // Newest first
  for (let i = 1; i < history.length; i += 1) {
    assert.ok(
      history[i - 1].occurrenceDate >= history[i].occurrenceDate,
      'history sorted newest first',
    )
  }

  const past = listPastOccurrenceHistory(rows, '2026-02-16', programme.id)
  assert.ok(past.every((row) => row.occurrenceDate < '2026-02-16'))
  assert.ok(past.some((row) => row.occurrenceDate === '2026-01-15'))
  assert.ok(past.some((row) => row.occurrenceDate === '2026-02-15'))
  assert.ok(!past.some((row) => row.occurrenceDate === '2026-03-15'))

  // Closed metadata preserved when filtering
  const target = rows[0]
  const closed: Occurrence = {
    ...target,
    status: 'closed',
    updatedAt: now,
    updatedBy: 'verify',
  }
  const closedSave = await repos.occurrence.saveDurable(closed)
  assert.equal(closedSave.ok, true)
  const closedHistory = listOccurrenceHistory(
    [...(repos.occurrence.loadAll().data ?? [])],
    { statuses: ['closed'] },
  )
  assert.equal(closedHistory.length, 1)
  assert.equal(closedHistory[0].status, 'closed')
  assert.equal(closedHistory[0].generationKey, target.generationKey)
}

console.log('▶ calendar derives from Occurrence — no duplicate events')
{
  await reset()
  const repos = getRepositories()
  const programme = baseProgramme({
    id: 'prog-cal',
    name: 'Calendar Prog',
    kind: 'other',
    startDate: '2026-08-10',
    endDate: '2026-08-20',
    frequency: { cadence: 'once' },
  })
  await repos.localProgramme.saveDurable(programme)
  await generateOccurrencesForProgramme(programme, repos.occurrence)
  const rows = [...(repos.occurrence.loadAll().data ?? [])]
  const entries = buildOccurrenceCalendar(
    rows,
    { fromDate: '2026-08-01', toDate: '2026-08-31' },
    new Map([[programme.id, programme.name]]),
  )
  assert.equal(entries.length, 1)
  assert.equal(entries[0].occurrenceDate, '2026-08-10')
  assert.equal(entries[0].programmeName, 'Calendar Prog')
  assert.equal(
    entries[0].generationKey,
    buildOccurrenceGenerationKey(programme.id, '2026-08-10'),
  )
  assert.equal(entries[0].occurrenceId, rows[0].id)
}

console.log('▶ notifications consume Occurrence — do not create events')
{
  await reset()
  const repos = getRepositories()
  const programme = baseProgramme({
    id: 'prog-notif',
    name: 'Notif WI',
    kind: 'weekly_ijtema',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
  })
  await repos.localProgramme.saveDurable(programme)
  await generateOccurrencesForProgramme(
    programme,
    repos.occurrence,
    DEFAULT_ATTENDANCE_WINDOW_SCHEDULE,
  )

  const beforeCount = repos.occurrence.loadAll().data?.length ?? 0
  const rows = [...(repos.occurrence.loadAll().data ?? [])]

  // Find a scheduled occurrence and evaluate asOf = day before it
  const sample = rows.find((row) => row.status === 'scheduled')
  assert.ok(sample, 'have scheduled occurrence')
  const [y, m, d] = sample!.occurrenceDate.split('-').map(Number)
  const asOfDt = new Date(Date.UTC(y, m - 1, d - 1))
  const asOfDate = `${asOfDt.getUTCFullYear()}-${String(asOfDt.getUTCMonth() + 1).padStart(2, '0')}-${String(asOfDt.getUTCDate()).padStart(2, '0')}`

  assert.equal(
    mapOccurrenceToAutomationTrigger('upcoming_occurrence', 'weekly_ijtema'),
    'ijtema-tomorrow',
  )
  assert.equal(
    mapOccurrenceToAutomationTrigger('pending_work', 'weekly_ijtema'),
    null,
  )

  const candidates = evaluateOccurrenceNotificationCandidates({
    occurrences: rows,
    programmes: [programme],
    asOfDate,
  })
  assert.ok(
    candidates.some(
      (c) =>
        c.category === 'upcoming_occurrence' &&
        c.occurrenceId === sample!.id &&
        c.automationTrigger === 'ijtema-tomorrow',
    ),
    'upcoming maps to ijtema-tomorrow',
  )

  const dispatched = dispatchOccurrenceNotificationEvents({
    occurrences: rows,
    programmes: [programme],
    asOfDate,
  })
  assert.ok(dispatched.candidates.length > 0)
  assert.ok(dispatched.deferredCategories.includes('pending_work'))
  assert.ok(dispatched.deferredCategories.includes('overdue_work'))
  assert.ok(dispatched.deferredCategories.includes('report_requirement'))

  const afterCount = repos.occurrence.loadAll().data?.length ?? 0
  assert.equal(afterCount, beforeCount, 'notification dispatch did not create Occurrences')
}

console.log('▶ WI / BM remain separate SoTs — no participation engine')
{
  const gen = read('src/lib/occurrence/generateOccurrences.ts')
  assert.ok(
    gen.includes('Does NOT modify WI/BM SoTs'),
    'generation isolation comment',
  )
  const planning = read('src/pages/admin/AdminPlanningPage.tsx')
  assert.ok(planning.includes('buildOccurrenceCalendar'), 'planning uses calendar')
  assert.ok(planning.includes('listOccurrenceHistory'), 'planning uses history')
  assert.ok(planning.includes('نظام الاوقات'), 'schedule section is user-facing')
  assert.ok(planning.includes('repos.occurrence.loadAll'), 'loads occurrences')
  assert.ok(!planning.includes('Occurrence calendar'), 'Occurrence is not user-facing')
  assert.ok(!planning.includes('participation'), 'no participation UI')
}

console.log('✅ verify:kc-phase3-occurrence-operations PASS')
