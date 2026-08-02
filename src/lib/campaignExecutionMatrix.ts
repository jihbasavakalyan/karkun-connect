/**
 * KC-0082 — Campaign Execution Matrix helpers.
 * Presentation + one-click updates over existing visit / JIH / Ijtema / Baitul Maal services.
 *
 * KC-0112.2
 * Reads Monthly Baitul Maal through the canonical adapter.
 *
 * KC-0112.6
 * Canonical Monthly Baitul Maal write path.
 * Legacy updates retained only for documented compatibility.
 */

import { getKarkunById, updateKarkunMeetingOutcomes } from '@/constants/mockKarkunRegistry'
import { ruknVisitPath } from '@/constants/routes'
import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import {
  buildFormFromDailyProgressOutcome,
  getDailyProgressView,
} from '@/lib/dailyProgressPresentation'
import { getMonthlyBaitulMaalCampaignStateView } from '@/lib/operations/monthlyBaitulMaalReadAdapter'
import { updateMonthlyBaitulMaalContribution } from '@/lib/operations/monthlyBaitulMaalWriteAdapter'
import {
  getWeeklyIjtemaCommitmentView,
  type WeeklyIjtemaCommitmentState,
} from '@/lib/operations/weeklyIjtemaReadAdapter'
import { markWeeklyIjtemaCommitment } from '@/lib/operations/weeklyIjtemaWriteAdapter'
import { saveDailyProgress } from '@/services/annexure1Service'
import { getCampaignTimeline } from '@/services/campaignService'
import { createCommitment } from '@/services/guidanceService'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import { getCommitmentsForKarkun } from '@/stores/guidanceStore'
import { createInitialAnnexure1FormState } from '@/types/annexure1.types'
import type { JihAppRegistrationStatus } from '@/types/karkun-registry.types'

export type JihAppMatrixState = 'not_discussed' | 'discussed' | 'installed' | 'registered'

export type BaitulMaalCampaignState = 'not_discussed' | 'discussed' | 'committed'

/** KC-037C2D — Weekly Ijtema Commitment (Matrix). */
export type WeeklyIjtemaMatrixState = WeeklyIjtemaCommitmentState

