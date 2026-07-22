/**
 * KC-0082 — Campaign Execution Matrix helpers.
 * Presentation + one-click updates over existing visit / JIH / Ijtema / Baitul Maal services.
 */

import { getKarkunById, updateKarkunMeetingOutcomes } from '@/constants/mockKarkunRegistry'
import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import {
  buildFormFromDailyProgressOutcome,
  getDailyProgressView,
} from '@/lib/dailyProgressPresentation'
import { saveDailyProgress } from '@/services/annexure1Service'
import {
  getCurrentBaitulMaalStatus,
  updateBaitulMaal,
} from '@/services/baitulMaalService'
import { getCampaignTimeline } from '@/services/campaignService'
import { createCommitment } from '@/services/guidanceService'
import {
  getCurrentIjtemaAttendance,
  updateIjtemaAttendance,
} from '@/services/ijtemaAttendanceService'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import { getCommitmentsForKarkun } from '@/stores/guidanceStore'
import { createInitialAnnexure1FormState } from '@/types/annexure1.types'
import type { JihAppRegistrationStatus } from '@/types/karkun-registry.types'
import type { IjtemaAttendanceStatus } from '@/types/ijtemaAttendance'

export type JihAppMatrixState = 'not_discussed' | 'discussed' | 'installed' | 'registered'

export type BaitulMaalCampaignState = 'not_discussed' | 'discussed' | 'committed'

export type CampaignMatrixRow = {
  karkunId: string
  karkunName: string
  area: string
  visitDone: boolean
  jih: JihAppMatrixState
  ijtema: IjtemaAttendanceStatus | 'Pending'
  baitulMaal: BaitulMaalCampaignState
  remarks: string
  /** True when Visit + JIH Registered + Ijtema recorded + Baitul Maal committed */
  completed: boolean
}

export type CampaignExecutionSummary = {
  assigned: number
  visitCompleted: number
  jihRegistered: number
  ijtemaRecorded: number
  baitulMaalCommitted: number
  completed: number
  pending: number
  isCampaignActive: boolean
  isPostCampaign: boolean
}

const BAITUL_DISCUSSED = 'Campaign: Discussed'
const BAITUL_COMMITTED = 'Campaign: Committed'
const JIH_INSTALLED_COMMITMENT = 'JIH App installed'

export function isRuknPostCampaignMode(): boolean {
  const timeline = getCampaignTimeline()
  if (!timeline) return true
  return timeline.status === 'completed'
}

export function getJihAppMatrixState(karkunId: string): JihAppMatrixState {
  const karkun = getKarkunById(karkunId)
  if (!karkun) return 'not_discussed'
  if (karkun.jihAppRegistrationStatus === 'Registered') return 'registered'
  const installed = getCommitmentsForKarkun(karkunId).some((c) =>
    /jih app installed/i.test(c.text),
  )
  if (installed) return 'installed'
  if (karkun.jihAppRegistrationStatus === 'Recommended') return 'discussed'
  return 'not_discussed'
}

export function getBaitulMaalCampaignState(karkunId: string): BaitulMaalCampaignState {
  const record = getCurrentBaitulMaalStatus(karkunId)
  if (record.status === 'Paid' || record.status === 'Exempt') return 'committed'
  const remarks = (record.remarks ?? '').toLowerCase()
  if (remarks.includes('committed') || remarks.includes(BAITUL_COMMITTED.toLowerCase())) {
    return 'committed'
  }
  if (remarks.includes('discussed') || remarks.includes(BAITUL_DISCUSSED.toLowerCase())) {
    return 'discussed'
  }
  return 'not_discussed'
}

