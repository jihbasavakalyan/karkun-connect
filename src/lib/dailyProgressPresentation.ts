/**
 * KC-0080 — Daily Progress presentation helpers (reuse Annexure submissions).
 */

import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import { getAllAssignments } from '@/stores/assignmentStore'
import {
  getTodaysSubmissionForKarkun,
  getLatestSubmissionForKarkun,
} from '@/stores/annexure1Store'
import type { SubmittedMeetingForm } from '@/types/annexure1.types'
import {
  createInitialAnnexure1FormState,
  type Annexure1FormState,
} from '@/types/annexure1.types'

export type DailyProgressOutcome =
  | 'visit_completed'
  | 'contact_established'
  | 'no_contact'
  | 'follow_up_required'
  | 'meeting_conducted'
  | 'discussion_completed'

export const DAILY_PROGRESS_OUTCOME_OPTIONS: {
  value: DailyProgressOutcome
  label: string
}[] = [
  { value: 'visit_completed', label: 'Visit Completed' },
  { value: 'contact_established', label: 'Contact Established' },
  { value: 'meeting_conducted', label: 'Meeting Conducted' },
  { value: 'discussion_completed', label: 'Discussion Completed' },
  { value: 'follow_up_required', label: 'Follow-up Required' },
  { value: 'no_contact', label: 'No Contact' },
]

export type DailyProgressSummary = {
  assigned: number
  updatedToday: number
  pending: number
}

export type DailyProgressView = {
  statusLabel: string
  updatedAtLabel?: string
  hasTodayProgress: boolean
  hasAnyProgress: boolean
  submission?: SubmittedMeetingForm
}

export function getDailyProgressView(karkunId: string): DailyProgressView {
  const today = getTodaysSubmissionForKarkun(karkunId)
  const latest = getLatestSubmissionForKarkun(karkunId)
  const submission = today ?? latest

  if (today) {
    return {
      statusLabel: deriveOutcomeLabel(today),
      updatedAtLabel: formatProgressTime(today.submittedAt),
      hasTodayProgress: true,
      hasAnyProgress: true,
      submission: today,
    }
  }

  return {
    statusLabel: 'Not Updated',
    updatedAtLabel: undefined,
    hasTodayProgress: false,
    hasAnyProgress: Boolean(submission),
    submission,
  }
}

export function buildRuknDailyProgressSummary(ruknId: string): DailyProgressSummary {
  const assigned = getAssignedKarkunanForRukn(ruknId)
  let updatedToday = 0
  for (const karkun of assigned) {
    if (getTodaysSubmissionForKarkun(karkun.id)) {
      updatedToday += 1
    }
  }
  return {
    assigned: assigned.length,
    updatedToday,
    pending: Math.max(0, assigned.length - updatedToday),
  }
}

/** Campaign-wide (Admin) — active assignments only. */
export function buildCampaignDailyProgressSummary(): DailyProgressSummary {
  const active = getAllAssignments().filter((record) => record.status === 'Active')
  const uniqueKarkunIds = [...new Set(active.map((record) => record.karkunId))]
  let updatedToday = 0
  for (const karkunId of uniqueKarkunIds) {
    if (getTodaysSubmissionForKarkun(karkunId)) {
      updatedToday += 1
    }
  }
  return {
    assigned: uniqueKarkunIds.length,
    updatedToday,
    pending: Math.max(0, uniqueKarkunIds.length - updatedToday),
  }
}

export function deriveOutcomeFromForm(form: Annexure1FormState): DailyProgressOutcome {
  if (form.visitConducted === 'no') return 'no_contact'
  if (form.followUpRequired === 'yes') return 'follow_up_required'
  const summary = form.discussionSummary.toLowerCase()
  if (summary.includes('contact established')) return 'contact_established'
  if (summary.includes('meeting conducted')) return 'meeting_conducted'
  if (summary.includes('discussion completed')) return 'discussion_completed'
  return 'visit_completed'
}

export function deriveOutcomeLabel(form: Annexure1FormState): string {
  const outcome = deriveOutcomeFromForm(form)
  return (
    DAILY_PROGRESS_OUTCOME_OPTIONS.find((option) => option.value === outcome)?.label ??
    'Updated'
  )
}

export function buildFormFromDailyProgressOutcome(
  outcome: DailyProgressOutcome,
  remarks: string,
  followUpDate: string,
  existing?: Annexure1FormState,
): Annexure1FormState {
  const base = existing
    ? { ...existing }
    : createInitialAnnexure1FormState()

  const trimmed = remarks.trim()
  const label =
    DAILY_PROGRESS_OUTCOME_OPTIONS.find((option) => option.value === outcome)?.label ??
    'Visit Completed'

  if (outcome === 'no_contact') {
    return {
      ...base,
      visitConducted: 'no',
      notConductedReason: trimmed || 'No contact',
      discussionSummary: '',
      followUpRequired: 'no',
      followUpDate: '',
      followUpPurpose: '',
      commitmentMade: false,
      commitmentDetails: '',
    }
  }

  if (outcome === 'follow_up_required') {
    return {
      ...base,
      visitConducted: 'yes',
      notConductedReason: '',
      discussionSummary: trimmed || label,
      followUpRequired: 'yes',
      followUpDate: followUpDate || base.visitDate,
      followUpPurpose: trimmed || 'Follow-up required',
      commitmentMade: true,
      commitmentDetails: trimmed || 'Follow-up required',
    }
  }

  return {
    ...base,
    visitConducted: 'yes',
    notConductedReason: '',
    discussionSummary: trimmed || label,
    followUpRequired: 'no',
    followUpDate: '',
    followUpPurpose: '',
    commitmentMade: false,
    commitmentDetails: '',
  }
}

function formatProgressTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}
