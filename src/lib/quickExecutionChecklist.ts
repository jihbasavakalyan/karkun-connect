/**
 * KC-0081 — Quick Execution Checklist state + save (reuses existing services).
 * Journey stages remain derived from operational signals — no new journey model.
 */

import { getKarkunById, updateKarkunMeetingOutcomes } from '@/constants/mockKarkunRegistry'
import {
  buildFormFromDailyProgressOutcome,
  getDailyProgressView,
  type DailyProgressOutcome,
} from '@/lib/dailyProgressPresentation'
import {
  hasOrientationSignal,
  hasParticipationSignal,
  hasRegularContact,
  isStageComplete,
  resolveCurrentJourneyStage,
} from '@/lib/guidance/journeyEngine'
import { saveDailyProgress } from '@/services/annexure1Service'
import { setDevelopmentIndicator } from '@/services/developmentAssessmentService'
import { createCommitment } from '@/services/guidanceService'
import {
  getCurrentIjtemaAttendance,
  updateIjtemaAttendance,
} from '@/services/ijtemaAttendanceService'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import { getCommitmentsForKarkun } from '@/stores/guidanceStore'
import { createInitialAnnexure1FormState } from '@/types/annexure1.types'
import type { JihAppRegistrationStatus } from '@/types/karkun-registry.types'
import {
  JOURNEY_STAGE_LABELS,
  JOURNEY_STAGE_ORDER,
  type JourneyStageId,
} from '@/types/guidance'
import type { IjtemaAttendanceStatus } from '@/types/ijtemaAttendance'

export type VisitChecklist = {
  visitedToday: boolean
  phoneDiscussion: boolean
  followUpRequired: boolean
  meetingCompleted: boolean
}

export type JihAppChecklist = {
  discussed: boolean
  installed: boolean
  registered: boolean
}

export type QuickExecutionDraft = {
  visit: VisitChecklist
  ijtema: IjtemaAttendanceStatus | null
  journey: Record<JourneyStageId, boolean>
  jih: JihAppChecklist
  remarks: string
}

export type QuickExecutionSnapshot = {
  karkunId: string
  karkunName: string
  currentStageLabel: string
  draft: QuickExecutionDraft
  journeyLocked: Partial<Record<JourneyStageId, boolean>>
}

const ORIENTATION_COMMITMENT = 'Orientation completed'
const REGULAR_CONTACT_COMMITMENT = 'Regular contact maintained'
const JIH_INSTALLED_COMMITMENT = 'JIH App installed'

export function buildQuickExecutionSnapshot(
  karkunId: string,
): QuickExecutionSnapshot | null {
  const karkun = getKarkunById(karkunId)
  if (!karkun) return null

  const assignmentId = getActiveAssignmentsForKarkun(karkunId)[0]?.assignmentId
  const { currentStage } = resolveCurrentJourneyStage(karkun, assignmentId)
  const progress = getDailyProgressView(karkunId)
  const ijtema = getCurrentIjtemaAttendance(karkunId)
  const jihStatus = karkun.jihAppRegistrationStatus
  const hasInstalledCommitment = getCommitmentsForKarkun(karkunId).some((c) =>
    /jih app installed/i.test(c.text),
  )

  const journey = {} as Record<JourneyStageId, boolean>
  const journeyLocked: Partial<Record<JourneyStageId, boolean>> = {
    connected: true,
  }
  for (const stageId of JOURNEY_STAGE_ORDER) {
    journey[stageId] = isStageComplete(stageId, karkun, assignmentId)
  }

  const submission = progress.submission
  const visit: VisitChecklist = {
    visitedToday: progress.hasTodayProgress && submission?.visitConducted === 'yes',
    phoneDiscussion: Boolean(
      submission?.discussionSummary?.toLowerCase().includes('phone'),
    ),
    followUpRequired: submission?.followUpRequired === 'yes',
    meetingCompleted: Boolean(
      submission?.visitConducted === 'yes' &&
        (submission.discussionSummary?.toLowerCase().includes('meeting') ||
          progress.hasTodayProgress),
    ),
  }

  const jih: JihAppChecklist = {
    discussed: jihStatus === 'Recommended' || jihStatus === 'Registered',
    installed: jihStatus === 'Registered' || hasInstalledCommitment,
    registered: jihStatus === 'Registered',
  }

  return {
    karkunId,
    karkunName: karkun.name,
    currentStageLabel: JOURNEY_STAGE_LABELS[currentStage],
    draft: {
      visit,
      ijtema: ijtema.status === 'Not recorded' ? null : ijtema.status,
      journey,
      jih,
      remarks:
        submission?.discussionSummary ||
        submission?.notConductedReason ||
        '',
    },
    journeyLocked,
  }
}

