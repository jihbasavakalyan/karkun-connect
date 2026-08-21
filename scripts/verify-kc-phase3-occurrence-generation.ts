/**
 * Phase 3 — Automatic Occurrence generation local smoke (TASK-023).
 * Run: npm run verify:kc-phase3-occurrence-generation
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  eachDateKeyInclusive,
  generateOccurrencesForProgramme,
  generateOccurrencesForProgrammes,
  occurrenceIdForGenerationKey,
} from '@/lib/occurrence/generateOccurrences'
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

console.log('▶ docs — approved horizon recorded')
{
  const gate = read('docs/architecture/kc-phase3-occurrence-foundation-arch009-gate.md')
  assert.ok(gate.includes('startDate` → `endDate`'), 'horizon start→end recorded')
  assert.ok(gate.includes('inclusive'), 'inclusive horizon')
  assert.ok(gate.includes('Rolling N-day horizon'), 'rejects rolling horizon')
  assert.ok(gate.includes('Same-day-only generic generation'), 'rejects same-day-only')
  assert.ok(
    gate.includes('does not** define the generic Occurrence generation horizon') ||
      gate.includes('does not define the generic Occurrence generation horizon'),
    'WI engine not generic horizon',
  )
}

console.log('▶ empty programme set is safe')
{
  await reset()
  const repos = getRepositories()
  const result = await generateOccurrencesForProgrammes([], repos.occurrence)
  assert.equal(result.examined, 0)
  assert.equal(result.created.length, 0)
  assert.equal(result.preserved.length, 0)
  assert.equal(repos.occurrence.loadAll().data?.length, 0)
}

console.log('▶ weekly_ijtema uses WI schedule within startDate–endDate')
{
  await reset()
  const repos = getRepositories()
  // 2026-08-01 Saturday … 2026-08-16 Sunday → Female Sat x3, Male Sun x3 (default WI schedule)
  const programme = baseProgramme({
    id: 'programme-gen-wi',
    name: 'WI Gen',
    kind: 'weekly_ijtema',
    startDate: '2026-08-01',
    endDate: '2026-08-16',
    frequency: { cadence: 'once' }, // ignored for weekly_ijtema — schedule wins
  })
  assert.equal((await repos.localProgramme.saveDurable(programme)).ok, true)

  const rules = resolveProgrammeRecurrenceRules(
    programme,
    DEFAULT_ATTENDANCE_WINDOW_SCHEDULE,
  )
  assert.equal(rules.length, 2)
  assert.ok(rules.every((row) => row.cadence === 'weekly'))

  const first = await generateOccurrencesForProgramme(programme, repos.occurrence)
  assert.equal(first.skippedProgrammes.length, 0, JSON.stringify(first.skippedProgrammes))
  assert.equal(first.created.length, 6)

  const dates = first.created.map((row) => row.occurrenceDate).sort()
  assert.deepEqual(dates, [
    '2026-08-01', // Sat Female
    '2026-08-02', // Sun Male
    '2026-08-08',
    '2026-08-09',
    '2026-08-15',
    '2026-08-16',
  ])
  assert.ok(first.created.every((row) => row.occurrenceDate >= '2026-08-01'))
  assert.ok(first.created.every((row) => row.occurrenceDate <= '2026-08-16'))
  assert.ok(first.created.some((row) => row.audienceGender === 'Female'))
  assert.ok(first.created.some((row) => row.audienceGender === 'Male'))

  // Deterministic generationKey
  const maleKey = buildOccurrenceGenerationKey(programme.id, '2026-08-02', 'Male')
  assert.equal(
    first.created.find((row) => row.occurrenceDate === '2026-08-02' && row.audienceGender === 'Male')
      ?.generationKey,
    maleKey,
  )
  assert.equal(
    occurrenceIdForGenerationKey(maleKey),
    first.created.find((row) => row.generationKey === maleKey)?.id,
  )
}

console.log('▶ monthly respects horizon')
{
  await reset()
  const repos = getRepositories()
  const programme = baseProgramme({
    id: 'programme-gen-monthly',
    name: 'Monthly Gen',
    kind: 'monthly_baitul_maal',
    startDate: '2026-08-01',
    endDate: '2026-10-31',
    frequency: { cadence: 'monthly', dayOfMonth: 15 },
  })
  assert.equal((await repos.localProgramme.saveDurable(programme)).ok, true)
  const result = await generateOccurrencesForProgramme(programme, repos.occurrence)
  assert.equal(result.created.length, 3)
  assert.deepEqual(
    result.created.map((row) => row.occurrenceDate).sort(),
    ['2026-08-15', '2026-09-15', '2026-10-15'],
  )
}

console.log('▶ once generates only startDate within horizon')
{
  await reset()
  const repos = getRepositories()
  const programme = baseProgramme({
    id: 'programme-gen-once',
    name: 'Once Gen',
    kind: 'campaign_execution',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    frequency: { cadence: 'once' },
  })
  assert.equal((await repos.localProgramme.saveDurable(programme)).ok, true)
  const result = await generateOccurrencesForProgramme(programme, repos.occurrence)
  assert.equal(result.created.length, 1)
  assert.equal(result.created[0]?.occurrenceDate, '2026-09-01')
  assert.equal(
    result.created[0]?.generationKey,
    buildOccurrenceGenerationKey(programme.id, '2026-09-01'),
  )
}

console.log('▶ custom respects horizon (not date-generative; observable skip)')
{
  await reset()
  const repos = getRepositories()
  const programme = baseProgramme({
    id: 'programme-gen-custom',
    name: 'Custom Gen',
    kind: 'other',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    frequency: { cadence: 'custom', note: 'ad-hoc meetings' },
  })
  assert.equal((await repos.localProgramme.saveDurable(programme)).ok, true)
  const result = await generateOccurrencesForProgramme(programme, repos.occurrence)
  assert.equal(result.created.length, 0)
  assert.equal(result.skippedProgrammes.length, 1)
  assert.match(result.skippedProgrammes[0]?.reason ?? '', /custom recurrence/)
  assert.equal(repos.occurrence.loadAll().data?.length, 0)
}

console.log('▶ repeated generation — no duplicates; existing preserved')
{
  await reset()
  const repos = getRepositories()
  const programme = baseProgramme({
    id: 'programme-gen-idem',
    name: 'Idem Gen',
    kind: 'follow_up',
    startDate: '2026-08-03', // Monday
    endDate: '2026-08-17',
    frequency: { cadence: 'weekly', dayOfWeek: 1 },
  })
  assert.equal((await repos.localProgramme.saveDurable(programme)).ok, true)

  const first = await generateOccurrencesForProgramme(programme, repos.occurrence)
  assert.equal(first.created.length, 3) // Aug 3, 10, 17
  const mutatedKey = buildOccurrenceGenerationKey(programme.id, '2026-08-03')
  const existing = repos.occurrence.getByGenerationKey(mutatedKey).data
  assert.ok(existing)
  const touched: Occurrence = {
    ...existing,
    title: 'Operator-preserved title',
    status: 'open',
    updatedAt: now,
    updatedBy: 'operator',
  }
  assert.equal((await repos.occurrence.saveDurable(touched)).ok, true)

  const second = await generateOccurrencesForProgramme(programme, repos.occurrence)
  assert.equal(second.created.length, 0)
  assert.equal(second.preserved.length, 3)
  assert.equal(repos.occurrence.loadAll().data?.length, 3)
  assert.equal(
    repos.occurrence.getByGenerationKey(mutatedKey).data?.title,
    'Operator-preserved title',
  )
  assert.equal(repos.occurrence.getByGenerationKey(mutatedKey).data?.status, 'open')
}

console.log('▶ archived / ineligible does not generate')
{
  await reset()
  const repos = getRepositories()
  const archived = baseProgramme({
    id: 'programme-gen-archived',
    name: 'Archived',
    kind: 'follow_up',
    status: 'archived',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    frequency: { cadence: 'weekly', dayOfWeek: 0 },
  })
  const draft = baseProgramme({
    id: 'programme-gen-draft',
    name: 'Draft',
    kind: 'follow_up',
    status: 'draft',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    frequency: { cadence: 'weekly', dayOfWeek: 0 },
  })
  assert.equal((await repos.localProgramme.saveDurable(archived)).ok, true)
  assert.equal((await repos.localProgramme.saveDurable(draft)).ok, true)
  const result = await generateOccurrencesForProgrammes(
    [archived, draft],
    repos.occurrence,
  )
  assert.equal(result.created.length, 0)
  assert.equal(result.skippedProgrammes.length, 2)
  assert.match(result.skippedProgrammes[0]?.reason ?? '', /ineligible status/)
  assert.equal(repos.occurrence.loadAll().data?.length, 0)
}

console.log('▶ missing/invalid dates — no invented fallback')
{
  await reset()
  const repos = getRepositories()
  const missing = baseProgramme({
    id: 'programme-gen-missing-dates',
    name: 'Missing dates',
    kind: 'follow_up',
    frequency: { cadence: 'weekly', dayOfWeek: 0 },
  })
  const invalid = baseProgramme({
    id: 'programme-gen-bad-dates',
    name: 'Bad dates',
    kind: 'follow_up',
    startDate: '2026-13-40',
    endDate: '2026-08-01',
    frequency: { cadence: 'weekly', dayOfWeek: 0 },
  })
  assert.equal((await repos.localProgramme.saveDurable(missing)).ok, true)
  assert.equal((await repos.localProgramme.saveDurable(invalid)).ok, true)
  const result = await generateOccurrencesForProgrammes(
    [missing, invalid],
    repos.occurrence,
  )
  assert.equal(result.created.length, 0)
  assert.ok(
    result.skippedProgrammes.some((row) => row.reason.includes('missing startDate')),
  )
  assert.ok(
    result.skippedProgrammes.some((row) => row.reason.includes('invalid startDate')),
  )
  assert.equal(repos.occurrence.loadAll().data?.length, 0)
}

console.log('▶ horizon helper inclusive; no WI/BM SoT mutation in generator')
{
  assert.deepEqual(eachDateKeyInclusive('2026-08-01', '2026-08-03'), [
    '2026-08-01',
    '2026-08-02',
    '2026-08-03',
  ])
  const generator = read('src/lib/occurrence/generateOccurrences.ts')
  assert.ok(!generator.includes('weeklyIjtemaService'), 'no WI service writes')
  assert.ok(!generator.includes('ensureWeeklyIjtemaAttendanceWindows'), 'no WI engine call')
  assert.ok(!generator.includes('FIRESTORE_COLLECTIONS.compliance'), 'no compliance SoT')
  const engine = read('src/lib/weeklyIjtema/attendanceWindowEngine.ts')
  assert.ok(
    !engine.includes('generateOccurrencesForProgramme'),
    'engine not rewritten to occurrence generator',
  )
}

console.log('verify:kc-phase3-occurrence-generation OK')
