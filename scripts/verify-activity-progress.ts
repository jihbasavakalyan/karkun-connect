import assert from 'node:assert/strict'
import { computeActivityProgress, parseNumericTargetRatio } from '../src/lib/planning/activityProgress'

// Test Case A — Numeric target
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

// Test Case B — Recurring activity with occurrences
const progRecurring = computeActivityProgress({
  activity: {
    id: 'act-2',
    name: 'ہفتہ وار جائزہ',
    yearStatuses: { '2026-27': 'in_progress' },
    objectiveId: 'obj-1',
    responsibleRuknId: 'R001',
    frequency: { cadence: 'weekly' },
  },
  yearKey: '2026-27',
  occurrences: [
    { id: 'occ-1', programmeId: 'act-2', occurrenceDate: '2026-04-05', status: 'closed', generationKey: '1', createdAt: '', updatedAt: '', createdBy: '', updatedBy: '' },
    { id: 'occ-2', programmeId: 'act-2', occurrenceDate: '2026-04-12', status: 'closed', generationKey: '2', createdAt: '', updatedAt: '', createdBy: '', updatedBy: '' },
    { id: 'occ-3', programmeId: 'act-2', occurrenceDate: '2026-04-19', status: 'closed', generationKey: '3', createdAt: '', updatedAt: '', createdBy: '', updatedBy: '' },
    { id: 'occ-4', programmeId: 'act-2', occurrenceDate: '2026-04-26', status: 'closed', generationKey: '4', createdAt: '', updatedAt: '', createdBy: '', updatedBy: '' },
    { id: 'occ-5', programmeId: 'act-2', occurrenceDate: '2026-05-03', status: 'scheduled', generationKey: '5', createdAt: '', updatedAt: '', createdBy: '', updatedBy: '' },
    { id: 'occ-6', programmeId: 'act-2', occurrenceDate: '2026-05-10', status: 'scheduled', generationKey: '6', createdAt: '', updatedAt: '', createdBy: '', updatedBy: '' },
  ],
})
assert.equal(progRecurring.kind, 'recurring')
if (progRecurring.kind === 'recurring') {
  assert.equal(progRecurring.completed, 4)
  assert.equal(progRecurring.due, 6)
  assert.equal(progRecurring.percentage, 67)
  assert.equal(progRecurring.displayUrdu, '4 مکمل / 6 شیڈول (67%)')
}

// Test Case C — Qualitative activity (no fake percentage)
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
}

// Test Case C with attention (unmapped objective)
const progAttention = computeActivityProgress({
  activity: {
    id: 'act-4',
    name: 'بغیر ہدف سرگرمی',
    yearStatuses: { '2026-27': 'remaining' },
    objectiveId: null,
    responsibleRuknId: 'R001',
    frequency: { cadence: 'monthly' },
  },
  yearKey: '2026-27',
})
assert.equal(progAttention.kind, 'qualitative')
if (progAttention.kind === 'qualitative') {
  assert.equal(progAttention.statusUrdu, 'شروع نہیں')
  assert.equal(progAttention.requiresAttention, true)
}

console.log('verify-activity-progress: ok')
