import { ROUTES } from '@/constants/routes'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { getUpcomingCommitmentsForRukn } from '@/services/guidanceService'
import type { MorningBrief } from '@/types/guidance'

function greetingForHour(): string {
  const hour = new Date().getHours()
  if (hour < 12) {
    return 'Good Morning'
  }
  if (hour < 17) {
    return 'Good Afternoon'
  }
  return 'Good Evening'
}

export function buildMorningBrief(ruknId: string): MorningBrief {
  const guidanceList = getGuidanceForRuknKarkuns(ruknId)
  const nextActions = guidanceList
    .map((guidance) => ({
      ...guidance.nextAction,
      karkunId: guidance.karkunId,
      karkunName: guidance.karkunName,
    }))
    .slice(0, 5)

  const allReminders = guidanceList.flatMap((guidance) => guidance.reminders)
  const recommendedCalls = allReminders
    .filter((reminder) => reminder.type === 'call')
    .slice(0, 3)
  const recommendedVisits = allReminders
    .filter((reminder) => reminder.type === 'meeting' || reminder.type === 'visit')
    .slice(0, 3)

  const recentProgress = guidanceList
    .flatMap((guidance) => guidance.timeline)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 4)

  const urgentCount = guidanceList.filter(
    (guidance) =>
      guidance.health.level === 'urgent' || guidance.health.level === 'needs-attention',
  ).length

  const mission =
    guidanceList.length === 0
      ? 'Connect your first Karkun to begin today\'s campaign.'
      : urgentCount > 0
        ? `Focus on ${urgentCount} connection${urgentCount === 1 ? '' : 's'} that need your attention.`
        : 'Guide your connected Karkuns forward — one meaningful action at a time.'

  const dailyGoal =
    guidanceList.length === 0
      ? 'Connect 1 Karkun today'
      : `Complete ${Math.min(3, nextActions.length)} next action${nextActions.length === 1 ? '' : 's'} today`

  return {
    greeting: greetingForHour(),
    mission,
    dailyGoal,
    nextActions,
    upcomingCommitments: getUpcomingCommitmentsForRukn(ruknId, 4),
    recommendedCalls,
    recommendedVisits,
    recentProgress,
  }
}

export function morningBriefConnectRoute(): string {
  return ROUTES.RUKN_AVAILABLE_KARKUN
}
