import type { AdminCommandCenterSnapshot, CommandCenterKpi } from '@/types/campaignAutomation.types'
import type { KarkunGuidance, KarkunNextAction } from '@/types/guidance'

export function humanizePendingVisits(count: number): string {
  if (count === 0) return 'All connected Karkuns have had a visit.'
  if (count === 1) return '1 Karkun is waiting for a visit.'
  return `${count} Karkuns are waiting for a visit.`
}

export function humanizePendingRegistration(count: number): string {
  if (count === 0) return 'JIH registration is on track across your connections.'
  if (count === 1) return 'Help 1 Karkun complete JIH registration.'
  return `Help ${count} Karkuns complete JIH registration.`
}

export function humanizePendingCalls(count: number): string {
  if (count === 0) return 'Everyone has heard from you recently.'
  if (count === 1) return '1 person is waiting to hear from you.'
  return `${count} people are waiting to hear from you.`
}

export function humanizeFollowUps(count: number): string {
  if (count === 0) return 'No follow-ups are overdue.'
  if (count === 1) return '1 follow-up needs your attention today.'
  return `${count} follow-ups need your attention today.`
}

export function humanizeOverdueCommitments(count: number): string {
  if (count === 0) return 'All agreed next steps are on track.'
  if (count === 1) return '1 agreed next step is overdue.'
  return `${count} agreed next steps are overdue.`
}

export function humanizeConnectedKarkuns(count: number): string {
  if (count === 0) return 'No Karkuns connected yet.'
  if (count === 1) return '1 Karkun is connected to the campaign.'
  return `${count} Karkuns are connected to the campaign.`
}

export function getKpiValue(kpis: CommandCenterKpi[], id: string): number {
  return kpis.find((kpi) => kpi.id === id)?.value ?? 0
}

export function humanizeNextActionForKarkun(
  karkunName: string,
  action: KarkunNextAction,
): string {
  switch (action.kind) {
    case 'visit-this-week':
      return `${karkunName} is waiting for your visit.`
    case 'call-today':
      return `${karkunName} is waiting to hear from you.`
    case 'help-jih-registration':
      return `Help ${karkunName} complete JIH registration.`
    case 'invite-ijtema':
      return `Invite ${karkunName} to the next Ijtema.`
    case 'arrange-meeting':
      return `Arrange a meeting with ${karkunName}.`
    case 'reconnect':
      return `Reconnect with ${karkunName} — it has been a while.`
    case 'complete-visit-notes':
      return `Complete visit notes for ${karkunName}.`
    case 'honor-commitment':
      return `Follow through on your commitment with ${karkunName}.`
    case 'connect-karkun':
      return 'Connect with a new Karkun today.'
    default:
      return action.description
  }
}

export function buildAdminPriorityMessage(snapshot: AdminCommandCenterSnapshot): string {
  if (!snapshot.nextAction.isCaughtUp) {
    return snapshot.nextAction.description
  }

  const overdue = snapshot.followUpQueue.find((group) => group.section === 'overdue')
  if (overdue && overdue.items.length > 0) {
    return humanizeFollowUps(overdue.items.length)
  }

  const pendingVisits = getKpiValue(snapshot.kpis, 'pending-first-visits')
  if (pendingVisits > 0) {
    return humanizePendingVisits(pendingVisits)
  }

  return 'Your campaign is calm today — support your Rukns where momentum is needed.'
}

export function sortGuidanceByUrgency(guidanceList: KarkunGuidance[]): KarkunGuidance[] {
  const weight: Record<KarkunGuidance['health']['level'], number> = {
    dormant: 0,
    urgent: 1,
    'needs-attention': 2,
    healthy: 3,
  }

  return [...guidanceList].sort(
    (a, b) => weight[a.health.level] - weight[b.health.level] || a.karkunName.localeCompare(b.karkunName),
  )
}
