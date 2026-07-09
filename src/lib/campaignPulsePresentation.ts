import type { IconName } from '@/design-system/iconNames'
import { getAnnexure1ExecutionMetrics } from '@/services/annexure1Service'
import { buildAdminCoachingSnapshot } from '@/lib/guidance/adminCoachingEngine'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { getCampaignProgressOverview } from '@/lib/commandCenterPresentation'

export type CampaignPulseLevel = 'healthy' | 'needs-attention' | 'critical'

export type CampaignPulse = {
  level: CampaignPulseLevel
  label: string
  icon: IconName
  signals: string[]
}

const LEVEL_META: Record<CampaignPulseLevel, { label: string; icon: IconName }> = {
  healthy: { label: 'Healthy', icon: 'pulse-healthy' },
  'needs-attention': { label: 'Needs Attention', icon: 'pulse-attention' },
  critical: { label: 'Critical', icon: 'pulse-critical' },
}

export function buildAdminCampaignPulse(): CampaignPulse {
  const coaching = buildAdminCoachingSnapshot()
  const overview = getCampaignProgressOverview()
  const annexure = getAnnexure1ExecutionMetrics()

  const signals: string[] = []
  let criticalScore = 0
  let attentionScore = 0

  const overdueInsight = coaching.insights.find((item) => item.id === 'overdue-commitments')
  const visitInsight = coaching.insights.find((item) => item.id === 'visit-bottleneck')
  const jihInsight = coaching.insights.find((item) => item.id === 'jih-bottleneck')

  if (coaching.ruknsNeedingSupport.length >= 3) {
    criticalScore += 2
    signals.push('Several Rukns need assistance')
  } else if (coaching.ruknsNeedingSupport.length > 0) {
    attentionScore += 1
    signals.push(
      `${coaching.ruknsNeedingSupport.length} Rukn${coaching.ruknsNeedingSupport.length === 1 ? '' : 's'} could use coaching today`,
    )
  }

  if (overdueInsight && overdueInsight.count >= 5) {
    criticalScore += 2
    signals.push('Overdue visits detected')
  } else if (overdueInsight && overdueInsight.count > 0) {
    attentionScore += 1
    signals.push(`${overdueInsight.count} agreed next steps need follow-through`)
  }

  if (jihInsight && jihInsight.count >= 4) {
    attentionScore += 1
    signals.push('Pending registrations increasing')
  } else if (jihInsight && jihInsight.count > 0) {
    signals.push('Some Karkuns still need JIH registration support')
  }

  if (visitInsight && visitInsight.count > 0) {
    signals.push(`${visitInsight.count} Karkun${visitInsight.count === 1 ? '' : 's'} are waiting for a first meeting`)
  }

  if (overview.overall < 30 && annexure.pendingMeetings > 10) {
    criticalScore += 3
    signals.unshift('Campaign falling behind', 'Immediate intervention required')
  }

  let level: CampaignPulseLevel = 'healthy'
  if (criticalScore >= 2) {
    level = 'critical'
  } else if (attentionScore >= 2 || criticalScore >= 1) {
    level = 'needs-attention'
  }

  if (level === 'healthy') {
    if (signals.length === 0) {
      signals.push('Coverage improving', 'Visits on schedule')
      if (overview.compliance >= 40) {
        signals.push('Registrations increasing')
      }
    }
  }

  const meta = LEVEL_META[level]
  return {
    level,
    label: meta.label,
    icon: meta.icon,
    signals: signals.slice(0, 4),
  }
}

export function buildRuknCampaignPulse(ruknId: string): CampaignPulse {
  const guidanceList = getGuidanceForRuknKarkuns(ruknId)
  const urgent = guidanceList.filter(
    (guidance) => guidance.health.level === 'urgent' || guidance.health.level === 'dormant',
  )
  const needsAttention = guidanceList.filter(
    (guidance) => guidance.health.level === 'needs-attention',
  )

  const signals: string[] = []
  let level: CampaignPulseLevel = 'healthy'

  if (urgent.length >= 2) {
    level = 'critical'
    signals.push('Several connections need immediate outreach')
  } else if (urgent.length === 1) {
    level = 'needs-attention'
    signals.push(`${urgent[0].karkunName} needs your attention now`)
  } else if (needsAttention.length >= 2) {
    level = 'needs-attention'
    signals.push(`${needsAttention.length} connections could use a check-in`)
  } else if (needsAttention.length === 1) {
    level = 'needs-attention'
    signals.push(`${needsAttention[0].karkunName} could use a check-in`)
  } else if (guidanceList.length === 0) {
    signals.push('Connect your first Karkun to begin your campaign')
  } else {
    signals.push('Your connections are on track', 'Keep guiding one meaningful step at a time')
  }

  const meta = LEVEL_META[level]
  return {
    level,
    label: meta.label,
    icon: meta.icon,
    signals: signals.slice(0, 3),
  }
}
