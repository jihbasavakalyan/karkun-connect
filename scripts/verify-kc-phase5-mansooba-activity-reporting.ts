/**
 * Phase 5 — Meqati Mansooba activity reporting (TASK-042–044).
 * Run: npm run verify:kc-phase5-mansooba-activity-reporting
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildMansoobaActivityReport } from '@/lib/mansoobaReporting/buildMansoobaActivityReport'
import {
  resolveMansoobaReportPeriod,
  weekEndingSunday,
} from '@/lib/mansoobaReporting/periods'
import type { CampaignListItem } from '@/constants/mockMissions'
import type { LocalProgramme } from '@/types/localProgramme.types'
import type { Occurrence } from '@/types/occurrence.types'
import type { MeqatiMansooba, PlanningObjective } from '@/types/planning.types'
import type { Work } from '@/types/work.types'
import type { WeeklyIjtemaEvent, WeeklyIjtemaSubmission } from '@/types/weeklyIjtema'

const root = resolve(process.cwd())
const now = '2026-08-13T08:00:00.000Z'

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `expected ${label}: ${needle}`)
}

function assertNotIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(!haystack.includes(needle), `did not expect ${label}: ${needle}`)
}

const mansooba: MeqatiMansooba = {
  id: 'm1',
  name: 'Plan One',
  status: 'active',
  primaryUnitId: 'u1',
  createdAt: now,
  updatedAt: now,
  createdBy: 'verify',
  updatedBy: 'verify',
}

const objectives: PlanningObjective[] = [
  {
    id: 'o1',
    mansoobaId: 'm1',
    title: 'Objective A',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  },
  {
    id: 'o2',
    mansoobaId: 'm1',
    title: 'Objective B',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  },
]

function campaign(
  id: string,
  objectiveIds?: string[],
): CampaignListItem {
  return {
    id,
    name: id,
    status: 'active',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    theme: '',
    objective: '',
    objectives: [],
    nextMilestone: '',
    mansoobaId: 'm1',
    objectiveIds,
  }
}

function programme(
  id: string,
  campaignId: string,
  kind: LocalProgramme['kind'] = 'weekly_ijtema',
  status: LocalProgramme['status'] = 'active',
): LocalProgramme {
  return {
    id,
    campaignId,
    name: id,
    kind,
    status,
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
}

function occurrence(
  id: string,
  programmeId: string,
  occurrenceDate: string,
  status: Occurrence['status'] = 'scheduled',
  sourceRef?: Occurrence['sourceRef'],
): Occurrence {
  return {
    id,
    programmeId,
    occurrenceDate,
    status,
    generationKey: `${programmeId}:${occurrenceDate}`,
    sourceRef,
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
}

console.log('▶ periods — Karachi Sunday week-ending / month / year')
{
  assert.equal(weekEndingSunday('2026-08-13'), '2026-08-16')
  const weekly = resolveMansoobaReportPeriod({ kind: 'weekly', asOfDate: '2026-08-13' })
  assert.ok(weekly)
  assert.equal(weekly?.startDate, '2026-08-10')
  assert.equal(weekly?.endDate, '2026-08-16')
  assert.equal(weekly?.timezone, 'Asia/Karachi')
  const monthly = resolveMansoobaReportPeriod({ kind: 'monthly', asOfDate: '2026-08-13' })
  assert.equal(monthly?.startDate, '2026-08-01')
  assert.equal(monthly?.endDate, '2026-08-31')
  assert.equal(monthly?.periodKey, '2026-08')
  const yearly = resolveMansoobaReportPeriod({ kind: 'yearly', asOfDate: '2026-08-13' })
  assert.equal(yearly?.startDate, '2026-01-01')
  assert.equal(yearly?.endDate, '2026-12-31')
  assert.equal(yearly?.periodKey, '2026')
}

console.log('▶ empty report is valid')
{
  const period = resolveMansoobaReportPeriod({ kind: 'weekly', asOfDate: '2026-08-13' })!
  const report = buildMansoobaActivityReport({
    mansooba,
    period,
    asOfDate: '2026-08-13',
    objectives,
    campaigns: [campaign('c1', ['o1'])],
    programmes: [programme('p1', 'c1')],
    occurrences: [],
    work: [],
  })
  assert.equal(report.scheduled, 0)
  assert.equal(report.completed, 0)
  assert.equal(report.pending, 0)
  assert.equal(report.plannedProgrammeCount, 1)
  assert.equal(report.programmeRows[0]?.scheduled, 0)
  assert.equal(report.activityRows.length, 0)
}

console.log('▶ weekly — filter, execution, WI attendance')
{
  const period = resolveMansoobaReportPeriod({ kind: 'weekly', asOfDate: '2026-08-13' })!
  const wiEvent: WeeklyIjtemaEvent = {
    id: 'wi-1',
    title: 'Men WI',
    meetingDate: '2026-08-16',
    status: 'Closed',
    submissionDeadline: now,
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
    audienceGender: 'Male',
  }
  const submission: WeeklyIjtemaSubmission = {
    id: 'wi-1:R001',
    eventId: 'wi-1',
    ruknId: 'R001',
    ruknName: 'Rukn',
    marks: [
      { karkunId: 'k1', karkunName: 'K1', status: 'Present', reminded: true },
      { karkunId: 'k2', karkunName: 'K2', status: 'Absent', reminded: true },
    ],
    submittedAt: now,
    submittedBy: 'R001',
    updatedAt: now,
    updatedBy: 'R001',
  }
  const outside = occurrence('occ-out', 'p1', '2026-08-09', 'closed')
  const inside = occurrence('occ-in', 'p1', '2026-08-16', 'scheduled', {
    kind: 'weekly_ijtema_event',
    eventId: 'wi-1',
  })
  const otherMansoobaOcc = occurrence('occ-other', 'p-other', '2026-08-16', 'closed')
  const report = buildMansoobaActivityReport({
    mansooba,
    period,
    asOfDate: '2026-08-13',
    objectives,
    campaigns: [campaign('c1', ['o1'])],
    programmes: [programme('p1', 'c1'), programme('p-other', 'c-other')],
    occurrences: [outside, inside, otherMansoobaOcc],
    work: [],
    weeklyIjtemaEvents: [wiEvent],
    weeklyIjtemaSubmissions: [submission],
  })
  assert.equal(report.scheduled, 1)
  assert.equal(report.occurred, 1)
  assert.equal(report.completed, 1)
  assert.equal(report.pending, 0)
  assert.equal(report.activityRows[0]?.attendance?.present, 1)
  assert.equal(report.activityRows[0]?.attendance?.absent, 1)
  assert.equal(report.objectiveRows.find((row) => row.objectiveId === 'o1')?.completed, 1)
  assert.equal(report.objectiveRows.find((row) => row.objectiveId === 'o2')?.scheduled, 0)
}

console.log('▶ monthly unique — not a sum of weeks')
{
  const monthly = resolveMansoobaReportPeriod({ kind: 'monthly', asOfDate: '2026-08-13' })!
  const occ = occurrence('occ-mid', 'p1', '2026-08-12', 'closed')
  const report = buildMansoobaActivityReport({
    mansooba,
    period: monthly,
    asOfDate: '2026-08-13',
    objectives,
    campaigns: [campaign('c1', ['o1'])],
    programmes: [programme('p1', 'c1')],
    occurrences: [occ],
    work: [],
  })
  assert.equal(report.scheduled, 1)
  assert.equal(report.completed, 1)
}

console.log('▶ yearly aggregation + monthly progression without double count')
{
  const yearly = resolveMansoobaReportPeriod({ kind: 'yearly', asOfDate: '2026-08-13' })!
  const rows = [
    occurrence('a', 'p1', '2026-01-15', 'closed'),
    occurrence('b', 'p1', '2026-08-12', 'closed'),
    occurrence('c', 'p1', '2026-08-20', 'scheduled'),
  ]
  const report = buildMansoobaActivityReport({
    mansooba,
    period: yearly,
    asOfDate: '2026-08-13',
    objectives,
    campaigns: [campaign('c1', ['o1'])],
    programmes: [programme('p1', 'c1')],
    occurrences: rows,
    work: [],
  })
  assert.equal(report.scheduled, 3)
  assert.equal(report.completed, 2)
  assert.equal(report.pending, 1)
  const monthSum = report.monthlyProgression.reduce((sum, row) => sum + row.scheduled, 0)
  assert.equal(monthSum, report.scheduled)
  const aug = report.monthlyProgression.find((row) => row.monthKey === '2026-08')
  assert.equal(aug?.scheduled, 2)
}

console.log('▶ archived programme occurrences still listed; empty programme valid')
{
  const period = resolveMansoobaReportPeriod({ kind: 'weekly', asOfDate: '2026-08-13' })!
  const report = buildMansoobaActivityReport({
    mansooba,
    period,
    asOfDate: '2026-08-13',
    objectives,
    campaigns: [campaign('c1', ['o1'])],
    programmes: [
      programme('p-arch', 'c1', 'follow_up', 'archived'),
      programme('p-empty', 'c1', 'other', 'active'),
    ],
    occurrences: [occurrence('occ-arch', 'p-arch', '2026-08-12', 'closed')],
    work: [],
  })
  assert.equal(report.programmeRows.find((row) => row.programmeId === 'p-arch')?.scheduled, 1)
  assert.equal(report.programmeRows.find((row) => row.programmeId === 'p-empty')?.scheduled, 0)
  assert.equal(report.activityRows[0]?.programmeStatus, 'archived')
}

console.log('▶ multiple programmes under one objective; two objectives separated; mansooba de-dupes')
{
  const period = resolveMansoobaReportPeriod({ kind: 'weekly', asOfDate: '2026-08-13' })!
  const campaigns = [campaign('c1', ['o1', 'o2'])]
  const programmes = [programme('p1', 'c1'), programme('p2', 'c1', 'follow_up')]
  const occurrences = [
    occurrence('occ-1', 'p1', '2026-08-12', 'closed'),
    occurrence('occ-2', 'p2', '2026-08-13', 'scheduled'),
  ]
  const report = buildMansoobaActivityReport({
    mansooba,
    period,
    asOfDate: '2026-08-13',
    objectives,
    campaigns,
    programmes,
    occurrences,
    work: [],
  })
  assert.equal(report.scheduled, 2, 'mansooba unique occurrences')
  const o1 = report.objectiveRows.find((row) => row.objectiveId === 'o1')
  const o2 = report.objectiveRows.find((row) => row.objectiveId === 'o2')
  assert.equal(o1?.programmeCount, 2)
  assert.equal(o2?.programmeCount, 2)
  assert.equal(o1?.scheduled, 2)
  assert.equal(o2?.scheduled, 2)
  assert.notEqual(o1?.title, o2?.title)
}

console.log('▶ Work scoped by primaryUnitId + dueDate')
{
  const period = resolveMansoobaReportPeriod({ kind: 'weekly', asOfDate: '2026-08-13' })!
  const work: Work[] = [
    {
      id: 'w1',
      title: 'In window',
      ruknId: 'R001',
      unitId: 'u1',
      status: 'pending',
      dueDate: '2026-08-12',
      createdAt: now,
      updatedAt: now,
      createdBy: 'verify',
      updatedBy: 'verify',
    },
    {
      id: 'w2',
      title: 'Other unit',
      ruknId: 'R001',
      unitId: 'u2',
      status: 'done',
      dueDate: '2026-08-12',
      createdAt: now,
      updatedAt: now,
      createdBy: 'verify',
      updatedBy: 'verify',
    },
  ]
  const report = buildMansoobaActivityReport({
    mansooba,
    period,
    asOfDate: '2026-08-13',
    objectives,
    campaigns: [],
    programmes: [],
    occurrences: [],
    work,
  })
  assert.equal(report.workRows.length, 1)
  assert.equal(report.workPending, 1)
  assert.equal(report.workRows[0]?.overdue, true)
}

console.log('▶ no SoT writes / no reporting store / gaps documented')
{
  const builder = read('src/lib/mansoobaReporting/buildMansoobaActivityReport.ts')
  assertNotIncludes(builder, 'saveDurable', 'no durable writes')
  assertNotIncludes(builder, 'upsertWeeklyIjtema', 'no WI writes')
  assertNotIncludes(builder, 'upsertMonthlyBaitulMaal', 'no BM writes')
  assertIncludes(builder, 'orientation_not_period_scoped', 'orientation GAP')
  assertIncludes(builder, 'no_approved_performance_score', 'score GAP')
  const panel = read('src/pages/admin/MansoobaActivityReportPanel.tsx')
  assertIncludes(panel, 'Weekly', 'weekly UI')
  assertIncludes(panel, 'Monthly', 'monthly UI')
  assertIncludes(panel, 'Yearly', 'yearly UI')
  assertNotIncludes(panel, 'saveDurable', 'panel does not persist reports')
}

console.log('OK: Mansooba activity reporting verification passed')
