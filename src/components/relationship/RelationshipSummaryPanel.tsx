import type { KarkunNextAction, RelationshipHealth } from '@/types/guidance'
import { JourneyStageBadge, RelationshipHealthBadge } from '@/components/guidance'
import type { JourneyStageId } from '@/types/guidance'

type RelationshipSummaryPanelProps = {
  karkunName: string
  ruknName?: string
  journeyStageId?: JourneyStageId
  health?: RelationshipHealth
  nextAction?: KarkunNextAction
  connectionNumber?: string
}

export function RelationshipSummaryPanel({
  karkunName,
  ruknName,
  journeyStageId,
  health,
  nextAction,
  connectionNumber,
}: RelationshipSummaryPanelProps) {
  return (
    <section className="relationship-summary-panel" aria-label="Relationship summary">
      <dl className="relationship-summary-grid">
        <div className="relationship-summary-item">
          <dt>Connected Karkun</dt>
          <dd className="text-base font-semibold sm:text-lg">{karkunName}</dd>
        </div>

        {ruknName && (
          <div className="relationship-summary-item">
            <dt>Connected To</dt>
            <dd>{ruknName}</dd>
          </div>
        )}

        {journeyStageId && (
          <div className="relationship-summary-item">
            <dt>Journey</dt>
            <dd>
              <JourneyStageBadge stageId={journeyStageId} variant="rukn" />
            </dd>
          </div>
        )}

        {health && (
          <div className="relationship-summary-item">
            <dt>Health</dt>
            <dd>
              <RelationshipHealthBadge health={health} />
            </dd>
          </div>
        )}

        {nextAction && (
          <div className="relationship-summary-item relationship-summary-item-wide">
            <dt>Next Action</dt>
            <dd className="font-medium text-text-heading">{nextAction.label}</dd>
          </div>
        )}

        {connectionNumber && (
          <div className="relationship-summary-item">
            <dt>Connection</dt>
            <dd className="font-mono text-sm">{connectionNumber}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}
