/**
 * KC-037C2E — Admin Weekly Ijtema must read the same canonical submissions
 * Rukn register writes (gender-scoped Open events aggregated for Admin).
 */
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { ruknMaster } from '../src/data/ruknMaster'
import { getAssignedKarkunanForRukn } from '../src/lib/assignmentEngine'
import {
  getWeeklyIjtemaAttendanceSummariesView,
  getWeeklyIjtemaCurrentAttendanceView,
  getWeeklyIjtemaDashboardMetricsView,
} from '../src/lib/operations/weeklyIjtemaReadAdapter'
import { CanonicalMetricProviders } from '../src/lib/operations/canonicalCampaignMetrics'
import {
  createWeeklyIjtemaEvent,
  getWeeklyIjtemaDashboardKpi,
  upsertWeeklyIjtemaKarkunMark,
} from '../src/services/weeklyIjtemaService'
import { getDashboardWeeklyIjtemaHealthSlice } from '../src/services/dashboardMetricsService'
import { clearAssignmentStore, replaceAllAssignments } from '../src/stores/assignmentStore'
import { clearIjtemaAttendanceStore } from '../src/stores/ijtemaAttendanceStore'
import { clearWeeklyIjtemaStore } from '../src/stores/weeklyIjtemaStore'
import type { AssignmentRecord } from '../src/types/assignment'
import type { KarkunRegistryRecord } from '../src/types/karkun-registry.types'

