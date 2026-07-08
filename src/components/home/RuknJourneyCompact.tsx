import { JOURNEY_STAGE_LABELS, JOURNEY_STAGE_ORDER } from '@/types/guidance'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'

type RuknJourneyCompactProps = {
  ruknId: string
}

export function RuknJourneyCompact({ ruknId }: RuknJourneyCompactProps) {
  const guidanceList = getGuidanceForRuknKarkuns(ruknId)

  if (guidanceList.length === 0) {
    return null
  }

  const stageCounts = JOURNEY_STAGE_ORDER.map((stageId) => ({
    stageId,
    count: guidanceList.filter((guidance) => guidance.currentStage === stageId).length,
  })).filter((entry) => entry.count > 0)

  return (
    <section className="cd-journey-compact" aria-label="Journey summary">
      <h2 className="cd-section-heading cd-section-heading-sm">Journey at a glance</h2>
      <ul className="cd-journey-chips">
        {stageCounts.map((entry) => (
          <li key={entry.stageId} className="cd-journey-chip">
            <span className="cd-journey-chip-label">{JOURNEY_STAGE_LABELS[entry.stageId]}</span>
            <span className="cd-journey-chip-count">{entry.count}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
