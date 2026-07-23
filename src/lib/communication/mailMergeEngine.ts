/**
 * KC-0077.1 / KC-0077.2 — Build per-recipient mail-merge variables from already-loaded stores.
 * No Firestore reads. Missing values → MAIL_MERGE_FALLBACK ('-').
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import {
  getConnectedKarkunCountForRukn,
  getConnectedKarkunsForRukn,
} from '@/lib/connections/getConnectedKarkunsForRukn'
import { buildIndividualCommunicationContext } from '@/lib/communicationContext'
import { MAIL_MERGE_FALLBACK } from '@/lib/communication/mailMergeVariables'
import { getKarkunGuidance } from '@/lib/guidance/guidanceEngine'
import { getActiveCampaignName } from '@/services/campaignService'
import { getNextFollowUpForKarkun, getPendingFollowUps } from '@/services/followUpService'
import { getConnectionStatusLabel } from '@/lib/connectionLabels'
import type { MessageRecipient } from '@/types/communication'

function orFallback(value: string | null | undefined): string {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed || MAIL_MERGE_FALLBACK
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function setAliases(vars: Record<string, string>, key: string, value: string): void {
  vars[key] = value
  if (key === 'TodaysDate') {
    vars["Today'sDate"] = value
  }
}

function fillRuknPlaybookStats(vars: Record<string, string>, ruknId: string): void {
  const connected = getConnectedKarkunsForRukn(ruknId)
  const assignedCount = getConnectedKarkunCountForRukn(ruknId)
  const pendingFollowUps = getPendingFollowUps().filter((item) => item.ruknId === ruknId)
  const todayIso = new Date().toISOString().slice(0, 10)
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  const list =
    connected.length > 0
      ? connected.map((karkun, index) => `${index + 1}. ${karkun.name}`).join('\n')
      : MAIL_MERGE_FALLBACK

  const pendingFirstContact = connected.filter(
    (karkun) => !karkun.lastVisit || karkun.visitStatus === 'none',
  ).length
  const pendingVisits = connected.filter(
    (karkun) =>
      karkun.visitStatus === 'pending' ||
      karkun.visitStatus === 'overdue' ||
      karkun.visitStatus === 'scheduled',
  ).length
  const completedVisits = connected.filter((karkun) => karkun.visitStatus === 'completed').length
  const recentlyAdded = connected.filter((karkun) => {
    const stamp = karkun.assignmentDate || karkun.createdAt
    if (!stamp) return false
    const ms = Date.parse(stamp)
    return Number.isFinite(ms) && ms >= weekAgo
  })

  setAliases(vars, 'AssignedKarkunCount', String(assignedCount))
  setAliases(vars, 'ConnectedCount', String(assignedCount))
  setAliases(vars, 'AssignedKarkunList', list)
  setAliases(vars, 'KarkunWord', assignedCount === 1 ? 'کارکن' : 'کارکنان')
  setAliases(vars, 'PendingFirstContact', String(pendingFirstContact))
  setAliases(vars, 'PendingFollowUps', String(pendingFollowUps.length))
  setAliases(
    vars,
    'RecentlyAddedKarkuns',
    recentlyAdded.length > 0
      ? recentlyAdded.map((karkun) => karkun.name).join('، ')
      : MAIL_MERGE_FALLBACK,
  )
  setAliases(vars, 'RecentlyRemovedKarkuns', MAIL_MERGE_FALLBACK)
  setAliases(vars, 'CompletedVisits', String(completedVisits))
  setAliases(vars, 'PendingVisits', String(pendingVisits))
  setAliases(
    vars,
    'TodaysVisits',
    String(pendingFollowUps.filter((item) => item.followUpDate === todayIso).length),
  )
}

export function buildMailMergeVariablesForRecipient(
  recipient: MessageRecipient,
): Record<string, string> {
  const vars: Record<string, string> = {}
  const today = todayLabel()
  const campaign = orFallback(getActiveCampaignName() || undefined)
  setAliases(vars, 'TodaysDate', today)
  setAliases(vars, 'CampaignName', campaign)
  setAliases(vars, 'campaign', campaign)
  setAliases(vars, 'Phone', orFallback(recipient.mobile))
  setAliases(vars, 'date', today)
  setAliases(vars, 'time', MAIL_MERGE_FALLBACK)
  setAliases(vars, 'venue', MAIL_MERGE_FALLBACK)
  setAliases(vars, 'event', MAIL_MERGE_FALLBACK)
  setAliases(
    vars,
    'month',
    new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  )

  if (recipient.personKind === 'karkun') {
    const karkun = getKarkunById(recipient.personId)
    const context = buildIndividualCommunicationContext(recipient.personId)
    const guidance = getKarkunGuidance(recipient.personId)
    const nextFollowUp = getNextFollowUpForKarkun(recipient.personId)
    const ruknName = orFallback(
      context?.assignedRuknName === 'Unassigned' ? undefined : context?.assignedRuknName,
    )

    setAliases(vars, 'KarkunName', orFallback(karkun?.name ?? recipient.name))
    setAliases(vars, 'name', orFallback(karkun?.name ?? recipient.name))
    setAliases(vars, 'RuknName', ruknName)
    setAliases(vars, 'CurrentStatus', orFallback(karkun?.status))
    setAliases(
      vars,
      'ConnectionStatus',
      karkun ? getConnectionStatusLabel(karkun.assignmentStatus) : MAIL_MERGE_FALLBACK,
    )
    setAliases(
      vars,
      'LastVisitDate',
      orFallback(context?.lastVisit === 'None' ? undefined : context?.lastVisit ?? karkun?.lastVisit),
    )
    setAliases(
      vars,
      'PendingAction',
      orFallback(guidance?.nextAction?.label ?? guidance?.nextAction?.kind),
    )
    setAliases(
      vars,
      'NextMeeting',
      orFallback(nextFollowUp?.formattedDate ?? nextFollowUp?.followUpDate),
    )
    setAliases(vars, 'Area', orFallback(karkun?.area))
    setAliases(vars, 'AssignedKarkunCount', MAIL_MERGE_FALLBACK)
    setAliases(vars, 'AssignedKarkunList', MAIL_MERGE_FALLBACK)
    setAliases(vars, 'ConnectedCount', MAIL_MERGE_FALLBACK)
    setAliases(vars, 'PendingFirstContact', MAIL_MERGE_FALLBACK)
    setAliases(vars, 'PendingFollowUps', MAIL_MERGE_FALLBACK)
    setAliases(vars, 'RecentlyAddedKarkuns', MAIL_MERGE_FALLBACK)
    setAliases(vars, 'RecentlyRemovedKarkuns', MAIL_MERGE_FALLBACK)
    setAliases(vars, 'CompletedVisits', MAIL_MERGE_FALLBACK)
    setAliases(vars, 'PendingVisits', MAIL_MERGE_FALLBACK)
    setAliases(vars, 'TodaysVisits', MAIL_MERGE_FALLBACK)
    return vars
  }

  const rukn = getRuknById(recipient.personId)
  setAliases(vars, 'RuknName', orFallback(rukn?.name ?? recipient.name))
  setAliases(vars, 'name', orFallback(rukn?.name ?? recipient.name))
  setAliases(vars, 'KarkunName', MAIL_MERGE_FALLBACK)
  setAliases(vars, 'CurrentStatus', orFallback(rukn?.status))
  setAliases(vars, 'ConnectionStatus', MAIL_MERGE_FALLBACK)
  setAliases(vars, 'LastVisitDate', MAIL_MERGE_FALLBACK)
  setAliases(vars, 'PendingAction', MAIL_MERGE_FALLBACK)
  setAliases(vars, 'NextMeeting', MAIL_MERGE_FALLBACK)
  setAliases(vars, 'Area', orFallback(rukn?.place))
  fillRuknPlaybookStats(vars, recipient.personId)
  return vars
}