type CaseResult = { name: string; passed: boolean; detail: string }

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function run(name: string, fn: () => void): CaseResult {
  try {
    fn()
    return { name, passed: true, detail: 'ok' }
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

function seedKarkun(input: {
  id: string
  name: string
  gender: 'Male' | 'Female'
  ruknId: string
  ruknName: string
}): void {
  const now = new Date().toISOString()
  const karkun: KarkunRegistryRecord = {
    id: input.id,
    name: input.name,
    gender: input.gender,
    mobile: `0300${input.id.replace(/\D/g, '').slice(0, 7) || '037C2E'}`,
    place: 'Karachi',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    updatedBy: 'Verification',
    address: '',
    area: '',
    assignedRukn: input.ruknName,
    assignedRuknId: input.ruknId,
    assignmentStatus: 'Assigned',
    campaignStatus: 'not_assigned',
    visitStatus: 'none',
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: '',
    isArchived: false,
  }
  MOCK_KARKUN_REGISTRY.push(karkun)
}

function testAdminAggregatesGenderScopedWrites(): void {
  clearWeeklyIjtemaStore()
  clearIjtemaAttendanceStore()
  clearAssignmentStore()
  MOCK_KARKUN_REGISTRY.length = 0

  const maleRukn = ruknMaster.find((r) => r.status === 'active' && r.gender === 'Male')
  const femaleRukn = ruknMaster.find((r) => r.status === 'active' && r.gender === 'Female')
  assert(Boolean(maleRukn && femaleRukn), 'active male + female rukn')

  const meetingDate = new Date().toISOString().slice(0, 10)
  const maleEvent = createWeeklyIjtemaEvent({
    meetingDate,
    title: 'KC-037C2E Male',
    createdBy: 'Admin',
    audienceGender: 'Male',
  })
  const femaleEvent = createWeeklyIjtemaEvent({
    meetingDate,
    title: 'KC-037C2E Female',
    createdBy: 'Admin',
    audienceGender: 'Female',
  })
  assert(maleEvent.success && femaleEvent.success, 'both Open events created')
  if (!maleEvent.success || !femaleEvent.success) return

  // Create Female Open FIRST in store order? Female is created second; listOpen
  // returns store order. KPI previously bound to first Open only — often Male.
  // Write ALL marks on Female event while Male Open also exists (root-cause repro).
  const now = new Date().toISOString()
  const femaleKarkuns = Array.from({ length: 7 }, (_, i) => ({
    id: `K-037C2E-F${i + 1}`,
    name: `Female Fixture ${i + 1}`,
  }))
  for (const k of femaleKarkuns) {
    seedKarkun({
      id: k.id,
      name: k.name,
      gender: 'Female',
      ruknId: femaleRukn!.id,
      ruknName: femaleRukn!.name,
    })
  }
  replaceAllAssignments(
    femaleKarkuns.map(
      (k, i): AssignmentRecord => ({
        assignmentId: `A-037C2E-F${i + 1}`,
        assignmentNumber: `ASN-037C2E-F${i + 1}`,
        ruknId: femaleRukn!.id,
        karkunId: k.id,
        assignedDate: now.slice(0, 10),
        effectiveFrom: now.slice(0, 10),
        status: 'Active',
        assignedBy: 'Administrator',
        createdAt: now,
        updatedAt: now,
      }),
    ),
    2,
  )
  assert(
    getAssignedKarkunanForRukn(femaleRukn!.id).length === 7,
    'female assigned 7',
  )

  // 5 Present + 2 Reminded-only on Female event (Male event stays empty).
  for (let i = 0; i < 5; i += 1) {
    const result = upsertWeeklyIjtemaKarkunMark({
      eventId: femaleEvent.event.id,
      ruknId: femaleRukn!.id,
      ruknName: femaleRukn!.name,
      karkunId: femaleKarkuns[i].id,
      karkunName: femaleKarkuns[i].name,
      status: 'Present',
      reminded: true,
      submittedBy: femaleRukn!.id,
    })
    assert(result.success, `present ${i + 1}`)
  }
  for (let i = 5; i < 7; i += 1) {
    const result = upsertWeeklyIjtemaKarkunMark({
      eventId: femaleEvent.event.id,
      ruknId: femaleRukn!.id,
      ruknName: femaleRukn!.name,
      karkunId: femaleKarkuns[i].id,
      karkunName: femaleKarkuns[i].name,
      reminded: true,
      submittedBy: femaleRukn!.id,
    })
    assert(result.success, `reminded ${i + 1}`)
  }

  const kpi = getWeeklyIjtemaDashboardKpi()
  assert(kpi.present === 5, `Admin KPI present=5 got ${kpi.present}`)
  assert(kpi.absent === 0, `Admin KPI absent=0 got ${kpi.absent}`)
  assert(kpi.remindedTotal === 7, `Admin KPI remindedTotal=7 got ${kpi.remindedTotal}`)
  assert(kpi.attendancePct === 71, `Admin KPI attendance%=71 got ${kpi.attendancePct}`)
  assert(kpi.totalAssigned >= 7, `Admin KPI connected>=7 got ${kpi.totalAssigned}`)

  const health = getDashboardWeeklyIjtemaHealthSlice()
  assert(health.current === 5, `health present=5 got ${health.current}`)
  assert(health.total === 7, `health remindedTotal=7 got ${health.total}`)
  assert(health.pct === 71, `health attendance%=71 got ${health.pct}`)

  const metrics = getWeeklyIjtemaDashboardMetricsView()
  assert(metrics.present === 5, `Compliance Present=5 got ${metrics.present}`)
  assert(metrics.absent === 0, `Compliance Absent=0 got ${metrics.absent}`)

  for (let i = 0; i < 5; i += 1) {
    assert(
      getWeeklyIjtemaCurrentAttendanceView(femaleKarkuns[i].id).status === 'Present',
      `current Present ${i + 1}`,
    )
  }

  const summaries = getWeeklyIjtemaAttendanceSummariesView()
  const presentRows = summaries.filter((row) => row.status === 'Present')
  assert(presentRows.length === 5, `summaries Present=5 got ${presentRows.length}`)
  assert(
    summaries.every((row) => row.status !== 'Present' || !row.remarks?.includes('Campaign:')),
    'no legacy campaign remarks on Present rows',
  )

  const ruknRows = CanonicalMetricProviders.weeklyIjtema.getActiveRuknRows()
  const femaleRow = ruknRows.find((row) => row.ruknId === femaleRukn!.id)
  assert(Boolean(femaleRow), 'female rukn row present')
  assert(femaleRow!.present === 5, `rukn-wise present=5 got ${femaleRow!.present}`)
  assert(femaleRow!.attendancePct === 71, `rukn-wise %=71 got ${femaleRow!.attendancePct}`)
  assert(femaleRow!.submitted === true, 'rukn-wise submitted')

  // Male Open event with zero marks must not zero-out Admin aggregates.
  void maleEvent.event.id
}

function testNoLegacyWhenOpenExists(): void {
  clearWeeklyIjtemaStore()
  clearIjtemaAttendanceStore()
  clearAssignmentStore()
  MOCK_KARKUN_REGISTRY.length = 0

  const maleRukn = ruknMaster.find((r) => r.status === 'active' && r.gender === 'Male')
  assert(Boolean(maleRukn), 'male rukn')
  const meetingDate = new Date().toISOString().slice(0, 10)
  const created = createWeeklyIjtemaEvent({
    meetingDate,
    title: 'KC-037C2E Open Only',
    createdBy: 'Admin',
    audienceGender: 'Male',
  })
  assert(created.success, 'open event')

  seedKarkun({
    id: 'K-037C2E-LEG',
    name: 'Legacy Trap',
    gender: 'Male',
    ruknId: maleRukn!.id,
    ruknName: maleRukn!.name,
  })

  const view = getWeeklyIjtemaCurrentAttendanceView('K-037C2E-LEG')
  assert(view.source === 'canonical', 'open window stays canonical')
  assert(view.status === 'Not recorded', 'missing mark is Not recorded')

  const summary = getWeeklyIjtemaAttendanceSummariesView().find(
    (row) => row.karkunId === 'K-037C2E-LEG',
  )
  assert(summary?.status === 'Not recorded', 'summaries do not legacy-fallback')
}

const cases = [
  run('Admin aggregates Female writes while Male Open empty', testAdminAggregatesGenderScopedWrites),
  run('Open event blocks legacy summary fallback', testNoLegacyWhenOpenExists),
]

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-037C2E',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
process.exit(failed.length === 0 ? 0 : 1)
