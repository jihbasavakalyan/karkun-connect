import {
  appendFollowUpRecord,
  completePendingFollowUpsForAssignment,
  getAllFollowUpRecords,
  getActiveFollowUpForKarkun,
  updateFollowUpStatus,
} from '@/stores/followUpStore'
import type {
  FollowUpDashboardMetrics,
  FollowUpInput,
  FollowUpRecord,
  KarkunNextFollowUp,
} from '@/types/followUp'
import { validateFollowUpInput } from '@/validation/followUpValidation'

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDisplayDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function createFollowUp(input: FollowUpInput): FollowUpRecord | { error: string } {
  const validation = validateFollowUpInput(input)
  if (!validation.valid) {
    return { error: validation.error }
  }

  const record: FollowUpRecord = {
    followUpId: `followup-${Date.now()}`,
    assignmentId: input.assignmentId,
    assignmentNumber: input.assignmentNumber,
    ruknId: input.ruknId,
    karkunId: input.karkunId,
    karkunName: input.karkunName,
    followUpDate: input.followUpDate,
    purpose: input.purpose.trim(),
    remarks: input.remarks?.trim() || undefined,
    status: 'Pending',
    sourceFormId: input.sourceFormId,
    createdAt: new Date().toISOString(),
  }

  return appendFollowUpRecord(record)
}

export function completeFollowUpsForAssignment(assignmentId: string): FollowUpRecord[] {
  return completePendingFollowUpsForAssignment(assignmentId)
}

export function handleFollowUpOnAnnexureSubmit(
  assignmentId: string,
  assignmentNumber: string,
  ruknId: string,
  karkunId: string,
  karkunName: string,
  sourceFormId: string,
  followUpRequired: 'yes' | 'no' | '',
  followUpDate: string,
  followUpPurpose: string,
  followUpRemarks?: string,
): { created: FollowUpRecord | null; error?: string } {
  completeFollowUpsForAssignment(assignmentId)

  if (followUpRequired !== 'yes') {
    return { created: null }
  }

  const result = createFollowUp({
    assignmentId,
    assignmentNumber,
    ruknId,
    karkunId,
    karkunName,
    followUpDate,
    purpose: followUpPurpose,
    remarks: followUpRemarks,
    sourceFormId,
  })

  if ('error' in result) {
    return { created: null, error: result.error }
  }

  return { created: result }
}

export function getFollowUpDashboardMetrics(): FollowUpDashboardMetrics {
  const today = todayIsoDate()
  const records = getAllFollowUpRecords()
  const pending = records.filter((record) => record.status === 'Pending')
  const completed = records.filter((record) => record.status === 'Completed')

  return {
    pendingFollowUps: pending.length,
    todaysFollowUps: pending.filter((record) => record.followUpDate === today).length,
    completedFollowUps: completed.length,
  }
}

export function getPendingFollowUps(): FollowUpRecord[] {
  return getAllFollowUpRecords().filter((record) => record.status === 'Pending')
}

export function getTodaysFollowUps(): FollowUpRecord[] {
  const today = todayIsoDate()
  return getPendingFollowUps().filter((record) => record.followUpDate === today)
}

export function getCompletedFollowUps(): FollowUpRecord[] {
  return getAllFollowUpRecords().filter((record) => record.status === 'Completed')
}

export function getNextFollowUpForKarkun(karkunId: string): KarkunNextFollowUp {
  const record = getActiveFollowUpForKarkun(karkunId)
  if (!record) {
    return null
  }

  return {
    followUpDate: record.followUpDate,
    purpose: record.purpose,
    formattedDate: formatDisplayDate(record.followUpDate),
  }
}

export function getFollowUpsForCampaignRecord() {
  return getAllFollowUpRecords().map((record) => ({
    id: record.followUpId,
    karkunId: record.karkunId,
    workerName: record.karkunName,
    followUpDate: record.followUpDate,
    purpose: record.purpose,
    remarks: record.remarks,
    note: record.purpose,
    status: record.status,
    sourceFormId: record.sourceFormId,
    assignmentNumber: record.assignmentNumber,
    ruknId: record.ruknId,
  }))
}

export function getFollowUpsForRukn(ruknId: string) {
  return getFollowUpsForCampaignRecord().filter((record) => record.ruknId === ruknId)
}

export function getFollowUpCompletionRate(): number {
  const records = getAllFollowUpRecords()
  if (records.length === 0) {
    return 100
  }

  const completed = records.filter((record) => record.status === 'Completed').length
  return Math.round((completed / records.length) * 100)
}

export function completeFollowUpById(followUpId: string) {
  return updateFollowUpStatus(followUpId, 'Completed', new Date().toISOString())
}