export function buildCampaignMatrixRows(ruknId: string): CampaignMatrixRow[] {
  return getAssignedKarkunanForRukn(ruknId).map((karkun) => {
    const progress = getDailyProgressView(karkun.id)
    const visitDone = Boolean(
      progress.hasTodayProgress ||
        (progress.hasAnyProgress && progress.submission?.visitConducted === 'yes'),
    )
    const jih = getJihAppMatrixState(karkun.id)
    const ijtemaRaw = getCurrentIjtemaAttendance(karkun.id)
    const ijtema: IjtemaAttendanceStatus | 'Pending' =
      ijtemaRaw.status === 'Not recorded' ? 'Pending' : ijtemaRaw.status
    const baitulMaal = getBaitulMaalCampaignState(karkun.id)
    const completed =
      visitDone && jih === 'registered' && ijtema !== 'Pending' && baitulMaal === 'committed'

    return {
      karkunId: karkun.id,
      karkunName: karkun.name,
      area: karkun.area || '',
      visitDone,
      jih,
      ijtema,
      baitulMaal,
      remarks: progress.submission?.discussionSummary ?? '',
      completed,
    }
  })
}

export function buildCampaignExecutionSummary(ruknId: string): CampaignExecutionSummary {
  const rows = buildCampaignMatrixRows(ruknId)
  const assigned = rows.length
  const visitCompleted = rows.filter((r) => r.visitDone).length
  const jihRegistered = rows.filter((r) => r.jih === 'registered').length
  const ijtemaRecorded = rows.filter((r) => r.ijtema !== 'Pending').length
  const baitulMaalCommitted = rows.filter((r) => r.baitulMaal === 'committed').length
  const completed = rows.filter((r) => r.completed).length
  const post = isRuknPostCampaignMode()

  return {
    assigned,
    visitCompleted,
    jihRegistered,
    ijtemaRecorded,
    baitulMaalCommitted,
    completed,
    pending: Math.max(0, assigned - completed),
    isCampaignActive: !post,
    isPostCampaign: post,
  }
}

export function toggleVisitForKarkun(
  karkunId: string,
  ruknId: string,
  actorId?: string,
): { success: true } | { success: false; error: string } {
  const progress = getDailyProgressView(karkunId)
  if (progress.hasTodayProgress && progress.submission?.visitConducted === 'yes') {
    // Already visited today — leave as-is (one-click marks complete, no destructive uncheck of history)
    return { success: true }
  }
  const form = buildFormFromDailyProgressOutcome(
    'visit_completed',
    progress.submission?.discussionSummary || 'Visited today',
    createInitialAnnexure1FormState().visitDate,
    progress.submission ?? createInitialAnnexure1FormState(),
  )
  const karkun = getKarkunById(karkunId)
  if (karkun) {
    form.jihAppRegistrationStatus = karkun.jihAppRegistrationStatus
  }
  const result = saveDailyProgress(form, {
    karkunId,
    ruknId,
    actorRole: 'rukn',
    actorId,
  })
  return result.success ? { success: true } : { success: false, error: result.error }
}

export function cycleJihAppForKarkun(
  karkunId: string,
  ruknId: string,
): { success: true; next: JihAppMatrixState } | { success: false; error: string } {
  const current = getJihAppMatrixState(karkunId)
  const order: JihAppMatrixState[] = [
    'not_discussed',
    'discussed',
    'installed',
    'registered',
  ]
  const next = order[(order.indexOf(current) + 1) % order.length]!
  const statusMap: Record<JihAppMatrixState, JihAppRegistrationStatus> = {
    not_discussed: 'Not Discussed',
    discussed: 'Recommended',
    installed: 'Recommended',
    registered: 'Registered',
  }
  updateKarkunMeetingOutcomes(karkunId, {
    jihAppRegistrationStatus: statusMap[next],
    syncJihPortal: true,
  })
  if (next === 'installed') {
    const exists = getCommitmentsForKarkun(karkunId).some((c) =>
      /jih app installed/i.test(c.text),
    )
    if (!exists) {
      const assignmentId = getActiveAssignmentsForKarkun(karkunId)[0]?.assignmentId
      createCommitment({
        karkunId,
        ruknId,
        assignmentId,
        text: JIH_INSTALLED_COMMITMENT,
        targetDate: new Date().toISOString().slice(0, 10),
        createdBy: 'Rukn',
        source: 'manual',
      })
    }
  }
  return { success: true, next }
}

