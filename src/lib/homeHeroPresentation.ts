import { CAMPAIGN_MOTTO_LINES } from '@/constants/campaignIdentity'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'

export const ADMIN_CAMPAIGN_MOTIVATION =
  'Every meaningful connection strengthens our Jamaat.'

export function greetingForTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function campaignMottoLine(): string {
  return CAMPAIGN_MOTTO_LINES[0] ?? ADMIN_CAMPAIGN_MOTIVATION
}

export function buildRuknDailyFocus(ruknId: string): string {
  const guidanceList = getGuidanceForRuknKarkuns(ruknId)

  if (guidanceList.length === 0) {
    return 'Help new Karkuns begin their journey.'
  }

  const waitingVisit = guidanceList.filter(
    (guidance) =>
      guidance.nextAction.kind === 'visit-this-week' ||
      guidance.currentStage === 'connected' ||
      guidance.currentStage === 'first-meeting',
  ).length

  const jihPending = guidanceList.filter(
    (guidance) => guidance.currentStage === 'jih-registration',
  ).length

  const needsOutreach = guidanceList.filter(
    (guidance) =>
      guidance.health.level === 'urgent' ||
      guidance.health.level === 'dormant' ||
      guidance.health.level === 'needs-attention',
  ).length

  if (waitingVisit >= 2) {
    return 'Guide waiting Karkuns — meaningful visits come first today.'
  }

  if (jihPending >= 2) {
    return 'Complete pending JIH registrations with your connections.'
  }

  if (needsOutreach >= 2) {
    return 'Strengthen relationships that need your attention.'
  }

  if (waitingVisit === 1) {
    return 'A Karkun is waiting for your visit today.'
  }

  return 'Strengthen existing relationships — one meaningful step at a time.'
}

export function timelineStatusLabel(status: 'upcoming' | 'active' | 'completed'): string {
  if (status === 'upcoming') return 'Upcoming'
  if (status === 'completed') return 'Completed'
  return 'Active'
}
