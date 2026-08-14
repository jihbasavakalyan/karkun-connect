/**
 * Organisational Dashboard — Meqati year + activity status mapping.
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
  classifyProgrammeYearStatus,
  formatProgrammeSchedule,
} from '../src/lib/dashboard/organisationalSituation'

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

assert.equal(
  classifyProgrammeYearStatus({ scheduled: 0, occurred: 0, completed: 0, pending: 0 }),
  'remaining',
)
assert.equal(
  classifyProgrammeYearStatus({ scheduled: 4, occurred: 0, completed: 0, pending: 4 }),
  'remaining',
)
assert.equal(
  classifyProgrammeYearStatus({ scheduled: 4, occurred: 2, completed: 1, pending: 3 }),
  'in_progress',
)
assert.equal(
  classifyProgrammeYearStatus({ scheduled: 3, occurred: 3, completed: 3, pending: 0 }),
  'completed',
)
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

console.log('verify-organisational-dashboard: ok')
