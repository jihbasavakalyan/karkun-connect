import type { RelationshipHealth } from '@/types/guidance'
import { StatusBadge, type StatusBadgeVariant } from '@/components/ui/StatusBadge'
import { getRelationshipHealthDisplayLabel } from '@/lib/relationshipIntelligencePresentation'
import type { JourneyStageId } from '@/types/guidance'

const LEVEL_VARIANT: Record<RelationshipHealth['level'], StatusBadgeVariant> = {
  healthy: 'healthy',
  'needs-attention': 'attention',
  urgent: 'urgent',
  dormant: 'dormant',
}

type RelationshipHealthBadgeProps = {
  health: RelationshipHealth
  showReasons?: boolean
  /** Journey stage refines Excellent vs Good for healthy relationships. */
  stageId?: JourneyStageId
}

export function RelationshipHealthBadge({
  health,
  showReasons = false,
  stageId,
}: RelationshipHealthBadgeProps) {
  const label = getRelationshipHealthDisplayLabel(health, stageId)

  return (
    <div className="ds-badge-block">
      <StatusBadge variant={LEVEL_VARIANT[health.level]} icon={health.icon}>
        {label}
      </StatusBadge>
      {showReasons && health.reasons[0] && (
        <p className="ds-helper max-w-xs">{health.reasons[0]}</p>
      )}
    </div>
  )
}
