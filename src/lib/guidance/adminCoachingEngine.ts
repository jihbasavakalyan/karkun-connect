import { adminAssignmentsPath, adminKarkunProfilePath, ROUTES } from '@/constants/routes'
import { getAllRukns } from '@/lib/peopleStore'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { JOURNEY_STAGE_LABELS } from '@/types/guidance'
import type { AdminCoachingSnapshot, JourneyStageId } from '@/types/guidance'
import { getAllAssignments } from '@/stores/assignmentStore'

export function buildAdminCoachingSnapshot(): AdminCoachingSnapshot {
  const activeAssignments = getAllAssignments().filter((record) => record.status === 'Active')
  const ruknIds = [...new Set(activeAssignments.map((record) => record.ruknId))]

  const stageCounts = new Map<JourneyStageId, number>()
  let overdueCommitments = 0
  let needsSupport = 0

  const ruknsNeedingSupport: AdminCoachingSnapshot['ruknsNeedingSupport'] = []

  for (const ruknId of ruknIds) {
    const guidanceList = getGuidanceForRuknKarkuns(ruknId)
    const urgentKarkuns = guidanceList.filter(
      (guidance) =>
        guidance.health.level === 'urgent' || guidance.health.level === 'dormant',
    )

    if (urgentKarkuns.length > 0) {
      needsSupport++
      const rukn = getAllRukns().find((record) => record.id === ruknId)
      ruknsNeedingSupport.push({
        ruknId,
        ruknName: rukn?.name ?? ruknId,
        reason: `${urgentKarkuns.length} connected Karkun${urgentKarkuns.length === 1 ? '' : 's'} need outreach`,
        route: adminAssignmentsPath({ ruknId }),
      })
    }

    for (const guidance of guidanceList) {
      stageCounts.set(
        guidance.currentStage,
        (stageCounts.get(guidance.currentStage) ?? 0) + 1,
      )
      overdueCommitments += guidance.pendingCommitments.filter(
        (commitment) => commitment.targetDate < new Date().toISOString().slice(0, 10),
      ).length
    }
  }

  const jihBottleneck = stageCounts.get('jih-registration') ?? 0
  const visitBottleneck =
    (stageCounts.get('connected') ?? 0) + (stageCounts.get('first-meeting') ?? 0)

  const insights: AdminCoachingSnapshot['insights'] = []

  if (visitBottleneck > 0) {
    insights.push({
      id: 'visit-bottleneck',
      title: 'First visits needed',
      description: `${visitBottleneck} connected Karkun${visitBottleneck === 1 ? '' : 's'} are waiting for a first meeting.`,
      count: visitBottleneck,
      route: ROUTES.ADMIN_EXECUTION,
      tone: 'support',
    })
  }

  if (jihBottleneck > 0) {
    insights.push({
      id: 'jih-bottleneck',
      title: 'JIH registration support',
      description: `${jihBottleneck} Karkun${jihBottleneck === 1 ? '' : 's'} at ${JOURNEY_STAGE_LABELS['jih-registration']} — coaching can help.`,
      count: jihBottleneck,
      route: `${ROUTES.ADMIN_COMPLIANCE}?section=jih-portal`,
      tone: 'support',
    })
  }

  if (overdueCommitments > 0) {
    insights.push({
      id: 'overdue-commitments',
      title: 'Overdue commitments',
      description: `${overdueCommitments} agreed next step${overdueCommitments === 1 ? '' : 's'} need follow-through.`,
      count: overdueCommitments,
      route: ROUTES.ADMIN_FOLLOW_UP,
      tone: 'opportunity',
    })
  }

  if (needsSupport > 0) {
    insights.push({
      id: 'rukn-support',
      title: 'Rukns needing assistance',
      description: `${needsSupport} Rukn${needsSupport === 1 ? '' : 's'} could use coaching support today.`,
      count: needsSupport,
      route: ROUTES.ADMIN_RUKN,
      tone: 'support',
    })
  }

  if (insights.length === 0) {
    insights.push({
      id: 'all-clear',
      title: 'Campaign on track',
      description: 'No major bottlenecks right now. Celebrate progress with your team.',
      count: 0,
      route: ROUTES.ADMIN,
      tone: 'opportunity',
    })
  }

  return {
    insights: insights.slice(0, 4),
    ruknsNeedingSupport: ruknsNeedingSupport.slice(0, 5),
  }
}

export function adminCoachingKarkunRoute(karkunId: string): string {
  return adminKarkunProfilePath(karkunId)
}
