import { JOURNEY_STAGE_LABELS, type JourneyStageId } from '@/types/guidance'
import { StatusBadge } from '@/components/ui/StatusBadge'

type JourneyStageBadgeProps = {
  stageId: JourneyStageId
}

export function JourneyStageBadge({ stageId }: JourneyStageBadgeProps) {
  return <StatusBadge variant="neutral">{JOURNEY_STAGE_LABELS[stageId]}</StatusBadge>
}
