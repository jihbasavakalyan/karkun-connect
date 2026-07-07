import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getAllKarkuns } from '@/lib/peopleStore'
import {
  getMonthlyReport,
  getRegistration,
  upsertMonthlyReport,
  upsertRegistration,
} from '@/stores/jihWebPortalStore'
import type {
  BulkUpdateJihMonthlyReportInput,
  BulkUpdateJihRegistrationInput,
  JihMonthlyReportingStatus,
  JihWebPortalDashboardMetrics,
  JihWebPortalKarkunSummary,
  JihWebPortalRegistration,
  UpdateJihMonthlyReportInput,
  UpdateJihRegistrationInput,
} from '@/types/jihWebPortal'
import {
  validateMonthlyReportUpdate,
  validateRegistrationUpdate,
} from '@/validation/jihWebPortalValidation'

let initialized = false

function nowIso(): string {
  return new Date().toISOString()
}

export function getCurrentMonthKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function createDefaultRegistration(karkunId: string): JihWebPortalRegistration {
  return {
    karkunId,
    status: 'Not Registered',
    updatedAt: nowIso(),
    updatedBy: 'System',
  }
}

export function initializeJihWebPortalCompliance(): void {
  if (initialized) return
  initialized = true
}

export function resetJihWebPortalComplianceInitialization(): void {
  initialized = false
}

export function ensureRegistration(karkunId: string): JihWebPortalRegistration {
  initializeJihWebPortalCompliance()
  return getRegistration(karkunId) ?? upsertRegistration(createDefaultRegistration(karkunId))
}

export function getRegistrationForKarkun(karkunId: string): JihWebPortalRegistration {
  return ensureRegistration(karkunId)
}

export function getCurrentMonthReportingStatus(karkunId: string): {
  monthKey: string
  monthLabel: string
  status: JihMonthlyReportingStatus
  submissionDate?: string
  remarks?: string
} {
  initializeJihWebPortalCompliance()
  const monthKey = getCurrentMonthKey()
  const registration = ensureRegistration(karkunId)

  if (registration.status !== 'Registered') {
    return {
      monthKey,
      monthLabel: formatMonthLabel(monthKey),
      status: 'Pending',
    }
  }

  const report = getMonthlyReport(karkunId, monthKey)
  return {
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    status: report?.status ?? 'Pending',
    submissionDate: report?.submissionDate,
    remarks: report?.remarks,
  }
}

export function updateJihRegistration(
  input: UpdateJihRegistrationInput,
): { success: true; registration: JihWebPortalRegistration } | { success: false; error: string } {
  initializeJihWebPortalCompliance()
  const validation = validateRegistrationUpdate(input)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const karkun = getKarkunById(input.karkunId)
  if (!karkun) {
    return { success: false, error: 'Karkun not found.' }
  }

  const registration = upsertRegistration({
    karkunId: input.karkunId,
    status: input.status,
    registrationNumber: input.registrationNumber?.trim() || undefined,
    registrationDate:
      input.status === 'Registered' ? input.registrationDate?.trim() : undefined,
    remarks: input.remarks?.trim() || undefined,
    updatedAt: nowIso(),
    updatedBy: input.updatedBy ?? 'Administrator',
  })

  return { success: true, registration }
}

export function updateJihMonthlyReport(
  input: UpdateJihMonthlyReportInput,
): { success: true } | { success: false; error: string } {
  initializeJihWebPortalCompliance()
  const monthKey = input.monthKey ?? getCurrentMonthKey()
  const validation = validateMonthlyReportUpdate({ ...input, monthKey })
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  upsertMonthlyReport({
    karkunId: input.karkunId,
    monthKey,
    status: input.status,
    submissionDate:
      input.status === 'Submitted' ? input.submissionDate?.trim() : undefined,
    remarks: input.remarks?.trim() || undefined,
    updatedAt: nowIso(),
    updatedBy: input.updatedBy ?? 'Administrator',
  })

  return { success: true }
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function bulkUpdateJihRegistration(
  input: BulkUpdateJihRegistrationInput,
): { success: true; updated: number } | { success: false; error: string } {
  initializeJihWebPortalCompliance()

  let updated = 0
  for (const karkunId of input.karkunIds) {
    const existing = getRegistrationForKarkun(karkunId)
    const result = updateJihRegistration({
      karkunId,
      status: input.status,
      registrationDate:
        input.status === 'Registered'
          ? input.registrationDate ?? existing.registrationDate ?? todayDate()
          : undefined,
      registrationNumber: existing.registrationNumber,
      updatedBy: input.updatedBy,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    updated += 1
  }

  return { success: true, updated }
}

export function bulkUpdateJihMonthlyReport(
  input: BulkUpdateJihMonthlyReportInput,
): { success: true; updated: number } | { success: false; error: string } {
  initializeJihWebPortalCompliance()

  let updated = 0
  for (const karkunId of input.karkunIds) {
    const result = updateJihMonthlyReport({
      karkunId,
      status: input.status,
      submissionDate:
        input.status === 'Submitted' ? input.submissionDate ?? todayDate() : undefined,
      updatedBy: input.updatedBy,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    updated += 1
  }

  return { success: true, updated }
}

export function getJihWebPortalDashboardMetrics(): JihWebPortalDashboardMetrics {
  initializeJihWebPortalCompliance()
  const monthKey = getCurrentMonthKey()
  const activeKarkuns = getAllKarkuns()
  const registrations = activeKarkuns.map((k) => ensureRegistration(k.id))

  const registered = registrations.filter((r) => r.status === 'Registered').length
  const notRegistered = registrations.length - registered

  let pendingReports = 0
  let submittedReports = 0

  for (const karkun of activeKarkuns) {
    const registration = ensureRegistration(karkun.id)
    if (registration.status !== 'Registered') continue

    const report = getMonthlyReport(karkun.id, monthKey)
    if (report?.status === 'Submitted') {
      submittedReports += 1
    } else {
      pendingReports += 1
    }
  }

  return {
    registered,
    notRegistered,
    pendingReports,
    submittedReports,
  }
}

export function getAllJihWebPortalSummaries(): JihWebPortalKarkunSummary[] {
  initializeJihWebPortalCompliance()
  return getAllKarkuns().map((karkun) => {
    const registration = ensureRegistration(karkun.id)
    const monthly = getCurrentMonthReportingStatus(karkun.id)
    return {
      karkunId: karkun.id,
      karkunName: karkun.name,
      registration,
      currentMonth: monthly.monthLabel,
      monthlyStatus: monthly.status,
      submissionDate: monthly.submissionDate,
      monthlyRemarks: monthly.remarks,
    }
  })
}

export function matchesJihPortalFilters(
  karkunId: string,
  registrationFilter: string,
  reportingFilter: string,
): boolean {
  initializeJihWebPortalCompliance()
  const registration = ensureRegistration(karkunId)
  const monthly = getCurrentMonthReportingStatus(karkunId)

  if (registrationFilter && registration.status !== registrationFilter) {
    return false
  }

  if (reportingFilter) {
    if (registration.status !== 'Registered') {
      return false
    }
    if (monthly.status !== reportingFilter) {
      return false
    }
  }

  return true
}

