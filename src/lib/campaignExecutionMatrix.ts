/**
 * KC-0082 — Campaign Execution Matrix helpers.
 * Presentation + one-click updates over existing visit / JIH / Ijtema / Baitul Maal services.
 */

import { getKarkunById, updateKarkunMeetingOutcomes } from '@/constants/mockKarkunRegistry'
import { ruknVisitPath } from '@/constants/routes'
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

/** KC-0097 Outcome Capture — milestones for one Connected Karkun (Today's Progress). */
export type TodaysProgressDraft = {
  visitCompleted: boolean
  jihExplained: boolean
  jihRegistered: boolean
  weeklyIjtemaAttended: boolean
  baitulMaalDiscussed: boolean
}

export function readTodaysProgressDraft(row: CampaignMatrixRow): TodaysProgressDraft {
  return {
    visitCompleted: row.visitDone,
    jihExplained: row.jih !== 'not_discussed',
    jihRegistered: row.jih === 'registered',
    weeklyIjtemaAttended: row.ijtema === 'Present',
    baitulMaalDiscussed: row.baitulMaal !== 'not_discussed',
  }
}

function karkunObjectivePct(row: CampaignMatrixRow): number {
  let done = 0
  if (row.visitDone) done += 1
  if (row.jih === 'registered') done += 1
  if (row.ijtema !== 'Pending') done += 1
  if (row.baitulMaal === 'committed' || row.baitulMaal === 'discussed') done += 1
  return Math.round((done / 4) * 100)
}