function mapVisitToOutcome(visit: VisitChecklist): DailyProgressOutcome {
  if (visit.followUpRequired) return 'follow_up_required'
  if (visit.meetingCompleted) return 'meeting_conducted'
  if (visit.phoneDiscussion) return 'contact_established'
  if (visit.visitedToday) return 'visit_completed'
  return 'visit_completed'
}

function mapJihToStatus(jih: JihAppChecklist): JihAppRegistrationStatus {
  if (jih.registered) return 'Registered'
  if (jih.discussed || jih.installed) return 'Recommended'
  return 'Not Discussed'
}

function ensureCommitment(
  karkunId: string,
  ruknId: string,
  assignmentId: string | undefined,
  text: string,
): void {
  const exists = getCommitmentsForKarkun(karkunId).some(
    (c) => c.text.trim().toLowerCase() === text.toLowerCase() && c.status !== 'cancelled',
  )
  if (exists) return
  createCommitment({
    karkunId,
    ruknId,
    assignmentId,
    text,
    targetDate: new Date().toISOString().slice(0, 10),
    createdBy: 'Rukn',
    source: 'manual',
  })
}

export type QuickExecutionSaveResult =
  | { success: true }
  | { success: false; error: string }

/**
 * Smart save — only applies changed sections via existing services.
 */
