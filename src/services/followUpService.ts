import {
  appendFollowUpRecord,
  completePendingFollowUpsForAssignment,
  getAllFollowUpRecords,
  getActiveFollowUpForKarkun,
  mutateFollowUpRecord,
  updateFollowUpStatus,
} from '@/stores/followUpStore'
import { logActivity } from '@/stores/activityLogStore'
import type {
  FollowUpDashboardMetrics,
  FollowUpEditableField,
  FollowUpInput,
  FollowUpRecord,
  KarkunNextFollowUp,
  RecordEditEntry,
} from '@/types/followUp'
import { validateFollowUpDate, validateFollowUpInput, validateFollowUpPurpose } from '@/validation/followUpValidation'

export type FollowUpEditor = {
  role: 'administrator' | 'rukn'
  uid: string
  ruknId?: string
  displayName?: string
}

export type FollowUpDetailsUpdate = {
  purpose?: string
  remarks?: string
  followUpDate?: string
}

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

function editorLabel(editor: FollowUpEditor): string {
  return editor.displayName?.trim() || editor.uid
}

export function canEditFollowUp(
  record: Pick<FollowUpRecord, 'createdBy' | 'ruknId'>,
  editor: FollowUpEditor,
): boolean {
  if (editor.role === 'administrator') {
    return true
  }

  if (record.createdBy) {
    return (
      record.createdBy === editor.uid ||
      (!!editor.ruknId && record.createdBy === editor.ruknId)
    )
  }

  // Legacy records without createdBy: owning Rukn may correct.
  return !!editor.ruknId && record.ruknId === editor.ruknId
}

export function createFollowUp(input: FollowUpInput): FollowUpRecord | { error: string } {
  const validation = validateFollowUpInput(input)
  if (!validation.valid) {
    return { error: validation.error }
  }

  const createdBy = input.createdBy?.trim() || input.ruknId

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
    createdBy,
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
  createdBy?: string,
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
    createdBy: createdBy?.trim() || ruknId,
  })

  if ('error' in result) {
    return { created: null, error: result.error }
  }

  return { created: result }
}

export function updateFollowUpDetails(
  followUpId: string,
  updates: FollowUpDetailsUpdate,
  editor: FollowUpEditor,
): FollowUpRecord | { error: string } {
  const existing = getAllFollowUpRecords().find((record) => record.followUpId === followUpId)
  if (!existing) {
    return { error: 'Follow-up not found.' }
  }

  if (!canEditFollowUp(existing, editor)) {
    return { error: 'You do not have permission to edit this follow-up.' }
  }

  const nextPurpose =
    updates.purpose !== undefined ? updates.purpose.trim() : existing.purpose
  const nextRemarks =
    updates.remarks !== undefined
      ? updates.remarks.trim() || undefined
      : existing.remarks
  const nextFollowUpDate =
    updates.followUpDate !== undefined ? updates.followUpDate.trim() : existing.followUpDate

  if (updates.purpose !== undefined) {
    const purposeCheck = validateFollowUpPurpose(nextPurpose)
    if (!purposeCheck.valid) {
      return { error: purposeCheck.error }
    }
  }

  if (updates.followUpDate !== undefined) {
    const dateCheck = validateFollowUpDate(nextFollowUpDate)
    if (!dateCheck.valid) {
      return { error: dateCheck.error }
    }
  }

  const timestamp = new Date().toISOString()
  const user = editorLabel(editor)
  const historyEntries: RecordEditEntry[] = []

  const trackChange = (
    field: FollowUpEditableField,
    original: string,
    edited: string,
  ) => {
    if (original === edited) {
      return
    }
    historyEntries.push({ field, original, edited, timestamp, user })
  }

  trackChange('purpose', existing.purpose, nextPurpose)
  trackChange('remarks', existing.remarks ?? '', nextRemarks ?? '')
  trackChange('followUpDate', existing.followUpDate, nextFollowUpDate)

  if (historyEntries.length === 0) {
    return { error: 'No changes to save.' }
  }

  const updated = mutateFollowUpRecord(followUpId, (record) => {
    record.purpose = nextPurpose
    record.remarks = nextRemarks
    record.followUpDate = nextFollowUpDate
    record.editHistory = [...(record.editHistory ?? []), ...historyEntries]
  })

  if (!updated) {
    return { error: 'Follow-up not found.' }
  }

  const changedFields = historyEntries.map((entry) => entry.field).join(', ')
  logActivity({
    type: 'edit',
    severity: 'INFO',
    message: `Follow-up corrected for ${updated.karkunName} (${changedFields})`,
    ruknId: updated.ruknId,
    karkunId: updated.karkunId,
    assignmentId: updated.assignmentId,
    actor: user,
  })

  return updated
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
    createdBy: record.createdBy,
    editHistory: record.editHistory,
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
