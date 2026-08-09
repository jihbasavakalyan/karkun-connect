/**
 * Phase 3 — production-shaped reporting / data-integrity verification.
 * Run: npx vite-node scripts/verify-phase3-reporting-integrity.ts
 *
 * Fixtures shaped like Phase 2 production evidence. No Firestore writes.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  MOCK_KARKUN_REGISTRY,
  updateKarkunMeetingOutcomes,
} from '../src/constants/mockKarkunRegistry'
import { clearAssignmentStore, replaceAllAssignments } from '../src/stores/assignmentStore'
import { clearIjtemaAttendanceStore, upsertIjtemaAttendanceRecord } from '../src/stores/ijtemaAttendanceStore'
import { clearMonthlyBaitulMaalStore, upsertMonthlyBaitulMaalCycle, upsertMonthlyBaitulMaalSubmission } from '../src/stores/monthlyBaitulMaalStore'
import { clearWeeklyIjtemaStore, upsertWeeklyIjtemaSubmission } from '../src/stores/weeklyIjtemaStore'
import { getRegistration } from '../src/stores/jihWebPortalStore'
import {
  getCurrentMonthlyBaitulMaalCycle,
  getMonthlyBaitulMaalReport,
  getOpenMonthlyBaitulMaalCycle,
  pickPreferredOpenMonthlyBaitulMaalCycle,
} from '../src/services/monthlyBaitulMaalService'
import { getCurrentMonthKey } from '../src/services/jihWebPortalService'
import {
  closeWeeklyIjtemaAttendance,
  createWeeklyIjtemaEvent,
  getWeeklyIjtemaDashboardKpi,
  getWeeklyIjtemaEventTrackSummary,
  getWeeklyIjtemaReport,
} from '../src/services/weeklyIjtemaService'
import {
  classifyBaitulMaalStoredRecord,
  classifyIjtemaLegacyRecord,
} from '../src/lib/reporting/statusNormalization'
import type { AssignmentRecord } from '../src/types/assignment'
import type { KarkunRegistryRecord } from '../src/types/karkun-registry.types'
import type { MonthlyBaitulMaalCycle } from '../src/types/monthlyBaitulMaal'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`)
  console.log(`OK: ${message}`)
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
    mobile: `0300${input.id.replace(/\D/g, '').padEnd(7, '0').slice(0, 7)}`,
    place: 'Hyderabad',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    updatedBy: 'Verification',
    address: '',
    area: '',
    assignedRukn: input.ruknName,
    assignedRuknId: input.ruknId,
    assignmentStatus: 'Assigned',
    campaignStatus: 'active',
    visitStatus: 'none',
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: '',
    isArchived: false,
    category: 'Karkun',
  }
  MOCK_KARKUN_REGISTRY.push(karkun)
}

// ========== Phase A: Bait-ul-Maal ==========
clearMonthlyBaitulMaalStore()

const july: MonthlyBaitulMaalCycle = {
  id: 'mbm_ms0tcz7t_14goem',
  title: 'Baitul Maal — July 2026',
  monthKey: '2026-07',
  status: 'Open',
  submissionDeadline: '2026-08-02T00:00:00.000Z',
  createdAt: '2026-07-25T20:20:29.897Z',
  createdBy: 'Admin',
  updatedAt: '2026-07-25T20:20:29.897Z',
  updatedBy: 'Admin',
}
const august: MonthlyBaitulMaalCycle = {
  id: 'mbm_msccj411_gg1p6v',
  title: 'Baitul Maal — August 2026',
  monthKey: '2026-08',
  status: 'Open',
  submissionDeadline: '2026-09-02T00:00:00.000Z',
  createdAt: '2026-08-02T22:02:36.709Z',
  createdBy: 'Admin',
  updatedAt: '2026-08-02T22:02:36.709Z',
  updatedBy: 'Admin',
}

upsertMonthlyBaitulMaalCycle(july)
upsertMonthlyBaitulMaalCycle(august)

assert(
  pickPreferredOpenMonthlyBaitulMaalCycle([july, august], '2026-08')?.id === august.id,
  'pickPreferredOpen prefers August for monthKey 2026-08 (not first Open July)',
)
assert(
  pickPreferredOpenMonthlyBaitulMaalCycle([july, august], '2026-07')?.id === july.id,
  'July remains selectable for monthKey 2026-07',
)

const wallMonth = getCurrentMonthKey()
if (wallMonth === '2026-08') {
  assert(getOpenMonthlyBaitulMaalCycle()?.id === august.id, 'getOpen → August (wall clock Aug)')
  assert(getCurrentMonthlyBaitulMaalCycle()?.id === august.id, 'getCurrent → August (wall clock Aug)')
} else if (wallMonth === '2026-07') {
  assert(getOpenMonthlyBaitulMaalCycle()?.id === july.id, 'getOpen → July (wall clock Jul)')
} else {
  // Outside fixture months: newest Open monthKey wins as fallback
  assert(
    getOpenMonthlyBaitulMaalCycle()?.id === august.id,
    'getOpen falls back to newest Open monthKey (August) when wall month has no Open',
  )
}

clearAssignmentStore()
MOCK_KARKUN_REGISTRY.length = 0
seedKarkun({
  id: 'kr-664',
  name: 'SHAMSUDDIN',
  gender: 'Male',
  ruknId: 'R013',
  ruknName: 'Tafheemuddin',
})
const nowBm = new Date().toISOString()
replaceAllAssignments(
  [
    {
      assignmentId: 'A-phase3-r013',
      assignmentNumber: 'ASN-phase3-bm',
      ruknId: 'R013',
      karkunId: 'kr-664',
      assignedDate: '2026-08-01',
      effectiveFrom: '2026-08-01',
      status: 'Active',
      assignedBy: 'Administrator',
      createdAt: nowBm,
      updatedAt: nowBm,
    } satisfies AssignmentRecord,
  ],
  2,
)

upsertMonthlyBaitulMaalSubmission({
  id: `${august.id}:R013`,
  eventId: august.id,
  ruknId: 'R013',
  ruknName: 'Tafheemuddin',
  marks: [{ karkunId: 'kr-664', karkunName: 'SHAMSUDDIN', status: 'Contributed' }],
  submittedAt: '2026-08-07T13:02:12.300Z',
  submittedBy: 'R013',
  updatedAt: '2026-08-07T13:02:12.300Z',
  updatedBy: 'R013',
})

const augReport = getMonthlyBaitulMaalReport(august.id)
assert(Boolean(augReport), 'August report loads')
assert((augReport?.contributed ?? 0) >= 1, 'R013 August contribution appears in August report')
const julyReport = getMonthlyBaitulMaalReport(july.id)
assert(Boolean(julyReport), 'July remains accessible by cycleId')
assert((julyReport?.contributed ?? 0) === 0, 'July report untouched by August marks')

// ========== Phase C/D: Weekly Ijtema ==========
clearWeeklyIjtemaStore()
clearIjtemaAttendanceStore()
clearAssignmentStore()
MOCK_KARKUN_REGISTRY.length = 0

seedKarkun({
  id: 'kr-043',
  name: 'MD NASEERUDDIN Bhosge',
  gender: 'Male',
  ruknId: 'R003',
  ruknName: 'Mohd Minhajuddin',
})
const now = new Date().toISOString()
replaceAllAssignments(
  [
    {
      assignmentId: 'A-phase3-r003',
      assignmentNumber: 'ASN-phase3-1',
      ruknId: 'R003',
      karkunId: 'kr-043',
      assignedDate: '2026-08-01',
      effectiveFrom: '2026-08-01',
      status: 'Active',
      assignedBy: 'Administrator',
      createdAt: now,
      updatedAt: now,
    } satisfies AssignmentRecord,
  ],
  2,
)

const hist = createWeeklyIjtemaEvent({
  meetingDate: '2026-08-02',
  createdBy: 'Admin',
  audienceGender: 'Male',
  title: "Men's Weekly Ijtema",
})
assert(hist.success, 'create historical Male event 2026-08-02')
if (!hist.success) throw new Error('hist create failed')

// Bypass deadline gate for historical fixture (Phase 2 Closed week already past deadline).
upsertWeeklyIjtemaSubmission({
  id: `${hist.event.id}:R003`,
  eventId: hist.event.id,
  ruknId: 'R003',
  ruknName: 'Mohd Minhajuddin',
  marks: [
    {
      karkunId: 'kr-043',
      karkunName: 'MD NASEERUDDIN Bhosge',
      status: 'Present',
      reminded: true,
    },
  ],
  submittedAt: '2026-08-02T06:39:22.199Z',
  submittedBy: 'R003',
  updatedAt: '2026-08-02T06:39:22.199Z',
  updatedBy: 'R003',
})
closeWeeklyIjtemaAttendance(hist.event.id, 'Admin')

const openWeek = createWeeklyIjtemaEvent({
  meetingDate: '2026-08-09',
  createdBy: 'system:attendance-window',
  audienceGender: 'Male',
  title: "Men's Weekly Ijtema",
})
assert(openWeek.success, 'create current Open Male event 2026-08-09')
if (!openWeek.success) throw new Error('open create failed')

upsertIjtemaAttendanceRecord({
  karkunId: 'kr-021',
  weekEndingDate: '2026-08-09',
  status: 'Present',
  remarks: 'Campaign: Discussed',
  updatedAt: '2026-08-08T14:25:25.956Z',
  updatedBy: 'R002',
  ruknId: 'R002',
})
upsertIjtemaAttendanceRecord({
  karkunId: 'kr-001',
  weekEndingDate: '2026-08-09',
  status: 'Present',
  updatedAt: '2026-08-04T16:50:27.739Z',
  updatedBy: 'R032',
  ruknId: 'R032',
})

const track = getWeeklyIjtemaEventTrackSummary(openWeek.event.id)
assert(Boolean(track), 'track summary for Open week')
assert(track!.canonicalAttendanceMarks === 0, 'Open week canonical attendance is 0')
assert(track!.legacyResponsesForWeek === 2, 'legacy responses detected for Open week')
assert(track!.legacyCommitments === 1, 'Campaign:Discussed counted as commitment')
assert(track!.legacyAttendanceLike === 1, 'plain Present counted as attendance-like')
assert(track!.emptyOpenWithLegacyDetected === true, 'empty-open-with-legacy flag set')

const openKpi = getWeeklyIjtemaDashboardKpi({
  audienceGender: 'Male',
  meetingDate: '2026-08-09',
})
assert(openKpi.present === 0, 'Open KPI Present stays 0 (commitment not merged into attendance)')

const histReport = getWeeklyIjtemaReport(hist.event.id)
assert(Boolean(histReport), 'historical 2026-08-02 report remains accessible')
assert((histReport?.present ?? 0) >= 1, 'historical Present remains reportable')

assert(
  classifyIjtemaLegacyRecord({ status: 'Present', remarks: 'Campaign: Committed' }).kind ===
    'commitment',
  'Campaign:Committed is commitment, not attendance',
)
assert(
  classifyIjtemaLegacyRecord({ status: 'Present', remarks: null }).kind === 'attendance_like',
  'plain Present is attendance-like',
)
assert(
  classifyBaitulMaalStoredRecord({ status: 'Paid' }).canonicalContributionEquivalent ===
    'Contributed',
  'Paid maps to Contributed at reporting boundary',
)
assert(
  classifyBaitulMaalStoredRecord({ status: 'Pending', remarks: 'Campaign: Committed' }).bucket ===
    'campaign_committed',
  'Campaign:Committed BM classified without destroying stored Pending',
)

// ========== Phase E: JIH ==========
seedKarkun({
  id: 'kr-jih-phase3',
  name: 'JIH Phase3',
  gender: 'Male',
  ruknId: 'R020',
  ruknName: 'Mohammad Aslam',
})
updateKarkunMeetingOutcomes('kr-jih-phase3', {
  jihAppRegistrationStatus: 'Registered',
  syncJihPortal: true,
})
assert(
  MOCK_KARKUN_REGISTRY.find((k) => k.id === 'kr-jih-phase3')?.jihAppRegistrationStatus ===
    'Registered',
  'person SoT Registered',
)
assert(getRegistration('kr-jih-phase3')?.status === 'Registered', 'portal mirrored Registered')

updateKarkunMeetingOutcomes('kr-jih-phase3', {
  jihAppRegistrationStatus: 'Recommended',
  syncJihPortal: true,
})
assert(
  getRegistration('kr-jih-phase3')?.status === 'Not Registered',
  'non-Registered person mirrors portal Not Registered',
)
assert(
  MOCK_KARKUN_REGISTRY.find((k) => k.id === 'kr-jih-phase3')?.jihAppRegistrationStatus ===
    'Recommended',
  'person SoT remains Recommended',
)

// ========== Phase G: PDF ==========
const reportCenter = readFileSync(
  resolve('src/components/reporting/ReportCenterPanel.tsx'),
  'utf8',
)
assert(reportCenter.includes('includeZipSnapshot: false'), 'ReportCenter disables auto JSON snapshot')
assert(
  !reportCenter.includes("includeZipSnapshot: config.detailLevel === 'audit'"),
  'audit detailLevel no longer triggers JSON download',
)
const generateConfigured = readFileSync(
  resolve('src/lib/reporting/v2/generateConfiguredReport.ts'),
  'utf8',
)
assert(
  generateConfigured.includes("config.outputType === 'json'"),
  'zip snapshot only when explicit json output',
)

// ========== Phase B: Matrix durability ==========
const matrix = readFileSync(
  resolve('src/components/execution/CampaignExecutionMatrix.tsx'),
  'utf8',
)
assert(matrix.includes('waitForPendingWrites: true'), 'Matrix waits for pending writes')
assert(
  matrix.includes('Weekly Ijtema Commitment saved successfully'),
  'Ijtema cell confirms durable save',
)
assert(matrix.includes('Baitul Maal status saved successfully'), 'Baitul cell confirms durable save')
assert(matrix.includes('JIH App status saved successfully'), 'JIH cell confirms durable save')

console.log('\nPhase 3 reporting integrity verification passed.')
