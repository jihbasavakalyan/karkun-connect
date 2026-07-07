import type { RelationshipHealth } from '@/types/guidance'

const LEVEL_STYLES: Record<RelationshipHealth['level'], string> = {
  healthy: 'border-green-200 bg-green-50 text-green-800',
  'needs-attention': 'border-amber-200 bg-amber-50 text-amber-800',
  urgent: 'border-red-200 bg-red-50 text-red-800',
  dormant: 'border-border bg-surface-muted text-secondary',
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
    <div className={`rounded-lg border px-3 py-2 ${LEVEL_STYLES[health.level]}`}>
      <p className="text-sm font-semibold">
        {health.icon} {health.label}
      </p>
      {showReasons && health.reasons[0] && (
        <p className="mt-1 text-xs opacity-90">{health.reasons[0]}</p>
      )}
    </div>
  )
}
