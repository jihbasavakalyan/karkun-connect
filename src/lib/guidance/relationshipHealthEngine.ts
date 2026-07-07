import { getPendingCommitmentsForKarkun } from '@/services/guidanceService'
import {
  daysSince,
  hasVisitRecorded,
  isJihRegistered,
  todayIsoDate,
} from '@/lib/guidance/journeyEngine'
import type { JourneyStageId, RelationshipHealth, RelationshipHealthLevel } from '@/types/guidance'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

const HEALTH_META: Record<
  RelationshipHealthLevel,
  { label: string; icon: string }
> = {
  healthy: { label: 'Healthy', icon: '🟢' },
  'needs-attention': { label: 'Needs Attention', icon: '🟡' },
  urgent: { label: 'Urgent', icon: '🔴' },
  dormant: { label: 'Dormant', icon: '⚫' },
}

export function assessRelationshipHealth(
  karkun: KarkunRegistryRecord,
  assignmentId: string | undefined,
  currentStage: JourneyStageId,
): RelationshipHealth {
  const reasons: string[] = []
  const contactGap = daysSince(karkun.lastVisit || karkun.assignmentDate)
  const pendingCommitments = getPendingCommitmentsForKarkun(karkun.id)
  const overdueCommitment = pendingCommitments.find(
    (commitment) => commitment.targetDate < todayIsoDate(),
  )

  let level: RelationshipHealthLevel = 'healthy'

  if (contactGap >= 30 && contactGap < Number.POSITIVE_INFINITY) {
    level = 'dormant'
    reasons.push(`No contact for ${Math.floor(contactGap)} days.`)
  } else if (overdueCommitment) {
    level = 'urgent'
    reasons.push(`Overdue commitment: ${overdueCommitment.text}.`)
  } else if (contactGap >= 21) {
    level = 'urgent'
    reasons.push(`No contact for ${Math.floor(contactGap)} days.`)
  } else if (
    hasVisitRecorded(karkun, assignmentId) &&
    !isJihRegistered(karkun) &&
    currentStage === 'jih-registration' &&
    contactGap >= 14
  ) {
    level = 'urgent'
    reasons.push('JIH registration still pending after first meeting.')
  } else if (contactGap >= 14) {
    level = 'needs-attention'
    reasons.push(`No contact for ${Math.floor(contactGap)} days.`)
  } else if (pendingCommitments.some((c) => c.targetDate <= todayIsoDate())) {
    level = 'needs-attention'
    reasons.push('Commitment due today.')
  } else if (
    currentStage === 'jih-registration' &&
    hasVisitRecorded(karkun, assignmentId) &&
    !isJihRegistered(karkun)
  ) {
    level = 'needs-attention'
    reasons.push('JIH App registration is the next step.')
  }

  if (reasons.length === 0) {
    reasons.push('On track with the connection journey.')
  }

  const meta = HEALTH_META[level]
  return { level, label: meta.label, icon: meta.icon, reasons }
}
