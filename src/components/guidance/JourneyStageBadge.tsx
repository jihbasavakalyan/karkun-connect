import { JOURNEY_STAGE_LABELS, type JourneyStageId } from '@/types/guidance'

type JourneyStageBadgeProps = {
  stageId: JourneyStageId
}

export function JourneyStageBadge({ stageId }: JourneyStageBadgeProps) {
  return (
    <span className="inline-flex rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-text-heading">
      {JOURNEY_STAGE_LABELS[stageId]}
    </span>
  )
}
