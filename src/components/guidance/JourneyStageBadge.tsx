import { JOURNEY_STAGE_LABELS, type JourneyStageId } from '@/types/guidance'
import { getRuknJourneyStageLabel } from '@/lib/ruknProgressPresentation'
import { StatusBadge } from '@/components/ui/StatusBadge'

type JourneyStageBadgeProps = {
  stageId: JourneyStageId
  /** Rukn portal uses operational labels; admin keeps campaign labels. */
  variant?: 'default' | 'rukn'
}

export function JourneyStageBadge({ stageId, variant = 'default' }: JourneyStageBadgeProps) {
  const label =
    variant === 'rukn' ? getRuknJourneyStageLabel(stageId) : JOURNEY_STAGE_LABELS[stageId]
  return <StatusBadge variant="neutral">{label}</StatusBadge>
}
