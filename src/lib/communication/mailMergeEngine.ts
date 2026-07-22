/**
 * KC-0077.1 — Build per-recipient mail-merge variables from already-loaded stores.
 * No Firestore reads. Missing values → MAIL_MERGE_FALLBACK ('-').
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { getConnectedKarkunCountForRukn } from '@/lib/connections/getConnectedKarkunsForRukn'
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
  // Support {{Today'sDate}} style keys in templates
  if (key === 'TodaysDate') {
    vars["Today'sDate"] = value
  }
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
    // Rukn-only keys unused for karkun — still fill fallbacks so raw placeholders never leak
    setAliases(vars, 'AssignedKarkunCount', MAIL_MERGE_FALLBACK)
    setAliases(vars, 'TodaysVisits', MAIL_MERGE_FALLBACK)
    setAliases(vars, 'PendingFollowUps', MAIL_MERGE_FALLBACK)
    return vars
  }

  const rukn = getRuknById(recipient.personId)
  const assignedCount = getConnectedKarkunCountForRukn(recipient.personId)
  const pendingFollowUps = getPendingFollowUps().filter((item) => item.ruknId === recipient.personId)
  const todaysFollowUps = pendingFollowUps.filter((item) => {
    const todayIso = new Date().toISOString().slice(0, 10)
    return item.followUpDate === todayIso
  })

  setAliases(vars, 'RuknName', orFallback(rukn?.name ?? recipient.name))
  setAliases(vars, 'name', orFallback(rukn?.name ?? recipient.name))
  setAliases(vars, 'KarkunName', MAIL_MERGE_FALLBACK)
  setAliases(vars, 'CurrentStatus', orFallback(rukn?.status))
  setAliases(vars, 'ConnectionStatus', MAIL_MERGE_FALLBACK)
  setAliases(vars, 'LastVisitDate', MAIL_MERGE_FALLBACK)
  setAliases(vars, 'PendingAction', MAIL_MERGE_FALLBACK)
  setAliases(vars, 'NextMeeting', MAIL_MERGE_FALLBACK)
  setAliases(vars, 'Area', orFallback(rukn?.place))
  setAliases(vars, 'AssignedKarkunCount', String(assignedCount))
  setAliases(vars, 'TodaysVisits', String(todaysFollowUps.length))
  setAliases(vars, 'PendingFollowUps', String(pendingFollowUps.length))
  return vars
}
