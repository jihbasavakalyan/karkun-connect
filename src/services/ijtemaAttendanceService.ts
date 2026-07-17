import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getAllKarkuns } from '@/lib/peopleStore'
import { getActiveCampaign } from '@/services/campaignService'
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
  normalizeIjtemaAttendanceStatus,
} from '@/types/ijtemaAttendance'
import {
  validateBulkIjtemaAttendanceInput,
  validateIjtemaAttendanceUpdate,
} from '@/validation/ijtemaAttendanceValidation'

let initialized = false

function nowIso(): string {
  return new Date().toISOString()
}

function normalizeRecord(
  record: IjtemaAttendanceRecord | undefined,
): IjtemaAttendanceRecord | undefined {
  if (!record) return undefined
  const status = normalizeIjtemaAttendanceStatus(record.status)
  if (!status) return undefined
  if (status === record.status) return record
  return { ...record, status }
}

export function initializeIjtemaAttendanceCompliance(): void {
  if (initialized) return
  initialized = true
}

export function resetIjtemaAttendanceComplianceInitialization(): void {
  initialized = false
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
  ruknId?: string
  campaignId?: string
} {
  initializeIjtemaAttendanceCompliance()
  const record = normalizeRecord(getIjtemaAttendanceRecord(karkunId, weekEndingDate))

  return {
    weekEndingDate,
    weekLabel: formatWeekLabel(weekEndingDate),
    status: record?.status ?? 'Not recorded',
    remarks: record?.remarks,
    updatedAt: record?.updatedAt,
    updatedBy: record?.updatedBy,
    ruknId: record?.ruknId,
    campaignId: record?.campaignId,
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
  const status = normalizeIjtemaAttendanceStatus(input.status)
  if (!status) {
    return { success: false, error: 'Attendance status is required.' }
  }

  const validation = validateIjtemaAttendanceUpdate({ ...input, weekEndingDate, status })
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const karkun = getKarkunById(input.karkunId)
  if (!karkun) {
    return { success: false, error: 'Karkun not found.' }
  }

  const existing = normalizeRecord(getIjtemaAttendanceRecord(input.karkunId, weekEndingDate))
  const campaign = getActiveCampaign()
  const timestamp = nowIso()

  const record = upsertIjtemaAttendanceRecord({
    karkunId: input.karkunId,
    weekEndingDate,
    status,
    remarks: input.remarks?.trim() || undefined,
    updatedAt: timestamp,
    updatedBy: input.updatedBy ?? 'Administrator',
    campaignId: input.campaignId ?? existing?.campaignId ?? campaign?.id,
    campaignName: input.campaignName ?? existing?.campaignName ?? campaign?.name,
    ruknId: input.ruknId ?? existing?.ruknId,
    createdAt: existing?.createdAt ?? timestamp,
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
      ruknId: input.ruknId,
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
  const activeKarkuns = getAllKarkuns()

  let present = 0
  let absent = 0
  let excused = 0
  let notRecorded = 0

  for (const karkun of activeKarkuns) {
    const record = normalizeRecord(getIjtemaAttendanceRecord(karkun.id, weekEndingDate))
    if (!record) {
      notRecorded += 1
      continue
    }

    if (record.status === 'Present') present += 1
    if (record.status === 'Absent') absent += 1
    if (record.status === 'Excused') excused += 1
  }

  return {
    present,
    absent,
    excused,
    notRecorded,
    informed: excused,
  }
}

export function getAllIjtemaAttendanceSummaries(
  weekEndingDate = getWeekEndingDate(),
): IjtemaAttendanceKarkunSummary[] {
  initializeIjtemaAttendanceCompliance()

  return getAllKarkuns().map((karkun) => {
    const attendance = getIjtemaAttendanceForKarkun(karkun.id, weekEndingDate)
    return {
      karkunId: karkun.id,
      karkunName: karkun.name,
      weekEndingDate: attendance.weekEndingDate,
      weekLabel: attendance.weekLabel,
      status: attendance.status,
      remarks: attendance.remarks,
      updatedAt: attendance.updatedAt,
      ruknId: attendance.ruknId,
      campaignId: attendance.campaignId,
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
  const normalizedFilter =
    statusFilter === 'Informed' ? 'Excused' : statusFilter

  if (hasStatusFilter && attendance.status !== normalizedFilter) {
    return false
  }

  return true
}

export function ensureIjtemaAttendanceRecord(karkunId: string): void {
  initializeIjtemaAttendanceCompliance()
  void karkunId
}

initializeIjtemaAttendanceCompliance()
