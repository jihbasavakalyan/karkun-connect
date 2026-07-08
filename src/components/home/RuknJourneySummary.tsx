import { JOURNEY_STAGE_LABELS, JOURNEY_STAGE_ORDER } from '@/types/guidance'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { HomeSection } from './HomeSection'

type RuknJourneySummaryProps = {
  ruknId: string
}

export function RuknJourneySummary({ ruknId }: RuknJourneySummaryProps) {
  const guidanceList = getGuidanceForRuknKarkuns(ruknId)

  if (guidanceList.length === 0) {
    return null
  }

  const stageCounts = JOURNEY_STAGE_ORDER.map((stageId) => ({
    stageId,
    count: guidanceList.filter((guidance) => guidance.currentStage === stageId).length,
  })).filter((entry) => entry.count > 0)

  const maxCount = Math.max(...stageCounts.map((entry) => entry.count), 1)

  return (
    <HomeSection title="Journey Summary" subtitle="Where your connections are on the path.">
      <article className="home-card home-card-muted">
        <ul className="space-y-3">
          {stageCounts.map((entry) => (
            <li key={entry.stageId}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-text-heading">{JOURNEY_STAGE_LABELS[entry.stageId]}</span>
                <span className="font-semibold text-primary">
                  {entry.count} Karkun{entry.count === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{ width: `${(entry.count / maxCount) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </article>
    </HomeSection>
  )
}