function setJihAppAbsolute(
  karkunId: string,
  ruknId: string,
  target: JihAppMatrixState,
): { success: true } | { success: false; error: string } {
  const statusMap: Record<JihAppMatrixState, JihAppRegistrationStatus> = {
    not_discussed: 'Not Discussed',
    discussed: 'Recommended',
    installed: 'Recommended',
    registered: 'Registered',
  }
  updateKarkunMeetingOutcomes(karkunId, {
    jihAppRegistrationStatus: statusMap[target],
    syncJihPortal: true,
  })
  if (target === 'installed') {
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
  return { success: true }
}

function setBaitulDiscussedAbsolute(
  karkunId: string,
  updatedBy?: string,
): { success: true } | { success: false; error: string } {
  const current = getBaitulMaalCampaignState(karkunId)
  if (current === 'committed' || current === 'discussed') {
    return { success: true }
  }
  const result = updateBaitulMaal({
    karkunId,
    status: 'Pending',
    remarks: BAITUL_DISCUSSED,
    updatedBy: updatedBy ?? 'Rukn',
  })
  return result.success ? { success: true } : { success: false, error: result.error }
}

function setIjtemaPresentAbsolute(
  karkunId: string,
  ruknId: string,
  actorId?: string,
): { success: true } | { success: false; error: string } {
  const current = getCurrentIjtemaAttendance(karkunId)
  if (current.status === 'Present') {
    return { success: true }
  }
  const result = updateIjtemaAttendance({
    karkunId,
    status: 'Present',
    updatedBy: actorId ?? ruknId,
    ruknId,
  })
  return result.success ? { success: true } : { success: false, error: result.error }
}

export type TodaysProgressApplyResult = {
  success: true
  beforePct: number
  afterPct: number
  nextObjective: string
  nextAction: string
}

/**
 * KC-0097 — Apply Today's Progress in one save (forward-only).
 * Infers visit when later milestones advance. Reuses existing Matrix services.
 */
export function applyTodaysCampaignProgress(input: {
  karkunId: string
  ruknId: string
  draft: TodaysProgressDraft
  actorId?: string
}): TodaysProgressApplyResult | { success: false; error: string } {
  const { karkunId, ruknId, actorId } = input
  const beforeRows = buildCampaignMatrixRows(ruknId)
  const beforeRow = beforeRows.find((r) => r.karkunId === karkunId)
  if (!beforeRow) {
    return { success: false, error: 'Connected Karkun not found.' }
  }
  const beforePct = karkunObjectivePct(beforeRow)

  // Infer everything possible — never ask the volunteer to confirm.
  const draft: TodaysProgressDraft = { ...input.draft }
  if (draft.jihRegistered || draft.jihExplained || draft.weeklyIjtemaAttended || draft.baitulMaalDiscussed) {
    draft.visitCompleted = true
  }
  if (draft.jihRegistered) {
    draft.jihExplained = true
  }

  if (draft.visitCompleted && !beforeRow.visitDone) {
    const visit = toggleVisitForKarkun(karkunId, ruknId, actorId)
    if (!visit.success) return visit
  }

  const currentJih = getJihAppMatrixState(karkunId)
  if (draft.jihRegistered && currentJih !== 'registered') {
    const jih = setJihAppAbsolute(karkunId, ruknId, 'registered')
    if (!jih.success) return jih
  } else if (draft.jihExplained && currentJih === 'not_discussed') {
    const jih = setJihAppAbsolute(karkunId, ruknId, 'discussed')
    if (!jih.success) return jih
  }

  if (draft.weeklyIjtemaAttended) {
    const ijtema = setIjtemaPresentAbsolute(karkunId, ruknId, actorId)
    if (!ijtema.success) return ijtema
  }

  if (draft.baitulMaalDiscussed) {
    const baitul = setBaitulDiscussedAbsolute(karkunId, actorId ?? ruknId)
    if (!baitul.success) return baitul
  }

  const afterRow =
    buildCampaignMatrixRows(ruknId).find((r) => r.karkunId === karkunId) ?? beforeRow
  const afterPct = karkunObjectivePct(afterRow)
  const pending = (() => {
    if (!afterRow.visitDone) {
      return { objective: 'First Visit', action: 'Complete the first visit.' }
    }
    if (afterRow.jih === 'not_discussed') {
      return { objective: 'JIH App Explanation', action: 'Explain the JIH App.' }
    }
    if (afterRow.jih !== 'registered') {
      return { objective: 'JIH App Registration', action: 'Help complete JIH App registration.' }
    }
    if (afterRow.ijtema === 'Pending') {
      return {
        objective: 'Weekly Ijtema Participation',
        action: 'Invite to Weekly Ijtema.',
      }
    }
    if (afterRow.baitulMaal === 'not_discussed') {
      return { objective: 'Baitul Maal Discussion', action: 'Introduce Baitul Maal.' }
    }
    return { objective: 'Campaign Complete', action: 'Keep regular contact.' }
  })()

  return {
    success: true,
    beforePct,
    afterPct,
    nextObjective: pending.objective,
    nextAction: pending.action,
  }
}

/** KC-0083 — compact follow-up lines derived from matrix pending states (no new persistence). */
export type TodaysFocusItem = {
  karkunId: string
  karkunName: string
  pendingLabel: string
  route: string
}

export function buildTodaysFocusItems(ruknId: string, limit = 6): TodaysFocusItem[] {
  const priorityRank = (label: string): number => {
    if (label.startsWith('Visit')) return 0
    if (label.startsWith('Registration')) return 1
    if (label.startsWith('Weekly Ijtema')) return 2
    return 3
  }

  const items: TodaysFocusItem[] = []
  for (const row of buildCampaignMatrixRows(ruknId)) {
    if (row.completed) continue
    let pendingLabel = ''
    if (!row.visitDone) pendingLabel = 'Visit Pending'
    else if (row.jih !== 'registered') pendingLabel = 'Registration Pending'
    else if (row.ijtema === 'Pending') pendingLabel = 'Weekly Ijtema Pending'
    else if (row.baitulMaal !== 'committed') pendingLabel = 'Baitul Maal Pending'
    else continue

    items.push({
      karkunId: row.karkunId,
      karkunName: row.karkunName,
      pendingLabel,
      route: ruknVisitPath(row.karkunId),
    })
  }

  return items
    .sort((a, b) => priorityRank(a.pendingLabel) - priorityRank(b.pendingLabel))
    .slice(0, limit)
}

export type MatrixStatusTone = 'done' | 'progress' | 'idle'

export function jihStatusChip(state: JihAppMatrixState): { emoji: string; label: string; tone: MatrixStatusTone } {
  switch (state) {
    case 'registered':
      return { emoji: '🟢', label: 'Registered', tone: 'done' }
    case 'installed':
      return { emoji: '🟡', label: 'Installed', tone: 'progress' }
    case 'discussed':
      return { emoji: '🟡', label: 'Discussed', tone: 'progress' }
    default:
      return { emoji: '⚪', label: 'Not Discussed', tone: 'idle' }
  }
}

export function baitulMaalStatusChip(
  state: BaitulMaalCampaignState,
): { emoji: string; label: string; tone: MatrixStatusTone } {
  switch (state) {
    case 'committed':
      return { emoji: '🟢', label: 'Committed', tone: 'done' }
    case 'discussed':
      return { emoji: '🟡', label: 'Discussed', tone: 'progress' }
    default:
      return { emoji: '⚪', label: 'Not Discussed', tone: 'idle' }
  }
}

export function ijtemaStatusChip(
  state: IjtemaAttendanceStatus | 'Pending',
): { emoji: string; label: string; tone: MatrixStatusTone } {
  if (state === 'Pending') return { emoji: '⚪', label: 'Pending', tone: 'idle' }
  if (state === 'Present') return { emoji: '🟢', label: 'Present', tone: 'done' }
  return { emoji: '🟡', label: state, tone: 'progress' }
}
