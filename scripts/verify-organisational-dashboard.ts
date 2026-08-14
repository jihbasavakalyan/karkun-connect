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
  resolveMeqatiYear,
} from '../src/lib/dashboard/meqatiYear'
import {
  formatProgrammeSchedule,
  resolveProgrammeYearStatus,
} from '../src/lib/dashboard/organisationalSituation'
import {
  normalizeActivityYearStatuses,
  resolveActivityYearStatus,
} from '../src/lib/planning/activityYearStatus'

const year = buildMeqatiYear(2026)
assert.equal(year.key, '2026-27')
assert.equal(year.label, '2026–27')
assert.equal(year.rangeLabel, 'Apr 2026 – Mar 2027')
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
assert.doesNotMatch(stack, /Work Queue/)
assert.doesNotMatch(stack, /Open work/)
assert.doesNotMatch(stack, /Open occurrences/)
assert.match(stack, /غیر متعین/)

const situation = readFileSync(
  resolve('src/lib/dashboard/organisationalSituation.ts'),
  'utf8',
)
assert.match(situation, /resolveProgrammeYearStatus/)
assert.match(situation, /yearStatuses/)
assert.doesNotMatch(situation, /buildMansoobaActivityReport/)
assert.doesNotMatch(situation, /classifyProgrammeYearStatus/)
assert.doesNotMatch(situation, /repos\.occurrence/)

const planning = readFileSync(resolve('src/pages/admin/AdminPlanningPage.tsx'), 'utf8')
assert.match(planning, /سال کے مطابق عمل درآمد/)
assert.match(planning, /activity-year-status-/)
assert.doesNotMatch(planning, /Occurrence UI/)
assert.match(planning, /normalizeActivityYearStatuses/)

const types = readFileSync(resolve('src/types/localProgramme.types.ts'), 'utf8')
assert.match(types, /yearStatuses\?:/)

console.log('verify-organisational-dashboard: ok')
