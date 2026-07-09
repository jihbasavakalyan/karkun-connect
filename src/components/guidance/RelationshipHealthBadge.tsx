import type { RelationshipHealth } from '@/types/guidance'
import { StatusBadge, type StatusBadgeVariant } from '@/components/ui/StatusBadge'

const LEVEL_VARIANT: Record<RelationshipHealth['level'], StatusBadgeVariant> = {
  healthy: 'healthy',
  'needs-attention': 'attention',
  urgent: 'urgent',
  dormant: 'dormant',
}

type RelationshipHealthBadgeProps = {
  health: RelationshipHealth
  showReasons?: boolean
}

export function RelationshipHealthBadge({
  health,
  showReasons = false,
}: RelationshipHealthBadgeProps) {
  return (
    <div className="ds-badge-block">
      <StatusBadge variant={LEVEL_VARIANT[health.level]} icon={health.icon}>
        {health.label}
      </StatusBadge>
      {showReasons && health.reasons[0] && (
        <p className="ds-helper max-w-xs">{health.reasons[0]}</p>
      )}
    </div>
  )
}