export function cycleIjtemaForKarkun(
  karkunId: string,
  ruknId: string,
  actorId?: string,
): { success: true; next: IjtemaAttendanceStatus } | { success: false; error: string } {
  const current = getCurrentIjtemaAttendance(karkunId)
  const cycle: IjtemaAttendanceStatus[] = ['Present', 'Absent', 'Excused']
  let next: IjtemaAttendanceStatus
  if (current.status === 'Not recorded') {
    next = 'Present'
  } else {
    const idx = cycle.indexOf(current.status as IjtemaAttendanceStatus)
    next = cycle[(idx + 1) % cycle.length]!
  }
  const result = updateIjtemaAttendance({
    karkunId,
    status: next,
    updatedBy: actorId ?? ruknId,
    ruknId,
  })
  return result.success
    ? { success: true, next }
    : { success: false, error: result.error }
}

export function cycleBaitulMaalCampaignForKarkun(
  karkunId: string,
  updatedBy?: string,
): { success: true; next: BaitulMaalCampaignState } | { success: false; error: string } {
  const current = getBaitulMaalCampaignState(karkunId)
  const order: BaitulMaalCampaignState[] = ['not_discussed', 'discussed', 'committed']
  const next = order[(order.indexOf(current) + 1) % order.length]!

  if (next === 'not_discussed') {
    const result = updateBaitulMaal({
      karkunId,
      status: 'Pending',
      remarks: '',
      updatedBy: updatedBy ?? 'Rukn',
    })
    return result.success
      ? { success: true, next }
      : { success: false, error: result.error }
  }

  if (next === 'discussed') {
    const result = updateBaitulMaal({
      karkunId,
      status: 'Pending',
      remarks: BAITUL_DISCUSSED,
      updatedBy: updatedBy ?? 'Rukn',
    })
    return result.success
      ? { success: true, next }
      : { success: false, error: result.error }
  }

  // Committed — campaign conversation complete (payment gateway out of scope).
  const result = updateBaitulMaal({
    karkunId,
    status: 'Pending',
    remarks: BAITUL_COMMITTED,
    updatedBy: updatedBy ?? 'Rukn',
  })
  return result.success
    ? { success: true, next }
    : { success: false, error: result.error }
}

export function saveMatrixRemarks(
  karkunId: string,
  ruknId: string,
  remarks: string,
  actorId?: string,
): { success: true } | { success: false; error: string } {
  const progress = getDailyProgressView(karkunId)
  const outcome = progress.submission
    ? progress.submission.visitConducted === 'no'
      ? 'no_contact'
      : 'visit_completed'
    : 'visit_completed'
  const form = buildFormFromDailyProgressOutcome(
    outcome,
    remarks,
    progress.submission?.followUpDate || createInitialAnnexure1FormState().visitDate,
    progress.submission ?? createInitialAnnexure1FormState(),
  )
  const karkun = getKarkunById(karkunId)
  if (karkun) form.jihAppRegistrationStatus = karkun.jihAppRegistrationStatus
  const result = saveDailyProgress(form, {
    karkunId,
    ruknId,
    actorRole: 'rukn',
    actorId,
  })
  return result.success ? { success: true } : { success: false, error: result.error }
}

export function jihAppLabel(state: JihAppMatrixState): string {
  switch (state) {
    case 'registered':
      return 'Registered'
    case 'installed':
      return 'Installed'
    case 'discussed':
      return 'Discussed'
    default:
      return '—'
  }
}

export function baitulMaalLabel(state: BaitulMaalCampaignState): string {
  switch (state) {
    case 'committed':
      return 'Committed'
    case 'discussed':
      return 'Discussed'
    default:
      return '—'
  }
}
