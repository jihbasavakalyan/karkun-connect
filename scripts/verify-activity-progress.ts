/**
 * Meqati activity progress + implementation status vocabulary corrections.
 * Covers the 12 verification conditions from the controlled follow-up.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  computeActivityProgress,
  deriveActivityRequiresAttention,
  parseNumericTargetRatio,
} from '../src/lib/planning/activityProgress'
import {
  formatActivityYearStatusLabel,
  normalizeActivityYearStatuses,
  resolveActivityYearStatus,
} from '../src/lib/planning/activityYearStatus'
import {
  countMeqatiUnmappedReviewBuckets,
  filterMeqatiUnmappedByReviewMode,
  isMeqatiHumanObjectiveReviewActivity,
} from '../src/lib/planning/meqatiHumanObjectiveReview'
import { CompactActivityList } from '../src/pages/admin/meqati/meqatiPlanningPresentation'
import { MeqatiPlanningWorkspace } from '../src/pages/admin/meqati/MeqatiPlanningWorkspace'
import type { LocalProgramme } from '../src/types/localProgramme.types'
import type { MeqatiMansooba, PlanningObjective, Shobah } from '../src/types/planning.types'

const stamp = {
  createdAt: '2026-08-22T00:00:00.000Z',
  updatedAt: '2026-08-22T00:00:00.000Z',
  createdBy: 'verify',
  updatedBy: 'verify',
}

// 1. unset status remains unset
assert.equal(resolveActivityYearStatus(undefined, '2026-27'), null)
assert.equal(resolveActivityYearStatus({}, '2026-27'), null)
assert.equal(formatActivityYearStatusLabel(null), 'حالت متعین نہیں')
assert.equal(
  normalizeActivityYearStatuses({ '2026-27': '' }),
  undefined,
  'empty string must not become remaining',
)

// 2–4. vocabulary mapping
assert.equal(formatActivityYearStatusLabel('remaining'), 'شروع نہیں')
assert.equal(formatActivityYearStatusLabel('in_progress'), 'جاری')
assert.equal(formatActivityYearStatusLabel('completed'), 'مکمل')

// 5. attention does not mutate implementation status
const attentionActivity = {
  id: 'act-attn',
  name: 'جاری مگر بغیر ہدف',
  summary: undefined,
  yearStatuses: { '2026-27': 'in_progress' as const },
  objectiveId: null,
  responsibleRuknId: 'R001',
  frequency: { cadence: 'monthly' as const },
}
const attentionProgress = computeActivityProgress({
  activity: attentionActivity,
  yearKey: '2026-27',
})
assert.equal(attentionProgress.kind, 'qualitative')
if (attentionProgress.kind === 'qualitative') {
  assert.equal(attentionProgress.status, 'in_progress')
  assert.equal(attentionProgress.statusUrdu, 'جاری')
  assert.equal(attentionProgress.requiresAttention, true)
  assert.equal(attentionProgress.displayUrdu, 'جاری')
  assert.notEqual(attentionProgress.statusUrdu, 'توجہ درکار')
}
assert.equal(deriveActivityRequiresAttention(attentionActivity), true)

// 6. planned occurrences do not falsely imply implementation
const withPlannedOccurrences = computeActivityProgress({
  activity: {
    id: 'act-recurring',
    name: 'ہفتہ وار جائزہ',
    yearStatuses: { '2026-27': 'remaining' },
    objectiveId: 'obj-1',
    responsibleRuknId: 'R001',
    frequency: { cadence: 'weekly' },
  },
  yearKey: '2026-27',
})
assert.equal(withPlannedOccurrences.kind, 'qualitative')
if (withPlannedOccurrences.kind === 'qualitative') {
  assert.equal(withPlannedOccurrences.statusUrdu, 'شروع نہیں')
  assert.equal(withPlannedOccurrences.displayUrdu, 'شروع نہیں')
}
assert.doesNotMatch(
  readFileSync('src/lib/planning/activityProgress.ts', 'utf8'),
  /status === 'closed'/,
)
assert.doesNotMatch(
  readFileSync('src/lib/planning/activityProgress.ts', 'utf8'),
  /kind: 'recurring'/,
)

// 7. numeric target calculation
const ratio = parseNumericTargetRatio('حصول: 32 / 50 مکمل')
assert.deepEqual(ratio, { current: 32, target: 50 })
const progNumeric = computeActivityProgress({
  activity: {
    id: 'act-1',
    name: 'سروے',
    summary: '32 / 50 مکمل',
    yearStatuses: { '2026-27': 'in_progress' },
    objectiveId: 'obj-1',
    responsibleRuknId: 'R001',
    frequency: { cadence: 'monthly' },
  },
  yearKey: '2026-27',
})
assert.equal(progNumeric.kind, 'numeric')
if (progNumeric.kind === 'numeric') {
  assert.equal(progNumeric.percentage, 64)
  assert.equal(progNumeric.displayUrdu, '32 / 50 (64%)')
}

// 8. qualitative activity has no artificial percentage
const progQual = computeActivityProgress({
  activity: {
    id: 'act-3',
    name: 'اصلاح معاشرہ مہم',
    yearStatuses: { '2026-27': 'in_progress' },
    objectiveId: 'obj-1',
    responsibleRuknId: 'R001',
    frequency: { cadence: 'once' },
  },
  yearKey: '2026-27',
})
assert.equal(progQual.kind, 'qualitative')
if (progQual.kind === 'qualitative') {
  assert.equal(progQual.statusUrdu, 'جاری')
  assert.equal(progQual.displayUrdu, 'جاری')
  assert.equal(progQual.requiresAttention, false)
}

// 9–10. unresolved objective filter finds objectiveId=null; explicit selection UI present
const progressSrc = readFileSync('src/lib/planning/activityProgress.ts', 'utf8')
assert.match(progressSrc, /yearStatuses/)
assert.match(progressSrc, /Occurrences are planned/)

const workspaceSrc = readFileSync('src/pages/admin/meqati/MeqatiPlanningWorkspace.tsx', 'utf8')
assert.match(workspaceSrc, /بغیر ہدف فلٹر/)
assert.match(workspaceSrc, /level: 'unmapped-all'/)
assert.match(workspaceSrc, /ہدف منتخب کریں/)
assert.match(workspaceSrc, /H01–H09/)
assert.match(workspaceSrc, /انسانی جائزہ درکار/)
assert.match(workspaceSrc, /دیگر بغیر ہدف/)
assert.match(workspaceSrc, /تمام بغیر ہدف سرگرمیاں/)
assert.match(workspaceSrc, /meqatiHumanObjectiveReview/)

const reviewSrc = readFileSync('src/lib/planning/meqatiHumanObjectiveReview.ts', 'utf8')
assert.match(reviewSrc, /H02-A07/)
assert.match(reviewSrc, /H02-A13/)
assert.match(reviewSrc, /H05-A03/)
assert.match(reviewSrc, /H06-A06/)
assert.match(reviewSrc, /H06-A09/)
assert.match(reviewSrc, /MEQATI_HUMAN_OBJECTIVE_REVIEW_ACTIVITY_IDS/)
assert.doesNotMatch(reviewSrc, /autoMap\(|batchAssign|fuzzyMatch|semanticSimilarity/)

const pageSrc = readFileSync('src/pages/admin/AdminPlanningPage.tsx', 'utf8')
assert.match(pageSrc, /حالت متعین نہیں/)
assert.match(pageSrc, /شروع نہیں/)
assert.match(pageSrc, /تصدیق شدہ ہدف منتخب کریں/)
assert.match(pageSrc, /ہدف: ابھی منتخب نہیں/)
assert.match(pageSrc, /ہدف محفوظ کریں/)
assert.match(pageSrc, /ہدف کے بغیر برقرار رکھیں/)
assert.match(pageSrc, /ممکنہ نسبت — منظوری درکار/)
assert.match(pageSrc, /saveActivityObjectiveMapping/)
assert.match(pageSrc, /normalizeActivityYearStatuses/)
assert.doesNotMatch(pageSrc, /value: '', label: 'غیر متعین'/)
assert.doesNotMatch(pageSrc, /fuzzyMatch|semanticSimilarity|LLM classify/i)

const mansooba: MeqatiMansooba = {
  id: 'MEQATI-2023-27',
  name: 'میقاتی منصوبہ',
  status: 'draft',
  ...stamp,
}
const shobahs: Shobah[] = [
  {
    id: 'H01',
    mansoobaId: mansooba.id,
    name: 'دعوت و تبلیغ',
    status: 'active',
    sortOrder: 1,
    ...stamp,
  },
  {
    id: 'H02',
    mansoobaId: mansooba.id,
    name: 'تنظیم',
    status: 'active',
    sortOrder: 2,
    ...stamp,
  },
]
const objectives: PlanningObjective[] = [
  {
    id: 'H01-O01',
    mansoobaId: mansooba.id,
    shobahId: 'H01',
    title: 'ہدف ایک',
    status: 'active',
    sortOrder: 1,
    ...stamp,
  },
]
const programmes: LocalProgramme[] = [
  {
    id: 'H01-A-UNMAPPED',
    mansoobaId: mansooba.id,
    shobahId: 'H01',
    objectiveId: null,
    name: 'قرآن پر وچن',
    kind: 'other',
    status: 'draft',
    ...stamp,
  },
  {
    id: 'H02-A-UNMAPPED',
    mansoobaId: mansooba.id,
    shobahId: 'H02',
    objectiveId: null,
    name: 'تنظیمی جائزہ',
    kind: 'other',
    status: 'draft',
    ...stamp,
  },
  {
    id: 'H01-A-MAPPED',
    mansoobaId: mansooba.id,
    shobahId: 'H01',
    objectiveId: 'H01-O01',
    name: 'مربوط سرگرمی',
    kind: 'other',
    status: 'active',
    yearStatuses: { '2026-27': 'completed' },
    ...stamp,
  },
]

const allUnmapped = programmes.filter((row) => !row.objectiveId?.trim())
assert.equal(allUnmapped.length, 2)

const filterHtml = renderToStaticMarkup(
  createElement(MeqatiPlanningWorkspace, {
    mansooba,
    totals: {
      shobahs: 2,
      objectives: 1,
      activities: 3,
      mapped: 1,
      unmapped: 2,
    },
    shobahItems: shobahs.map((shobah) => ({
      shobah,
      objectiveCount: shobah.id === 'H01' ? 1 : 0,
      activityCount: shobah.id === 'H01' ? 2 : 1,
      mappedCount: shobah.id === 'H01' ? 1 : 0,
      unmappedCount: 1,
    })),
    visibleObjectives: objectives,
    shobahActivities: [],
    unmappedActivities: allUnmapped,
    programmes,
    ruknNameById: new Map(),
    view: { level: 'unmapped-all' },
    onViewChange: () => undefined,
    onOpenActivity: () => undefined,
    readOnly: true,
  }),
)
assert.match(filterHtml, /بغیر ہدف فلٹر/)
assert.match(filterHtml, /تمام بغیر ہدف سرگرمیاں/)
assert.match(filterHtml, /انسانی جائزہ درکار/)
assert.match(filterHtml, /دیگر بغیر ہدف/)
assert.match(filterHtml, /قرآن پر وچن/)
assert.match(filterHtml, /تنظیمی جائزہ/)
assert.match(filterHtml, /ہدف: ابھی منتخب نہیں/)
assert.match(filterHtml, /ہدف منتخب کریں/)
assert.match(filterHtml, /دعوت و تبلیغ/)
assert.match(filterHtml, /تنظیم/)
assert.doesNotMatch(filterHtml, /حالیہ ہدف: بغیر ہدف/)
assert.doesNotMatch(filterHtml, /مربوط سرگرمی/)

assert.equal(isMeqatiHumanObjectiveReviewActivity('H02-A07'), true)
assert.equal(isMeqatiHumanObjectiveReviewActivity('H01-A-UNMAPPED'), false)
const reviewFixture = [
  { id: 'H02-A07' },
  { id: 'H01-A-UNMAPPED' },
  { id: 'H06-A09' },
  { id: 'X-OTHER' },
]
const buckets = countMeqatiUnmappedReviewBuckets(reviewFixture)
assert.equal(buckets.all, 4)
assert.equal(buckets.humanReview, 2)
assert.equal(buckets.other, 2)
assert.equal(filterMeqatiUnmappedByReviewMode(reviewFixture, 'human-review').length, 2)
assert.equal(filterMeqatiUnmappedByReviewMode(reviewFixture, 'other').length, 2)

const listHtml = renderToStaticMarkup(
  createElement(CompactActivityList, {
    rows: [
      {
        id: 'x1',
        mansoobaId: mansooba.id,
        shobahId: 'H01',
        objectiveId: null,
        name: 'unset row',
        kind: 'other',
        status: 'draft',
        ...stamp,
      },
      {
        id: 'x2',
        mansoobaId: mansooba.id,
        shobahId: 'H01',
        objectiveId: 'H01-O01',
        name: 'remaining row',
        kind: 'other',
        status: 'active',
        yearStatuses: { '2026-27': 'remaining' },
        ...stamp,
      },
    ],
    ruknNameById: new Map(),
    onOpen: () => undefined,
    yearKey: '2026-27',
  }),
)
assert.match(listHtml, /حالت متعین نہیں/)
assert.match(listHtml, /شروع نہیں/)

// 11–12. dashboard values derive from actual data; no hard-coded sample numbers
const stack = readFileSync('src/components/dashboard/OrganisationalDashboardStack.tsx', 'utf8')
assert.match(stack, /counts\.completed/)
assert.match(stack, /counts\.inProgress/)
assert.match(stack, /counts\.remaining/)
assert.match(stack, /counts\.unset/)
assert.match(stack, /شروع نہیں/)
assert.match(stack, /حالت متعین نہیں/)
assert.doesNotMatch(stack, /remaining: 'باقی'/)
assert.doesNotMatch(stack, /<dd>12<\/dd>/)
assert.doesNotMatch(stack, /<dd>64%<\/dd>/)

const situation = readFileSync('src/lib/dashboard/organisationalSituation.ts', 'utf8')
assert.match(situation, /unset/)
assert.match(situation, /Occurrence is not the source/)
assert.match(situation, /never infer from occurrences/)

console.log('verify-activity-progress: ok')
