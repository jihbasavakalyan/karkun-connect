import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import {
  getIjtemaAttendanceRecord,
  upsertIjtemaAttendanceRecord,
} from '@/stores/ijtemaAttendanceStore'
import type {
  BulkUpdateIjtemaAttendanceInput,
  IjtemaAttendanceDashboardMetrics,
  IjtemaAttendanceKarkunSummary,
  IjtemaAttendanceRecord,
  IjtemaAttendanceStatus,
  UpdateIjtemaAttendanceInput,
} from '@/types/ijtemaAttendance'
import {
  formatWeekLabel,
  getWeekEndingDate,
} from '@/types/ijtemaAttendance'
import {
  validateBulkIjtemaAttendanceInput,
  validateIjtemaAttendanceUpdate,
} from '@/validation/ijtemaAttendanceValidation'

let initialized = false

function nowIso(): string {
  return new Date().toISOString()
}

export function initializeIjtemaAttendanceCompliance(): void {
  if (initialized) return
  initialized = true
}

export function getFilterWeekEndingDate(weekFilter: string, date = new Date()): string {
  return weekFilter || getWeekEndingDate(date)
}

export function getIjtemaAttendanceForKarkun(
  karkunId: string,
  weekEndingDate: string,
): {
  weekEndingDate: string
  weekLabel: string
  status: IjtemaAttendanceStatus | 'Not recorded'
  remarks?: string
  updatedAt?: string
  updatedBy?: string
} {
  initializeIjtemaAttendanceCompliance()
  const record = getIjtemaAttendanceRecord(karkunId, weekEndingDate)

  return {
    weekEndingDate,
    weekLabel: formatWeekLabel(weekEndingDate),
    status: record?.status ?? 'Not recorded',
    remarks: record?.remarks,
    updatedAt: record?.updatedAt,
    updatedBy: record?.updatedBy,
  }
}

export function getCurrentIjtemaAttendance(karkunId: string) {
  return getIjtemaAttendanceForKarkun(karkunId, getWeekEndingDate())
}

export function updateIjtemaAttendance(
  input: UpdateIjtemaAttendanceInput,
): { success: true; record: IjtemaAttendanceRecord } | { success: false; error: string } {
  initializeIjtemaAttendanceCompliance()
  const weekEndingDate = input.weekEndingDate ?? getWeekEndingDate()
  const validation = validateIjtemaAttendanceUpdate({ ...input, weekEndingDate })
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const karkun = getKarkunById(input.karkunId)
  if (!karkun) {
    return { success: false, error: 'Karkun not found.' }
  }

  const record = upsertIjtemaAttendanceRecord({
    karkunId: input.karkunId,
    weekEndingDate,
    status: input.status,
    remarks: input.remarks?.trim() || undefined,
    updatedAt: nowIso(),
    updatedBy: input.updatedBy ?? 'Administrator',
  })

  return { success: true, record }
}

export function bulkUpdateIjtemaAttendance(
  input: BulkUpdateIjtemaAttendanceInput,
): { success: true; updated: number } | { success: false; error: string } {
  initializeIjtemaAttendanceCompliance()
  const weekEndingDate = input.weekEndingDate ?? getWeekEndingDate()
  const validation = validateBulkIjtemaAttendanceInput({ ...input, weekEndingDate })
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  let updated = 0
  for (const karkunId of input.karkunIds) {
    const result = updateIjtemaAttendance({
      karkunId,
      weekEndingDate,
      status: input.status,
      remarks: input.remarks,
      updatedBy: input.updatedBy,
    })
    if (result.success) {
      updated += 1
    }
  }

  return { success: true, updated }
}

export function getIjtemaAttendanceDashboardMetrics(
  weekEndingDate = getWeekEndingDate(),
): IjtemaAttendanceDashboardMetrics {
  initializeIjtemaAttendanceCompliance()
  const activeKarkuns = MOCK_KARKUN_REGISTRY.filter((k) => !k.isArchived)

  let present = 0
  let absent = 0
  let informed = 0

  for (const karkun of activeKarkuns) {
    const record = getIjtemaAttendanceRecord(karkun.id, weekEndingDate)
    if (!record) continue

    if (record.status === 'Present') present += 1
    if (record.status === 'Absent') absent += 1
    if (record.status === 'Informed') informed += 1
  }

  return { present, absent, informed }
}

export function getAllIjtemaAttendanceSummaries(
  weekEndingDate = getWeekEndingDate(),
): IjtemaAttendanceKarkunSummary[] {
  initializeIjtemaAttendanceCompliance()

  return MOCK_KARKUN_REGISTRY.filter((k) => !k.isArchived).map((karkun) => {
    const attendance = getIjtemaAttendanceForKarkun(karkun.id, weekEndingDate)
    return {
      karkunId: karkun.id,
      karkunName: karkun.name,
      weekEndingDate: attendance.weekEndingDate,
      weekLabel: attendance.weekLabel,
      status: attendance.status,
      remarks: attendance.remarks,
      updatedAt: attendance.updatedAt,
    }
  })
}

export function matchesIjtemaAttendanceFilters(
  karkunId: string,
  statusFilter: string,
  weekFilter: string,
): boolean {
  initializeIjtemaAttendanceCompliance()

  const hasStatusFilter = Boolean(statusFilter)
  const hasWeekFilter = Boolean(weekFilter)

  if (!hasStatusFilter && !hasWeekFilter) {
    return true
  }

  const weekEndingDate = getFilterWeekEndingDate(weekFilter)
  const attendance = getIjtemaAttendanceForKarkun(karkunId, weekEndingDate)

  if (hasStatusFilter && attendance.status !== statusFilter) {
    return false
  }

  return true
}

export function ensureIjtemaAttendanceRecord(karkunId: string): void {
  initializeIjtemaAttendanceCompliance()
  void karkunId
}

initializeIjtemaAttendanceCompliance()