export type CampaignMatrixRow = {
  karkunId: string
  karkunName: string
  area: string
  visitDone: boolean
  jih: JihAppMatrixState
  /** KC-037C2D — Weekly Ijtema Commitment state (not weekly attendance). */
  ijtema: WeeklyIjtemaMatrixState
  baitulMaal: BaitulMaalCampaignState
  remarks: string
  /** True when Visit + JIH Registered + Ijtema Committed + Baitul Maal committed */
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

/**
 * Campaign-state helper — delegates to canonical Monthly BM adapter (KC-033).
 * Legacy Paid/Exempt/remarks vocabulary retained via adapter fallback.
 */
export function getBaitulMaalCampaignState(karkunId: string): BaitulMaalCampaignState {
  return getMonthlyBaitulMaalCampaignStateView(karkunId).state
}

export function buildCampaignMatrixRows(ruknId: string): CampaignMatrixRow[] {
  return getAssignedKarkunanForRukn(ruknId).map((karkun) => {
    const progress = getDailyProgressView(karkun.id)
    const visitDone = Boolean(
      progress.hasTodayProgress ||
        (progress.hasAnyProgress && progress.submission?.visitConducted === 'yes'),
    )
    const jih = getJihAppMatrixState(karkun.id)
    // KC-037C2D — Weekly Ijtema Commitment (campaign objective; not attendance).
    const ijtema = getWeeklyIjtemaCommitmentView(karkun.id).commitment
    // KC-0112.2
    // Reads Monthly Baitul Maal through the canonical adapter.
    // Legacy service retained until write migration.
    const baitulMaal = getMonthlyBaitulMaalCampaignStateView(karkun.id).state
    const completed =
      visitDone && jih === 'registered' && ijtema === 'committed' && baitulMaal === 'committed'

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
  const ijtemaRecorded = rows.filter((r) => r.ijtema === 'committed').length
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
): { success: true; next: WeeklyIjtemaMatrixState } | { success: false; error: string } {
  // KC-037C2D — Weekly Ijtema Commitment ladder (legacy only; not event attendance).
  const current = getWeeklyIjtemaCommitmentView(karkunId).commitment
  const cycle: WeeklyIjtemaMatrixState[] = [
    'not_discussed',
    'discussed',
    'committed',
    'deferred',
    'not_interested',
  ]
  const idx = cycle.indexOf(current)
  const next = cycle[(idx >= 0 ? idx + 1 : 0) % cycle.length]!
  const result = markWeeklyIjtemaCommitment({
    karkunId,
    commitment: next,
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
  ruknId?: string,
): { success: true; next: BaitulMaalCampaignState } | { success: false; error: string } {
  // KC-0112.6 — seed from canonical read adapter; write via write adapter.
  const current = getMonthlyBaitulMaalCampaignStateView(karkunId).state
  const order: BaitulMaalCampaignState[] = ['not_discussed', 'discussed', 'committed']
  const next = order[(order.indexOf(current) + 1) % order.length]!
  const actor = updatedBy ?? 'Rukn'

  if (next === 'not_discussed') {
    const result = updateMonthlyBaitulMaalContribution({
      karkunId,
      status: 'Pending',
      remarks: '',
      updatedBy: actor,
      ruknId,
    })
    return result.success
      ? { success: true, next }
      : { success: false, error: result.error }
  }

  if (next === 'discussed') {
    const result = updateMonthlyBaitulMaalContribution({
      karkunId,
      status: 'Pending',
      remarks: BAITUL_DISCUSSED,
      updatedBy: actor,
      ruknId,
    })
    return result.success
      ? { success: true, next }
      : { success: false, error: result.error }
  }

  // Committed — campaign conversation complete (also Contributed on open cycle).
  const result = updateMonthlyBaitulMaalContribution({
    karkunId,
    status: 'Pending',
    remarks: BAITUL_COMMITTED,
    updatedBy: actor,
    ruknId,
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
    weeklyIjtemaAttended: row.ijtema === 'committed',
    baitulMaalDiscussed: row.baitulMaal !== 'not_discussed',
  }
}

function karkunObjectivePct(row: CampaignMatrixRow): number {
  let done = 0
  if (row.visitDone) done += 1
  if (row.jih === 'registered') done += 1
  if (row.ijtema === 'committed') done += 1
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
  ruknId?: string,
): { success: true } | { success: false; error: string } {
  // KC-0112.6 — seed from canonical read adapter; write via write adapter.
  const current = getMonthlyBaitulMaalCampaignStateView(karkunId).state
  if (current === 'committed' || current === 'discussed') {
    return { success: true }
  }
  const result = updateMonthlyBaitulMaalContribution({
    karkunId,
    status: 'Pending',
    remarks: BAITUL_DISCUSSED,
    updatedBy: updatedBy ?? 'Rukn',
    ruknId,
  })
  return result.success ? { success: true } : { success: false, error: result.error }
}

function setIjtemaCommittedAbsolute(
  karkunId: string,
  ruknId: string,
  actorId?: string,
): { success: true } | { success: false; error: string } {
  // KC-037C2D — mark Committed (campaign objective), not weekly attendance.
  const current = getWeeklyIjtemaCommitmentView(karkunId)
  if (current.commitment === 'committed') {
    return { success: true }
  }
  const result = markWeeklyIjtemaCommitment({
    karkunId,
    commitment: 'committed',
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
    const ijtema = setIjtemaCommittedAbsolute(karkunId, ruknId, actorId)
    if (!ijtema.success) return ijtema
  }

  if (draft.baitulMaalDiscussed) {
    const baitul = setBaitulDiscussedAbsolute(karkunId, actorId ?? ruknId, ruknId)
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
    if (afterRow.ijtema === 'not_discussed') {
      return {
        objective: 'Weekly Ijtema Commitment',
        action: 'Discuss Weekly Ijtema commitment.',
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
    if (label.startsWith('Weekly Ijtema Commitment')) return 2
    return 3
  }

  const items: TodaysFocusItem[] = []
  for (const row of buildCampaignMatrixRows(ruknId)) {
    if (row.completed) continue
    let pendingLabel = ''
    if (!row.visitDone) pendingLabel = 'Visit Pending'
    else if (row.jih !== 'registered') pendingLabel = 'Registration Pending'
    else if (row.ijtema !== 'committed') pendingLabel = 'Weekly Ijtema Commitment Pending'
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

/** KC-037C2D — Matrix Commitment presentation. */
export function ijtemaStatusChip(
  state: WeeklyIjtemaMatrixState,
): { emoji: string; label: string; tone: MatrixStatusTone } {
  switch (state) {
    case 'committed':
      return { emoji: '🟢', label: 'Committed', tone: 'done' }
    case 'discussed':
      return { emoji: '🟡', label: 'Discussed', tone: 'progress' }
    case 'deferred':
      return { emoji: '🟡', label: 'Deferred', tone: 'progress' }
    case 'not_interested':
      return { emoji: '🟠', label: 'Not Interested', tone: 'progress' }
    default:
      return { emoji: '⚪', label: 'Not Discussed', tone: 'idle' }
  }
}
