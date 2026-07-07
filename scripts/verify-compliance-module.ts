/**
 * Sprint 12 Phase 4 — Compliance Module validation.
 * Run: npx vite-node scripts/verify-compliance-module.ts
 */
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { adminCompliancePath, ROUTES } from '@/constants/routes'
import {
  COMPLIANCE_PENDING_STATUS,
  getComplianceEmptyState,
  resolveComplianceSection,
  resolveComplianceViewFilter,
} from '@/lib/complianceNavigation'
import { getComplianceStatusStyle } from '@/lib/complianceStatusStyles'
import {
  bulkUpdateBaitulMaal,
  getAllBaitulMaalSummaries,
  getBaitulMaalDashboardMetrics,
  updateBaitulMaal,
} from '@/services/baitulMaalService'
import {
  bulkUpdateIjtemaAttendance,
  getAllIjtemaAttendanceSummaries,
  getCurrentIjtemaAttendance,
  getIjtemaAttendanceDashboardMetrics,
  updateIjtemaAttendance,
} from '@/services/ijtemaAttendanceService'
import {
  bulkUpdateJihMonthlyReport,
  bulkUpdateJihRegistration,
  getAllJihWebPortalSummaries,
  getCurrentMonthReportingStatus,
  getJihWebPortalDashboardMetrics,
  getRegistrationForKarkun,
  updateJihMonthlyReport,
  updateJihRegistration,
} from '@/services/jihWebPortalService'
import { clearBaitulMaalStore } from '@/stores/baitulMaalStore'
import { clearIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { clearJihWebPortalStore } from '@/stores/jihWebPortalStore'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

const now = new Date().toISOString()

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function createKarkun(id: string, name: string): KarkunRegistryRecord {
  return {
    id,
    name,
    gender: 'Male',
    mobile: '03001234567',
    place: 'Karachi',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    updatedBy: 'Validation',
    address: '',
    area: '',
    assignedRukn: '',
    assignedRuknId: '',
    assignmentStatus: 'Available',
    campaignStatus: 'not_assigned',
    visitStatus: 'none',
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: '',
    isArchived: false,
  }
}

function reset(): void {
  clearIjtemaAttendanceStore()
  clearJihWebPortalStore()
  clearBaitulMaalStore()
  MOCK_KARKUN_REGISTRY.length = 0
}

function verifyDeepLinks(): void {
  assert(
    adminCompliancePath('ijtema', 'Present') ===
      `${ROUTES.ADMIN_COMPLIANCE}?section=ijtema&status=Present`,
    'Ijtema Present deep link must be correct',
  )
  assert(
    adminCompliancePath('jih-registration', 'Not Registered') ===
      `${ROUTES.ADMIN_COMPLIANCE}?section=jih-registration&status=Not+Registered`,
    'JIH registration deep link must encode status',
  )
  assert(
    adminCompliancePath('monthly-reporting', 'Pending') ===
      `${ROUTES.ADMIN_COMPLIANCE}?section=monthly-reporting&status=Pending`,
    'Monthly reporting deep link must be correct',
  )
  assert(
    adminCompliancePath('baitul-maal', 'Paid') ===
      `${ROUTES.ADMIN_COMPLIANCE}?section=baitul-maal&status=Paid`,
    'Bait-ul-Maal deep link must be correct',
  )
  assert(
    resolveComplianceSection('weekly-ijtema') === 'ijtema',
    'Section aliases must resolve',
  )
}

function verifyPendingView(): void {
  const pendingIjtema = resolveComplianceViewFilter('ijtema', '', false)
  assert(pendingIjtema.isPendingView, 'Default compliance view must be pending-first')
  assert(
    pendingIjtema.effectiveStatus === COMPLIANCE_PENDING_STATUS.ijtema,
    'Pending Ijtema filter must default to Not recorded',
  )

  const allView = resolveComplianceViewFilter('ijtema', '', true)
  assert(!allView.isPendingView, 'view=all must disable pending filter')
  assert(allView.effectiveStatus === '', 'view=all must show all records')

  const filtered = resolveComplianceViewFilter('baitul-maal', 'Paid', false)
  assert(!filtered.isPendingView, 'Explicit status must override pending default')
  assert(filtered.effectiveStatus === 'Paid', 'Explicit status must be applied')
}

function verifyEmptyStates(): void {
  const pendingIjtema = getComplianceEmptyState('ijtema', true)
  assert(pendingIjtema.title === 'No Pending Ijtema', 'Pending Ijtema empty title must match spec')

  const pendingReports = getComplianceEmptyState('monthly-reporting', true)
  assert(
    pendingReports.title === 'No Pending Reports',
    'Pending reports empty title must match spec',
  )
}

function verifyStatusBadges(): void {
  const statuses = [
    'Present',
    'Absent',
    'Informed',
    'Not recorded',
    'Registered',
    'Not Registered',
    'Submitted',
    'Pending',
    'Paid',
  ] as const

  for (const status of statuses) {
    assert(
      getComplianceStatusStyle(status).includes('border'),
      `Status badge style must exist for ${status}`,
    )
  }
}

function verifyIjtemaWorkflow(k1: string, k2: string, k3: string): void {
  const before = getIjtemaAttendanceDashboardMetrics()
  void before

  assert(
    updateIjtemaAttendance({ karkunId: k1, status: 'Present' }).success,
    'Mark Present must succeed',
  )
  assert(
    updateIjtemaAttendance({ karkunId: k2, status: 'Absent' }).success,
    'Mark Absent must succeed',
  )
  assert(
    updateIjtemaAttendance({ karkunId: k3, status: 'Informed' }).success,
    'Mark Informed must succeed',
  )

  assert(
    getCurrentIjtemaAttendance(k3).status === 'Informed',
    'Informed status must persist after update',
  )

  const metrics = getIjtemaAttendanceDashboardMetrics()
  assert(metrics.present === 1, 'Dashboard present count must update')
  assert(metrics.absent === 1, 'Dashboard absent count must update')
  assert(metrics.informed === 1, 'Dashboard informed count must update')

  const summaries = getAllIjtemaAttendanceSummaries()
  assert(summaries.length === 3, 'Ijtema summaries must include all active Karkuns')

  const bulk = bulkUpdateIjtemaAttendance({
    karkunIds: [k1, k2],
    status: 'Informed',
  })
  assert(bulk.success && bulk.updated === 2, 'Bulk Ijtema update must succeed')

  const updatedMetrics = getIjtemaAttendanceDashboardMetrics()
  assert(updatedMetrics.informed === 3, 'Bulk update must refresh dashboard informed count')
}

function verifyJihWorkflow(k1: string, k2: string): void {
  assert(
    updateJihRegistration({
      karkunId: k1,
      status: 'Registered',
      registrationDate: '2026-07-01',
    }).success,
    'JIH registration must succeed',
  )
  assert(
    updateJihMonthlyReport({
      karkunId: k1,
      status: 'Submitted',
      submissionDate: '2026-07-01',
    }).success,
    'Monthly report submission must succeed',
  )

  assert(
    getRegistrationForKarkun(k1).status === 'Registered',
    'Registration status must persist',
  )
  assert(
    getCurrentMonthReportingStatus(k1).status === 'Submitted',
    'Monthly report status must persist',
  )

  const bulkRegistration = bulkUpdateJihRegistration({
    karkunIds: [k2],
    status: 'Registered',
  })
  assert(bulkRegistration.success && bulkRegistration.updated === 1, 'Bulk JIH registration must work')

  const bulkReport = bulkUpdateJihMonthlyReport({
    karkunIds: [k2],
    status: 'Pending',
  })
  assert(bulkReport.success && bulkReport.updated === 1, 'Bulk monthly report must work')

  const metrics = getJihWebPortalDashboardMetrics()
  assert(metrics.registered === 2, 'Registered dashboard count must update')
  assert(metrics.pendingReports === 1, 'Pending reports count must reflect submitted/pending mix')
  assert(metrics.submittedReports === 1, 'Submitted reports count must update')

  const summaries = getAllJihWebPortalSummaries()
  assert(summaries.length === 3, 'JIH summaries must include all active Karkuns')
}

function verifyBaitulMaalWorkflow(k1: string, k2: string, k3: string): void {
  assert(
    updateBaitulMaal({ karkunId: k1, status: 'Paid', paymentDate: '2026-07-01' }).success,
    'Mark Paid must succeed',
  )

  const bulk = bulkUpdateBaitulMaal({
    karkunIds: [k2, k3],
    status: 'Pending',
  })
  assert(bulk.success, 'Bulk Bait-ul-Maal update must succeed')

  const metrics = getBaitulMaalDashboardMetrics()
  assert(metrics.paid === 1, 'Paid dashboard count must update')
  assert(metrics.pending === 2, 'Pending dashboard count must update')

  const summaries = getAllBaitulMaalSummaries()
  assert(summaries.length === 3, 'Bait-ul-Maal summaries must include all active Karkuns')
}

reset()

const k1 = 'compliance-k1'
const k2 = 'compliance-k2'
const k3 = 'compliance-k3'

MOCK_KARKUN_REGISTRY.push(
  createKarkun(k1, 'Compliance Alpha'),
  createKarkun(k2, 'Compliance Beta'),
  createKarkun(k3, 'Compliance Gamma'),
)

verifyDeepLinks()
verifyPendingView()
verifyEmptyStates()
verifyStatusBadges()
verifyIjtemaWorkflow(k1, k2, k3)
verifyJihWorkflow(k1, k2)
verifyBaitulMaalWorkflow(k1, k2, k3)

reset()

console.log('Compliance module validation passed.')
