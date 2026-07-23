/**
 * KC-0094 / KC-0095 — Relationship intelligence for Communication + Companion Workspace.
 * Presentation only over Execution Matrix / Today's Focus — no new queries or engines.
 */

import {
  baitulMaalLabel,
  buildCampaignMatrixRows,
  ijtemaStatusChip,
  isRuknPostCampaignMode,
  jihAppLabel,
  type CampaignMatrixRow,
} from '@/lib/campaignExecutionMatrix'
import { getDailyProgressView } from '@/lib/dailyProgressPresentation'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getCurrentBaitulMaalStatus } from '@/services/baitulMaalService'
import { getCurrentIjtemaAttendance } from '@/services/ijtemaAttendanceService'
import { getCurrentMonthKey } from '@/services/jihWebPortalService'
import { getLatestSubmissionForKarkun } from '@/stores/annexure1Store'
import { getBaitulMaalRecord } from '@/stores/baitulMaalStore'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export type RelationshipJourneyStage =
  | 'First Meeting'
  | 'JIH App'
  | 'Weekly Ijtema'
  | 'Baitul Maal'
  | 'Regular Contact'
  | 'Campaign Completed'

export type RelationshipStatusLabel =
  | 'Needs Visit'
  | 'Needs Follow-up'
  | 'On Track'
  | 'High Engagement'
  | 'Campaign Complete'

export type ConnectedKarkunIntelligence = {
  karkunId: string
  karkunName: string
  journeyStage: RelationshipJourneyStage
  lastInteractionLabel: string
  lastInteractionDateLabel: string | null
  nextAction: string
  pendingObjective: string
  relationshipStatus: RelationshipStatusLabel
  /** Lower = needs attention sooner (Today's Focus order). */
  attentionRank: number
}

export type CampaignObjectiveProgress = {
  id: 'visit' | 'jih' | 'ijtema' | 'baitul'
  label: string
  completed: boolean
  detail: string
}

export type MeaningfulActivity = {
  id: string
  label: string
  dateLabel: string
  at: number
}

export type RecommendedActionView = {
  action: string
  reason: string
  priority: 'High' | 'Medium' | 'Low'
  pendingObjective: string
  attentionRank: number
}

export type CompanionWorkspaceModel = {
  intelligence: ConnectedKarkunIntelligence
  objectives: CampaignObjectiveProgress[]
  activities: MeaningfulActivity[]
  recommendation: RecommendedActionView
  rafeeqGuidance: string
}

type InteractionCandidate = {
  label: string
  at: number
  dateLabel: string
}

function formatShortDate(isoOrDate: string): string {
  const parsed = new Date(isoOrDate)
  if (Number.isNaN(parsed.getTime())) {
    const parts = isoOrDate.slice(0, 10).split('-')
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      }
    }
    return isoOrDate
  }
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function pushCandidate(
  list: InteractionCandidate[],
  label: string,
  iso?: string | null,
  fallbackDate?: string | null,
) {
  const raw = iso || fallbackDate
  if (!raw) return
  const at = new Date(raw).getTime()
  if (Number.isNaN(at) && fallbackDate) {
    const parts = fallbackDate.slice(0, 10).split('-')
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      if (!Number.isNaN(d.getTime())) {
        list.push({ label, at: d.getTime(), dateLabel: formatShortDate(fallbackDate) })
      }
    }
    return
  }
  if (Number.isNaN(at)) return
  list.push({ label, at, dateLabel: formatShortDate(raw) })
}

function collectMeaningfulInteractions(karkunId: string): InteractionCandidate[] {
  const candidates: InteractionCandidate[] = []
  const progress = getDailyProgressView(karkunId)
  const submission = getLatestSubmissionForKarkun(karkunId)

  if (submission?.visitConducted === 'yes') {
    pushCandidate(candidates, 'Visit completed', submission.submittedAt, submission.visitDate)
  } else if (submission?.visitConducted === 'no') {
    pushCandidate(candidates, 'Visit attempted', submission.submittedAt, submission.visitDate)
  } else if (progress.hasAnyProgress && progress.submission) {
    pushCandidate(
      candidates,
      'Visit recorded',
      progress.submission.submittedAt,
      progress.submission.visitDate,
    )
  }

  const karkun = getKarkunById(karkunId)
  if (karkun?.jihAppRegistrationStatus === 'Registered') {
    pushCandidate(candidates, 'JIH App registered', karkun.updatedAt)
  }

  const ijtema = getCurrentIjtemaAttendance(karkunId)
  if (ijtema.status === 'Present') {
    pushCandidate(candidates, 'Weekly Ijtema attended', ijtema.updatedAt)
  } else if (ijtema.status === 'Absent' || ijtema.status === 'Excused') {
    pushCandidate(candidates, `Weekly Ijtema ${ijtema.status.toLowerCase()}`, ijtema.updatedAt)
  }

  const baitul = getCurrentBaitulMaalStatus(karkunId)
  const baitulRecord = getBaitulMaalRecord(karkunId, getCurrentMonthKey())
  const baitulAt = baitulRecord?.updatedAt ?? baitul.paymentDate
  if (baitul.status === 'Paid' || baitul.status === 'Exempt') {
    pushCandidate(candidates, 'Baitul Maal contribution', baitulAt)
  } else if ((baitul.remarks ?? '').toLowerCase().includes('committed')) {
    pushCandidate(candidates, 'Baitul Maal contribution', baitulAt)
  } else if ((baitul.remarks ?? '').toLowerCase().includes('discussed')) {
    pushCandidate(candidates, 'Baitul Maal discussed', baitulAt)
  }

  return candidates.sort((a, b) => b.at - a.at)
}