export function saveQuickExecutionChecklist(
  karkunId: string,
  ruknId: string,
  actorId: string | undefined,
  initial: QuickExecutionDraft,
  draft: QuickExecutionDraft,
): QuickExecutionSaveResult {
  const karkun = getKarkunById(karkunId)
  if (!karkun) {
    return { success: false, error: 'Karkun not found.' }
  }
  const assignment = getActiveAssignmentsForKarkun(karkunId)[0]
  const assignmentId = assignment?.assignmentId

  const visitChanged =
    draft.visit.visitedToday !== initial.visit.visitedToday ||
    draft.visit.phoneDiscussion !== initial.visit.phoneDiscussion ||
    draft.visit.followUpRequired !== initial.visit.followUpRequired ||
    draft.visit.meetingCompleted !== initial.visit.meetingCompleted ||
    draft.remarks.trim() !== initial.remarks.trim()

  const anyVisitFlag =
    draft.visit.visitedToday ||
    draft.visit.phoneDiscussion ||
    draft.visit.followUpRequired ||
    draft.visit.meetingCompleted

  if (visitChanged && anyVisitFlag) {
    const outcome = mapVisitToOutcome(draft.visit)
    const existing = getDailyProgressView(karkunId).submission
    const form = buildFormFromDailyProgressOutcome(
      outcome,
      draft.remarks,
      existing?.followUpDate || createInitialAnnexure1FormState().visitDate,
      existing ?? createInitialAnnexure1FormState(),
    )
    // Preserve JIH on visit save if already set on draft
    form.jihAppRegistrationStatus = mapJihToStatus(draft.jih)
    if (draft.visit.phoneDiscussion && !form.discussionSummary.toLowerCase().includes('phone')) {
      form.discussionSummary = draft.remarks.trim()
        ? `Phone discussion. ${draft.remarks.trim()}`
        : 'Phone discussion'
    }
    const result = saveDailyProgress(form, {
      karkunId,
      ruknId,
      actorRole: 'rukn',
      actorId,
    })
    if (!result.success) {
      return { success: false, error: result.error }
    }
  } else if (
    draft.remarks.trim() &&
    draft.remarks.trim() !== initial.remarks.trim() &&
    getDailyProgressView(karkunId).submission
  ) {
    // Remarks-only update on existing today's/latest submission
    const existing = getDailyProgressView(karkunId).submission!
    const form = {
      ...existing,
      discussionSummary: draft.remarks.trim(),
      jihAppRegistrationStatus: mapJihToStatus(draft.jih),
    }
    const result = saveDailyProgress(form, {
      karkunId,
      ruknId,
      actorRole: 'rukn',
      actorId,
    })
    if (!result.success) {
      return { success: false, error: result.error }
    }
  }

  const jihChanged =
    draft.jih.discussed !== initial.jih.discussed ||
    draft.jih.installed !== initial.jih.installed ||
    draft.jih.registered !== initial.jih.registered

  if (jihChanged) {
    const status = mapJihToStatus(draft.jih)
    updateKarkunMeetingOutcomes(karkunId, {
      jihAppRegistrationStatus: status,
      syncJihPortal: true,
    })
    if (draft.jih.installed && !draft.jih.registered) {
      ensureCommitment(karkunId, ruknId, assignmentId, JIH_INSTALLED_COMMITMENT)
    }
  }

  if (draft.ijtema !== initial.ijtema && draft.ijtema) {
    const result = updateIjtemaAttendance({
      karkunId,
      status: draft.ijtema,
      remarks: draft.remarks.trim() || undefined,
      updatedBy: actorId ?? ruknId,
      ruknId,
    })
    if (!result.success) {
      return { success: false, error: result.error }
    }
  }

  // Journey stage signals — only newly checked stages apply writable signals.
  if (draft.journey['first-meeting'] && !initial.journey['first-meeting'] && !anyVisitFlag) {
    const form = buildFormFromDailyProgressOutcome(
      'visit_completed',
      draft.remarks || 'First meeting completed',
      createInitialAnnexure1FormState().visitDate,
      getDailyProgressView(karkunId).submission ?? createInitialAnnexure1FormState(),
    )
    form.jihAppRegistrationStatus = mapJihToStatus(draft.jih)
    const result = saveDailyProgress(form, {
      karkunId,
      ruknId,
      actorRole: 'rukn',
      actorId,
    })
    if (!result.success) {
      return { success: false, error: result.error }
    }
  }

  if (draft.journey['jih-registration'] && !initial.journey['jih-registration']) {
    updateKarkunMeetingOutcomes(karkunId, {
      jihAppRegistrationStatus: 'Registered',
      syncJihPortal: true,
    })
  }

  if (draft.journey.orientation && !hasOrientationSignal(karkun)) {
    ensureCommitment(karkunId, ruknId, assignmentId, ORIENTATION_COMMITMENT)
  }

  if (draft.journey.participation && !hasParticipationSignal(karkun)) {
    if (draft.ijtema !== 'Present') {
      const result = updateIjtemaAttendance({
        karkunId,
        status: 'Present',
        updatedBy: actorId ?? ruknId,
        ruknId,
      })
      if (!result.success) {
        return { success: false, error: result.error }
      }
    }
  }

  if (draft.journey['regular-contact'] && !hasRegularContact(karkun)) {
    ensureCommitment(karkunId, ruknId, assignmentId, REGULAR_CONTACT_COMMITMENT)
  }

  if (draft.journey.development !== initial.journey.development) {
    setDevelopmentIndicator(
      karkunId,
      ruknId,
      'ready_for_next_stage',
      draft.journey.development,
      actorId ?? ruknId,
    )
  }

  return { success: true }
}

export const QUICK_EXECUTION_JOURNEY_OPTIONS = JOURNEY_STAGE_ORDER.map((id) => ({
  id,
  label: JOURNEY_STAGE_LABELS[id],
}))
