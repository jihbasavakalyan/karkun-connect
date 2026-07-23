/**
 * KC-0094 — Relationship intelligence for Rukn Communication (My Connected Karkuns).
 * Presentation only over Execution Matrix / Today's Focus — no new queries or engines.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import {
  buildCampaignMatrixRows,
  isRuknPostCampaignMode,
  type CampaignMatrixRow,
} from '@/lib/campaignExecutionMatrix'
import { getDailyProgressView } from '@/lib/dailyProgressPresentation'
import { getCurrentBaitulMaalStatus } from '@/services/baitulMaalService'
import { getCurrentIjtemaAttendance } from '@/services/ijtemaAttendanceService'
import { getLatestSubmissionForKarkun } from '@/stores/annexure1Store'
import { getBaitulMaalRecord } from '@/stores/baitulMaalStore'
import { getCurrentMonthKey } from '@/services/jihWebPortalService'
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

type InteractionCandidate = {
  label: string
  at: number
  dateLabel: string
}

function formatShortDate(isoOrDate: string): string {
  const parsed = new Date(isoOrDate)
  if (Number.isNaN(parsed.getTime())) {
    // Already a display date (e.g. visitDate YYYY-MM-DD)
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

/** Latest meaningful campaign activity — visit / JIH / Ijtema / Baitul Maal. */
export function resolveLastMeaningfulInteraction(karkunId: string): {
  label: string
  dateLabel: string | null
} {
  const candidates: InteractionCandidate[] = []
  const progress = getDailyProgressView(karkunId)
  const submission = getLatestSubmissionForKarkun(karkunId)

  if (submission?.visitConducted === 'yes') {
    pushCandidate(
      candidates,
      'Visit completed',
      submission.submittedAt,
      submission.visitDate,
    )
  } else if (submission?.visitConducted === 'no') {
    pushCandidate(
      candidates,
      'Visit attempted',
      submission.submittedAt,
      submission.visitDate,
    )
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
    pushCandidate(candidates, 'JIH registered', karkun.updatedAt)
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

  if (candidates.length === 0) {
    return { label: 'No interaction yet', dateLabel: null }
  }

  candidates.sort((a, b) => b.at - a.at)
  const top = candidates[0]!
  return { label: top.label, dateLabel: top.dateLabel }
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
      const row =
        byId.get(karkun.id) ??
        ({
          karkunId: karkun.id,
          karkunName: karkun.name,
          area: karkun.area || '',
          visitDone: false,
          jih: 'not_discussed',
          ijtema: 'Pending',
          baitulMaal: 'not_discussed',
          remarks: '',
          completed: false,
        } satisfies CampaignMatrixRow)
      return buildConnectedKarkunIntelligence(row, postCampaign)
    })
    .sort(
      (a, b) =>
        a.attentionRank - b.attentionRank || a.karkunName.localeCompare(b.karkunName),
    )
}
