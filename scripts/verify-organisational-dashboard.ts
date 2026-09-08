/**
 * Organisational Dashboard — Meqati year + manual activity status.
 * Run: npx vite-node scripts/verify-organisational-dashboard.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildMeqatiYear,
  listMeqatiPlanYears,
  meqatiYearToReportPeriod,
  meqatiYearUrduRange,
  resolveMeqatiYear,
} from '../src/lib/dashboard/meqatiYear'
import {
  buildShobahRow,
  collectOngoingActivities,
  formatProgrammeSchedule,
  resolveProgrammeYearStatus,
} from '../src/lib/dashboard/organisationalSituation'
import type { LocalProgramme } from '../src/types/localProgramme.types'
import type { PlanningObjective, Shobah } from '../src/types/planning.types'
import {
  isMeqatiMansoobaActive,
  selectCanonicalMeqatiMansooba,
} from '../src/lib/planning/canonicalMeqatiMansooba'
import { countOfficerPeopleByKind } from '../src/lib/aRuknRegistry'
import {
  normalizeActivityYearStatuses,
  resolveActivityYearStatus,
} from '../src/lib/planning/activityYearStatus'

const year = buildMeqatiYear(2026)
assert.equal(year.key, '2026-27')
assert.equal(year.label, '2026–27')
assert.equal(year.rangeLabel, 'Apr 2026 – Mar 2027')
assert.equal(meqatiYearUrduRange(year), 'اپریل 2026 — مارچ 2027')
assert.equal(year.startDate, '2026-04-01')
assert.equal(year.endDate, '2027-03-31')
assert.equal(resolveMeqatiYear('2026-08-15').key, '2026-27')
assert.equal(resolveMeqatiYear('2027-03-31').key, '2026-27')
assert.equal(resolveMeqatiYear('2026-03-31').key, '2025-26')
assert.equal(resolveMeqatiYear('2026-04-01').key, '2026-27')
assert.deepEqual(
  listMeqatiPlanYears().map((row) => row.key),
  ['2023-24', '2024-25', '2025-26', '2026-27'],
)
const period = meqatiYearToReportPeriod(buildMeqatiYear(2024))
assert.equal(period.startDate, '2024-04-01')
assert.equal(period.endDate, '2025-03-31')

assert.equal(resolveProgrammeYearStatus({}, '2025-26'), null)
assert.equal(resolveProgrammeYearStatus({ yearStatuses: {} }, '2025-26'), null)
assert.equal(
  resolveProgrammeYearStatus({ yearStatuses: { '2024-25': 'completed' } }, '2025-26'),
  null,
)
assert.equal(
  resolveProgrammeYearStatus({ yearStatuses: { '2024-25': 'completed' } }, '2024-25'),
  'completed',
)
assert.equal(
  resolveProgrammeYearStatus(
    { yearStatuses: { '2024-25': 'completed', '2025-26': 'in_progress' } },
    '2025-26',
  ),
  'in_progress',
)
assert.equal(
  resolveProgrammeYearStatus(
    { yearStatuses: { '2024-25': 'completed', '2025-26': 'in_progress' } },
    '2024-25',
  ),
  'completed',
)
assert.equal(
  resolveActivityYearStatus({ '2026-27': 'remaining' }, '2026-27'),
  'remaining',
)

const isolated = normalizeActivityYearStatuses({
  '2024-25': 'completed',
  '2025-26': 'in_progress',
})
assert.deepEqual(isolated, {
  '2024-25': 'completed',
  '2025-26': 'in_progress',
})
const updated2025 = normalizeActivityYearStatuses({
  ...isolated,
  '2025-26': 'remaining',
})
assert.equal(updated2025?.['2024-25'], 'completed')
assert.equal(updated2025?.['2025-26'], 'remaining')
assert.equal(
  normalizeActivityYearStatuses({ '2025-26': 'in_progress', '2099-00': 'completed' })?.[
    '2099-00'
  ],
  undefined,
)
assert.equal(normalizeActivityYearStatuses({ '2025-26': 'done' }), undefined)
assert.equal(formatProgrammeSchedule(undefined), 'غیر متعین')

{
  const shobah: Shobah = {
    id: 'H01',
    mansoobaId: 'MEQATI-2023-27',
    name: 'دعوت',
    status: 'active',
    createdAt: '',
    updatedAt: '',
    createdBy: '',
    updatedBy: '',
  }
  const otherShobah: Shobah = {
    ...shobah,
    id: 'H02',
    name: 'تنظیم',
  }
  const objective: PlanningObjective = {
    id: 'H01-O01',
    mansoobaId: 'MEQATI-2023-27',
    shobahId: 'H01',
    title: 'قرآن فہمی',
    status: 'active',
    createdAt: '',
    updatedAt: '',
    createdBy: '',
    updatedBy: '',
  }
  const stamp = {
    createdAt: '',
    updatedAt: '',
    createdBy: '',
    updatedBy: '',
  }
  const mapped: LocalProgramme = {
    id: 'H01-A01',
    mansoobaId: 'MEQATI-2023-27',
    shobahId: 'H01',
    objectiveId: 'H01-O01',
    name: 'درس قرآن',
    kind: 'other',
    status: 'active',
    yearStatuses: { '2026-27': 'completed' },
    ...stamp,
  }
  const unmappedInProgress: LocalProgramme = {
    ...mapped,
    id: 'H01-A-UNMAPPED',
    objectiveId: null,
    name: 'قرآن پر وچن',
    yearStatuses: { '2026-27': 'in_progress' },
  }
  const unmappedUnset: LocalProgramme = {
    ...mapped,
    id: 'H01-A-UNSET',
    objectiveId: '',
    name: 'غیر مربوط سرگرمی',
    yearStatuses: undefined,
  }
  const unmappedOtherHead: LocalProgramme = {
    ...mapped,
    id: 'H02-A-UNMAPPED',
    shobahId: 'H02',
    objectiveId: null,
    name: 'دیگر شعبہ',
    yearStatuses: { '2026-27': 'remaining' },
  }
  const statusByProgrammeId = new Map([
    [mapped.id, resolveProgrammeYearStatus(mapped, '2026-27')],
    [unmappedInProgress.id, resolveProgrammeYearStatus(unmappedInProgress, '2026-27')],
    [unmappedUnset.id, resolveProgrammeYearStatus(unmappedUnset, '2026-27')],
    [unmappedOtherHead.id, resolveProgrammeYearStatus(unmappedOtherHead, '2026-27')],
  ])
  const row = buildShobahRow(
    shobah,
    [objective],
    [mapped, unmappedInProgress, unmappedUnset, unmappedOtherHead],
    statusByProgrammeId,
  )
  assert.equal(row.activities, 3)
  assert.equal(row.completed, 1)
  assert.equal(row.inProgress, 1)
  assert.equal(row.remaining, 0)
  assert.equal(row.objectives.length, 1)
  assert.equal(row.objectives[0]?.id, 'H01-O01')
  assert.deepEqual(
    row.objectives[0]?.activities.map((activity) => activity.id),
    ['H01-A01'],
  )
  assert.equal(row.unmappedActivities.length, 2)
  assert.ok(
    row.unmappedActivities.some(
      (activity) => activity.id === 'H01-A-UNMAPPED' && activity.status === 'in_progress',
    ),
  )
  assert.ok(
    row.unmappedActivities.some(
      (activity) => activity.id === 'H01-A-UNSET' && activity.status === null,
    ),
  )
  assert.equal(
    row.objectives.some((item) => item.id === 'UNMAPPED' || item.title === 'UNMAPPED'),
    false,
  )
  const otherRow = buildShobahRow(otherShobah, [], [unmappedOtherHead], statusByProgrammeId)
  assert.equal(otherRow.objectives.length, 0)
  assert.deepEqual(
    otherRow.unmappedActivities.map((activity) => activity.id),
    ['H02-A-UNMAPPED'],
  )
  const ongoing = collectOngoingActivities([row, otherRow])
  assert.deepEqual(
    ongoing.map((activity) => ({
      id: activity.id,
      status: activity.status,
      objectiveTitle: activity.objectiveTitle,
    })),
    [
      { id: 'H01-A-UNMAPPED', status: 'in_progress', objectiveTitle: 'بغیر ہدف' },
      { id: 'H02-A-UNMAPPED', status: 'remaining', objectiveTitle: 'بغیر ہدف' },
    ],
  )
}

{
  const draft = {
    id: 'MEQATI-2023-27',
    name: 'میقاتی منصوبہ',
    status: 'draft' as const,
    createdAt: '',
    updatedAt: '',
    createdBy: '',
    updatedBy: '',
  }
  const active = { ...draft, id: 'MEQATI-ACTIVE', status: 'active' as const }
  const archived = { ...draft, id: 'MEQATI-OLD', status: 'archived' as const }
  assert.equal(selectCanonicalMeqatiMansooba([draft])?.id, 'MEQATI-2023-27')
  assert.equal(isMeqatiMansoobaActive(draft), false)
  assert.equal(selectCanonicalMeqatiMansooba([draft, active])?.id, 'MEQATI-ACTIVE')
  assert.equal(isMeqatiMansoobaActive(active), true)
  assert.equal(selectCanonicalMeqatiMansooba([archived]), undefined)
  assert.equal(
    selectCanonicalMeqatiMansooba([
      draft,
      { ...draft, id: 'MEQATI-OTHER' },
    ]),
    undefined,
  )
}

{
  const split = countOfficerPeopleByKind([
    { officerKind: 'rukn' },
    { officerKind: 'a_rukn' },
    { officerKind: 'a_rukn' },
    {},
  ])
  assert.equal(split.rukns, 2)
  assert.equal(split.aRukns, 2)
}

const home = readFileSync(resolve('src/pages/admin/AdminHomePage.tsx'), 'utf8')
assert.match(home, /orgdash-page/)
assert.match(home, /AskDigitalRafeeqCard/)
assert.doesNotMatch(home, /Today's Mission/)

const stack = readFileSync(
  resolve('src/components/dashboard/OrganisationalDashboardStack.tsx'),
  'utf8',
)
assert.match(stack, /ہفتہ وار اجتماع/)
assert.match(stack, /توجہ طلب/)
assert.match(stack, /میقاتی منصوبہ کا ڈیٹا ابھی درج نہیں کیا گیا/)
assert.match(stack, /اہم جاری سرگرمیاں/)
assert.match(stack, /بغیر ہدف/)
assert.match(stack, /unmappedActivities/)
assert.doesNotMatch(stack, /UNMAPPED/)
assert.doesNotMatch(stack, /CampaignHealthPanel/)
assert.doesNotMatch(stack, /ProgressTrendsPanel/)
assert.doesNotMatch(stack, /ActivityTimeline/)
assert.doesNotMatch(stack, /Work Queue/)
assert.doesNotMatch(stack, /Open work/)
assert.doesNotMatch(stack, /Open occurrences/)
assert.match(stack, /مسودہ/)
assert.match(stack, /progressDisplay/)

const situation = readFileSync(
  resolve('src/lib/dashboard/organisationalSituation.ts'),
  'utf8',
)
assert.match(situation, /selectCanonicalMeqatiMansooba/)
assert.doesNotMatch(situation, /repos\.meqatiMansooba\.getActive/)
assert.match(situation, /yearStatuses/)
assert.match(situation, /countOfficerPeopleByKind/)
assert.match(situation, /aRukns: officersByKind.aRukns/)
assert.doesNotMatch(situation, /rukns: people.totalRukns/)
assert.doesNotMatch(situation, /buildMansoobaActivityReport/)
assert.doesNotMatch(situation, /classifyProgrammeYearStatus/)
assert.doesNotMatch(situation, /repos\.occurrence/)
assert.match(situation, /unmappedActivities/)
assert.match(situation, /collectOngoingActivities/)
assert.doesNotMatch(situation, /id: 'UNMAPPED'/)

const hero = readFileSync(
  resolve('src/components/dashboard/OrganisationalSituationHero.tsx'),
  'utf8',
)
assert.match(hero, /label="ارکان"/)
assert.match(hero, /label="عازمِ رکن"/)
assert.match(hero, /label="کارکنان"/)
assert.match(hero, /label="متفقین"/)
assert.match(hero, /situation.people.aRukns/)

const planning = readFileSync(resolve('src/pages/admin/AdminPlanningPage.tsx'), 'utf8')
assert.match(planning, /سال کے مطابق عمل درآمد/)
assert.match(planning, /activity-year-status-/)
assert.doesNotMatch(planning, /Occurrence UI/)
assert.match(planning, /normalizeActivityYearStatuses/)
assert.match(planning, /useBackgroundHydration/)
assert.match(planning, /if \(!backgroundReady\) return/)
assert.match(planning, /CardSkeleton/)
assert.match(planning, /لوڈ ہو رہا ہے/)

const nav = readFileSync(resolve('src/constants/adminNavigation.ts'), 'utf8')
assert.match(nav, /میقاتی منصوبہ/)
assert.match(nav, /باہمی ربط/)
assert.doesNotMatch(nav, /label: 'Activities'/)
assert.doesNotMatch(nav, /جاری سرگرمیاں/)
assert.doesNotMatch(nav, /label: 'تنظیم'/)

const types = readFileSync(resolve('src/types/localProgramme.types.ts'), 'utf8')
assert.match(types, /yearStatuses\?:/)

console.log('verify-organisational-dashboard: ok')