/** Latest meaningful campaign activity — visit / JIH / Ijtema / Baitul Maal. */
export function resolveLastMeaningfulInteraction(karkunId: string): {
  label: string
  dateLabel: string | null
} {
  const candidates = collectMeaningfulInteractions(karkunId)
  if (candidates.length === 0) {
    return { label: 'No interaction yet', dateLabel: null }
  }
  const top = candidates[0]!
  return { label: top.label, dateLabel: top.dateLabel }
}

/** Newest-first activity list for Companion Workspace. */
export function listMeaningfulActivities(
  karkunId: string,
  limit = 8,
): MeaningfulActivity[] {
  return collectMeaningfulInteractions(karkunId)
    .slice(0, limit)
    .map((item, index) => ({
      id: `${karkunId}-activity-${index}-${item.at}`,
      label: item.label,
      dateLabel: item.dateLabel,
      at: item.at,
    }))
}

/** Same priority order as buildTodaysFocusItems / Execution Matrix. */
export function resolvePendingObjectiveAndAction(row: CampaignMatrixRow): {
  pendingObjective: string
  nextAction: string
  attentionRank: number
} {
  if (!row.visitDone) {
    return { pendingObjective: 'Visit', nextAction: 'Visit Due', attentionRank: 0 }
  }
  if (row.jih !== 'registered') {
    return {
      pendingObjective: 'JIH App',
      nextAction: 'Register JIH App',
      attentionRank: 1,
    }
  }
  if (row.ijtema === 'Pending') {
    return {
      pendingObjective: 'Weekly Ijtema',
      nextAction: 'Invite to Weekly Ijtema',
      attentionRank: 2,
    }
  }
  if (row.baitulMaal !== 'committed') {
    return {
      pendingObjective: 'Baitul Maal',
      nextAction: 'Discuss Baitul Maal',
      attentionRank: 3,
    }
  }
  return {
    pendingObjective: 'None',
    nextAction: 'Congratulate Progress',
    attentionRank: 4,
  }
}

export function resolveCampaignJourneyStage(
  row: CampaignMatrixRow,
  postCampaign: boolean,
): RelationshipJourneyStage {
  if (row.completed) {
    return postCampaign ? 'Regular Contact' : 'Campaign Completed'
  }
  if (!row.visitDone) return 'First Meeting'
  if (row.jih !== 'registered') return 'JIH App'
  if (row.ijtema === 'Pending') return 'Weekly Ijtema'
  if (row.baitulMaal !== 'committed') return 'Baitul Maal'
  return postCampaign ? 'Regular Contact' : 'Campaign Completed'
}

export function resolveRelationshipStatus(
  row: CampaignMatrixRow,
  pendingObjective: string,
): RelationshipStatusLabel {
  if (row.completed || pendingObjective === 'None') return 'Campaign Complete'
  if (!row.visitDone) return 'Needs Visit'
  if (row.visitDone && row.jih === 'registered' && row.ijtema === 'Present') {
    return 'High Engagement'
  }
  if (pendingObjective !== 'None') return 'Needs Follow-up'
  return 'On Track'
}

export function buildConnectedKarkunIntelligence(
  row: CampaignMatrixRow,
  postCampaign = isRuknPostCampaignMode(),
): ConnectedKarkunIntelligence {
  const { pendingObjective, nextAction, attentionRank } =
    resolvePendingObjectiveAndAction(row)
  const last = resolveLastMeaningfulInteraction(row.karkunId)

  return {
    karkunId: row.karkunId,
    karkunName: row.karkunName,
    journeyStage: resolveCampaignJourneyStage(row, postCampaign),
    lastInteractionLabel: last.label,
    lastInteractionDateLabel: last.dateLabel,
    nextAction,
    pendingObjective,
    relationshipStatus: resolveRelationshipStatus(row, pendingObjective),
    attentionRank,
  }
}

