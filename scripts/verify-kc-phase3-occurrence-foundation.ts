/**
 * Phase 3 — Occurrence foundation + recurrence local smoke (no live Firestore / GCP).
 * Run: npm run verify:kc-phase3-occurrence-foundation
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  DEFAULT_OCCURRENCE_TIMEZONE,
  parseProgrammeRecurrenceRule,
  resolveProgrammeRecurrenceRules,
  serializeProgrammeRecurrenceRule,
  weeklyRecurrenceFromAttendanceWindowSchedule,
} from '@/lib/occurrence/recurrence'
import {
  DEFAULT_ATTENDANCE_WINDOW_SCHEDULE,
  listWeeklyWindowRecurrenceDescriptors,
} from '@/lib/weeklyIjtema/attendanceWindowSchedule'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import {
  getRepositories,
  getRepositoryProviderMode,
  resetRepositoryProviderForTests,
} from '@/repositories/provider'
import { clearLocalProgrammesForTests } from '@/repositories/local/localProgrammeLocalRepositories'
import {
  seedLocalPlanningParentForTests,
  VERIFY_ACTIVITY_OBJECTIVE_ID,
} from '@/repositories/local/planningLocalRepositories'
import { clearLocalOccurrencesForTests } from '@/repositories/local/occurrenceLocalRepositories'
import { ACTIVE_CAMPAIGN_ID } from '@/types/assignment.types'
import type { LocalProgramme } from '@/types/localProgramme.types'
import {
  buildOccurrenceGenerationKey,
  createOccurrenceId,
  type Occurrence,
} from '@/types/occurrence.types'

const root = resolve(process.cwd())

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `expected ${label}: ${needle}`)
}

function assertNotIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(!haystack.includes(needle), `did not expect ${label}: ${needle}`)
}

function extractRulesBlock(rules: string, matchLine: string): string {
  const start = rules.indexOf(matchLine)
  assert.ok(start >= 0, `missing ${matchLine}`)
  const rest = rules.slice(start)
  const end = rest.indexOf('\n    }')
  return end >= 0 ? rest.slice(0, end + '\n    }'.length) : rest
}

const now = new Date().toISOString()

console.log('▶ collection constants')
{
  assert.equal(FIRESTORE_COLLECTIONS.occurrences, 'occurrences')
}

console.log('▶ Firestore rules — Admin-only occurrences')
{
  const rules = read('firestore.rules')
  const matchLine = 'match /occurrences/{docId}'
  const block = extractRulesBlock(rules, matchLine)
  assertIncludes(block, 'isAdministrator()', `${matchLine} Admin gate`)
  assertIncludes(block, 'allow delete: if false', `${matchLine} no client delete`)
  assertNotIncludes(block, 'isRukn()', `${matchLine} no Rukn access`)
}

console.log('▶ provider wiring (local + firestore; LocalProgramme injection)')
{
  const provider = read('src/repositories/provider.ts')
  assertIncludes(
    provider,
    'occurrence: new OccurrenceLocalRepository(localProgramme)',
    'local Occurrence repo',
  )
  assertIncludes(
    provider,
    'occurrence: new OccurrenceFirestoreRepository(localProgramme)',
    'firestore Occurrence repo',
  )
  assertIncludes(provider, 'getRepositoryProviderMode()', 'single mode switch')

  resetRepositoryProviderForTests()
  assert.equal(getRepositoryProviderMode(), 'local')
  const repos = getRepositories()
  assert.ok(repos.occurrence)
  assert.ok(repos.localProgramme)
}

console.log('▶ recurrence serialisation + WI schedule bridge')
{
  const weekly = serializeProgrammeRecurrenceRule({ cadence: 'weekly', dayOfWeek: 0 })
  assert.deepEqual(weekly, { cadence: 'weekly', dayOfWeek: 0 })
  assert.equal(parseProgrammeRecurrenceRule({ cadence: 'weekly', dayOfWeek: 9 }), null)
  assert.equal(DEFAULT_OCCURRENCE_TIMEZONE, 'Asia/Karachi')

  const fromSchedule = weeklyRecurrenceFromAttendanceWindowSchedule(
    DEFAULT_ATTENDANCE_WINDOW_SCHEDULE,
  )
  assert.equal(fromSchedule.length, 2)
  assert.ok(fromSchedule.some((row) => row.audienceGender === 'Female' && row.dayOfWeek === 6))
  assert.ok(fromSchedule.some((row) => row.audienceGender === 'Male' && row.dayOfWeek === 0))

  const descriptors = listWeeklyWindowRecurrenceDescriptors()
  assert.equal(descriptors.length, 2)
  assert.equal(descriptors[0]?.timezone, 'Asia/Karachi')

  const wiRules = resolveProgrammeRecurrenceRules({
    kind: 'weekly_ijtema',
    frequency: { cadence: 'once' },
  })
  assert.equal(wiRules.length, 2, 'WI prefers attendance window schedule over frequency hint')

  const monthlyRules = resolveProgrammeRecurrenceRules({
    kind: 'monthly_baitul_maal',
    frequency: { cadence: 'monthly', dayOfMonth: 1 },
  })
  assert.deepEqual(monthlyRules, [
    { cadence: 'monthly', dayOfMonth: 1, timezone: 'Asia/Karachi' },
  ])

  const empty = resolveProgrammeRecurrenceRules({ kind: 'follow_up' })
  assert.deepEqual(empty, [])
}

console.log('▶ local durable CRUD + Local Programme parent validation')
{
  resetRepositoryProviderForTests()
  clearLocalProgrammesForTests()
  clearLocalOccurrencesForTests()
  await seedLocalPlanningParentForTests()
  const repos = getRepositories()

  assert.equal(repos.occurrence.loadAll().data?.length, 0)

  const programme: LocalProgramme = {
    id: 'programme-occurrence-verify-1',
    objectiveId: VERIFY_ACTIVITY_OBJECTIVE_ID,
    campaignId: ACTIVE_CAMPAIGN_ID,
    name: 'Verify WI Programme',
    kind: 'weekly_ijtema',
    status: 'active',
    frequency: { cadence: 'weekly', dayOfWeek: 0 },
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const savedProgramme = await repos.localProgramme.saveDurable(programme)
  assert.equal(savedProgramme.ok, true)

  const occurrenceDate = '2026-08-16'
  const generationKey = buildOccurrenceGenerationKey(
    programme.id,
    occurrenceDate,
    'Male',
  )
  const occurrence: Occurrence = {
    id: createOccurrenceId(),
    programmeId: programme.id,
    occurrenceDate,
    status: 'scheduled',
    generationKey,
    title: "Men's Weekly Ijtema",
    openTime: '00:01',
    closeTime: '23:59',
    timezone: 'Asia/Karachi',
    audienceGender: 'Male',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }

  const saved = await repos.occurrence.saveDurable(occurrence)
  assert.equal(saved.ok, true)
  assert.equal(repos.occurrence.getById(occurrence.id).data?.generationKey, generationKey)
  assert.equal(repos.occurrence.listByProgrammeId(programme.id).data?.length, 1)
  assert.equal(repos.occurrence.getByGenerationKey(generationKey).data?.id, occurrence.id)
  assert.equal(repos.occurrence.loadAll().data?.length, 1)

  // Round-trip JSON serialisation (Occurrence contract)
  const roundTrip = JSON.parse(JSON.stringify(occurrence)) as Occurrence
  assert.equal(roundTrip.programmeId, programme.id)
  assert.equal(roundTrip.occurrenceDate, occurrenceDate)

  const missingParent = await repos.occurrence.saveDurable({
    ...occurrence,
    id: 'occurrence-verify-bad-empty',
    programmeId: '',
    generationKey: 'bad',
  })
  assert.equal(missingParent.ok, false)
  if (!missingParent.ok) {
    assert.equal(missingParent.error.code, 'Validation')
  }

  const unknownParent = await repos.occurrence.saveDurable({
    ...occurrence,
    id: 'occurrence-verify-bad-unknown',
    programmeId: 'programme-does-not-exist',
    generationKey: 'bad-unknown',
  })
  assert.equal(unknownParent.ok, false)
  if (!unknownParent.ok) {
    assert.equal(unknownParent.error.code, 'Validation')
  }
  assert.equal(repos.occurrence.loadAll().data?.length, 1)

  const archived = await repos.occurrence.saveDurable({
    ...occurrence,
    status: 'archived',
    updatedAt: now,
  })
  assert.equal(archived.ok, true)
  assert.equal(repos.occurrence.getById(occurrence.id).data?.status, 'archived')

  clearLocalOccurrencesForTests()
  clearLocalProgrammesForTests()
  assert.equal(repos.occurrence.loadAll().data?.length, 0)
}

console.log('▶ no delete path on Occurrence contract/impl')
{
  const iface = read('src/repositories/interfaces/OccurrenceRepository.ts')
  assertNotIncludes(iface, 'delete', 'interface has no delete')
  const localImpl = read('src/repositories/local/occurrenceLocalRepositories.ts')
  assertNotIncludes(localImpl, 'async delete', 'local has no delete')
  const firestoreImpl = read(
    'src/repositories/firestore/occurrenceFirestoreRepositories.ts',
  )
  assertNotIncludes(firestoreImpl, 'async delete', 'firestore has no delete')
}

console.log('▶ Firestore durable write pattern + soft hydrate + SoT isolation')
{
  const firestoreRepo = read(
    'src/repositories/firestore/occurrenceFirestoreRepositories.ts',
  )
  assertIncludes(firestoreRepo, 'await writeDoc(', 'await durable writeDoc')
  assertIncludes(
    firestoreRepo,
    'soft-skip ${label} (permission-denied)',
    'permission-denied soft-skip',
  )
  assertIncludes(firestoreRepo, 'programmes.getById', 'Local Programme parent lookup')
  assertNotIncludes(firestoreRepo, 'FIRESTORE_COLLECTIONS.karkuns', 'no karkun writes')
  assertNotIncludes(firestoreRepo, 'weeklyIjtemaEvent', 'no WI event collection rewrite')

  const hydrate = read('src/repositories/firestore/firestoreRepositories.ts')
  assertIncludes(hydrate, 'readOccurrenceCollectionsForClient', 'occurrence soft-read')
  assertIncludes(hydrate, 'applyOccurrenceHydrate', 'occurrence apply')

  const criticalFnStart = hydrate.indexOf('function readCriticalHydratePayload')
  const backgroundFnStart = hydrate.indexOf('function readBackgroundHydratePayload')
  assert.ok(criticalFnStart >= 0 && backgroundFnStart > criticalFnStart, 'hydrate fns present')
  const criticalBody = hydrate.slice(criticalFnStart, backgroundFnStart)
  assertNotIncludes(
    criticalBody,
    'readOccurrenceCollectionsForClient',
    'occurrences not critical',
  )

  const backgroundBody = hydrate.slice(backgroundFnStart, backgroundFnStart + 3500)
  assertIncludes(
    backgroundBody,
    'readOccurrenceCollectionsForClient()',
    'occurrences in background',
  )
}

console.log('▶ engine precursor preserved (no parallel WI generator)')
{
  const engine = read('src/lib/weeklyIjtema/attendanceWindowEngine.ts')
  assertIncludes(engine, 'getAttendanceWindowSchedule', 'engine still uses schedule')
  assertNotIncludes(engine, 'resolveProgrammeRecurrenceRules', 'engine not rewritten to occurrence module')
  assertNotIncludes(engine, 'FIRESTORE_COLLECTIONS.occurrences', 'engine does not write occurrences')

  const schedule = read('src/lib/weeklyIjtema/attendanceWindowSchedule.ts')
  assertIncludes(
    schedule,
    'listWeeklyWindowRecurrenceDescriptors',
    'schedule exports recurrence descriptors',
  )
}

console.log('verify:kc-phase3-occurrence-foundation OK')