function emptyMatrixRow(karkun: KarkunRegistryRecord): CampaignMatrixRow {
  return {
    karkunId: karkun.id,
    karkunName: karkun.name,
    area: karkun.area || '',
    visitDone: false,
    jih: 'not_discussed',
    ijtema: 'Pending',
    baitulMaal: 'not_discussed',
    remarks: '',
    completed: false,
  }
}

export function getMatrixRowForKarkun(
  ruknId: string,
  karkun: KarkunRegistryRecord,
): CampaignMatrixRow {
  const row = buildCampaignMatrixRows(ruknId).find((item) => item.karkunId === karkun.id)
  return row ?? emptyMatrixRow(karkun)
}

export function buildCampaignObjectiveProgress(
  row: CampaignMatrixRow,
): CampaignObjectiveProgress[] {
  return [
    {
      id: 'visit',
      label: 'Visit',
      completed: row.visitDone,
      detail: row.visitDone ? 'Completed' : 'Pending',
    },
    {
      id: 'jih',
      label: 'JIH App',
      completed: row.jih === 'registered',
      detail: jihAppLabel(row.jih),
    },
    {
      id: 'ijtema',
      label: 'Weekly Ijtema',
      completed: row.ijtema !== 'Pending',
      detail: ijtemaStatusChip(row.ijtema).label,
    },
    {
      id: 'baitul',
      label: 'Baitul Maal',
      completed: row.baitulMaal === 'committed',
      detail: baitulMaalLabel(row.baitulMaal),
    },
  ]
}

function recommendationReason(pendingObjective: string, nextAction: string): string {
  switch (pendingObjective) {
    case 'Visit':
      return 'First campaign contact is still pending for this Connected Karkun.'
    case 'JIH App':
      return 'Visit progress is underway — JIH App registration is the next campaign objective.'
    case 'Weekly Ijtema':
      return 'Registration progress is complete — Weekly Ijtema invitation is the next objective.'
    case 'Baitul Maal':
      return 'Ijtema progress is recorded — Baitul Maal discussion is the remaining objective.'
    case 'None':
      return 'All campaign objectives for this Connected Karkun look complete.'
    default:
      return `${nextAction} is the highest-priority remaining campaign step.`
  }
}

function recommendationPriority(attentionRank: number): RecommendedActionView['priority'] {
  if (attentionRank <= 0) return 'High'
  if (attentionRank <= 2) return 'Medium'
  return 'Low'
}

/** KC-0095 — same Urdu model as Home / Communication, scoped to one Karkun. */
export function buildKarkunRafeeqGuidance(
  karkunName: string,
  pendingObjective: string,
): string {
  const trimmed = karkunName.trim() || 'کارکن'
  const name = /صاحب$|بیگم$|آپہ$/.test(trimmed) ? trimmed : `${trimmed} صاحب`

  switch (pendingObjective) {
    case 'Visit':
      return `${name} آپ کی ملاقات کے منتظر ہیں۔ آج ہی رابطہ مفید ہوگا۔`
    case 'JIH App':
      return `${name} کی JIH App رجسٹریشن میں مدد آج کا نرم اور مفید قدم ہو سکتا ہے۔`
    case 'Weekly Ijtema':
      return `اگر مناسب سمجھیں تو ${name} کو ہفتہ وار اجتماع کی دعوت دینا مفید ہو سکتا ہے۔`
    case 'Baitul Maal':
      return `${name} سے بیت المال کی گفتگو مکمل کرنا آج کا موزوں قدم ہے۔`
    case 'None':
      return `الحمد للہ — ${name} کے مہم کے اہم کام مکمل نظر آتے ہیں۔`
    default:
      return `اب ${name} سے ایک مختصر ملاقات مفید ہوگی۔`
  }
}

export function buildRecommendedActionView(row: CampaignMatrixRow): RecommendedActionView {
  const { pendingObjective, nextAction, attentionRank } =
    resolvePendingObjectiveAndAction(row)
  return {
    action: nextAction,
    reason: recommendationReason(pendingObjective, nextAction),
    priority: recommendationPriority(attentionRank),
    pendingObjective,
    attentionRank,
  }
}

/** KC-0095 — full Companion Workspace model for one Connected Karkun. */
export function buildCompanionWorkspaceModel(
  ruknId: string,
  karkun: KarkunRegistryRecord,
): CompanionWorkspaceModel {
  const postCampaign = isRuknPostCampaignMode()
  const row = getMatrixRowForKarkun(ruknId, karkun)
  const intelligence = buildConnectedKarkunIntelligence(row, postCampaign)
  const recommendation = buildRecommendedActionView(row)

  return {
    intelligence,
    objectives: buildCampaignObjectiveProgress(row),
    activities: listMeaningfulActivities(karkun.id),
    recommendation,
    rafeeqGuidance: buildKarkunRafeeqGuidance(karkun.name, recommendation.pendingObjective),
  }
}

/**
 * Intelligence cards for a Rukn's Connected Karkuns, ordered by who needs attention first.
 */
export function buildMyConnectedKarkunsIntelligence(
  ruknId: string,
  karkuns: KarkunRegistryRecord[],
): ConnectedKarkunIntelligence[] {
  const postCampaign = isRuknPostCampaignMode()
  const rows = buildCampaignMatrixRows(ruknId)
  const byId = new Map(rows.map((row) => [row.karkunId, row]))

  return karkuns
    .map((karkun) => {
      const row = byId.get(karkun.id) ?? emptyMatrixRow(karkun)
      return buildConnectedKarkunIntelligence(row, postCampaign)
    })
    .sort(
      (a, b) =>
        a.attentionRank - b.attentionRank || a.karkunName.localeCompare(b.karkunName),
    )
}

export type TodaysActionCard = {
  karkunId: string
  karkunName: string
  /** Outcome-based explanation lines (why attention is needed). */
  whyLines: string[]
  suggestedAction: string
  campaignObjective: string
  priority: RecommendedActionView['priority']
  attentionRank: number
}

function buildWhyAttentionLines(row: CampaignMatrixRow, pendingObjective: string): string[] {
  const lines: string[] = []

  if (pendingObjective === 'Visit') {
    lines.push('No visit completed yet.')
    lines.push('First campaign contact is still needed.')
    return lines
  }

  if (row.visitDone) {
    lines.push('Visit completed successfully.')
  }

  if (pendingObjective === 'JIH App') {
    lines.push('JIH App registration is still pending.')
    return lines
  }

  if (row.jih === 'registered') {
    lines.push('JIH App registration is complete.')
  }

  if (pendingObjective === 'Weekly Ijtema') {
    lines.push('Weekly Ijtema invitation is still pending.')
    return lines
  }

  if (row.ijtema !== 'Pending') {
    lines.push('Weekly Ijtema progress is recorded.')
  }

  if (pendingObjective === 'Baitul Maal') {
    lines.push('Baitul Maal discussion is still pending.')
    return lines
  }

  lines.push('Campaign attention is still useful for this Connected Karkun.')
  return lines
}

function buildSuggestedActionCopy(pendingObjective: string, nextAction: string): string {
  switch (pendingObjective) {
    case 'Visit':
      return 'Complete the first visit.'
    case 'JIH App':
      return 'Help complete JIH App registration.'
    case 'Weekly Ijtema':
      return 'Invite to Weekly Ijtema.'
    case 'Baitul Maal':
      return 'Discuss Baitul Maal contribution.'
    default:
      return nextAction.endsWith('.') ? nextAction : `${nextAction}.`
  }
}

/**
 * KC-0096 — Outcome-driven Today's Actions (Follow-ups tab content).
 * Only Connected Karkuns with remaining campaign objectives; no manual tasks.
 */
export function buildTodaysActionCards(
  ruknId: string,
  karkuns: KarkunRegistryRecord[],
): TodaysActionCard[] {
  const rows = buildCampaignMatrixRows(ruknId)
  const byId = new Map(rows.map((row) => [row.karkunId, row]))

  return karkuns
    .map((karkun) => {
      const row = byId.get(karkun.id) ?? emptyMatrixRow(karkun)
      const recommendation = buildRecommendedActionView(row)
      if (recommendation.pendingObjective === 'None') return null

      return {
        karkunId: karkun.id,
        karkunName: karkun.name,
        whyLines: buildWhyAttentionLines(row, recommendation.pendingObjective),
        suggestedAction: buildSuggestedActionCopy(
          recommendation.pendingObjective,
          recommendation.action,
        ),
        campaignObjective: recommendation.pendingObjective,
        priority: recommendation.priority,
        attentionRank: recommendation.attentionRank,
      } satisfies TodaysActionCard
    })
    .filter((card): card is TodaysActionCard => card !== null)
    .sort(
      (a, b) =>
        a.attentionRank - b.attentionRank || a.karkunName.localeCompare(b.karkunName),
    )
}
