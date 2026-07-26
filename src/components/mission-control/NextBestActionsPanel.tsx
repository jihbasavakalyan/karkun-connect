/**
 * KC-0120 — Next Best Actions panel.
 * Presentation only — consumes Priority Intelligence Engine output.
 */

import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/design-system/iconNames'
import { adminMissionWorkspacePath } from '@/constants/routes'
import type {
  PriorityItem,
  PrioritySeverity,
} from '@/lib/priorityIntelligence'

const SEVERITY_BADGE: Record<PrioritySeverity, string> = {
  Critical: 'exdash-severity-critical',
  High: 'exdash-severity-attention',
  Medium: 'exdash-severity-watch',
  Low: 'exdash-severity-watch',
}

type NextBestActionsPanelProps = {
  priorities: PriorityItem[]
  backgroundReady: boolean
  /** Opens existing Communication Preview for notify recommendations. */
  onNotify: (item: PriorityItem) => void
}

function ExdashSectionTitle({
  title,
  icon,
  tone,
}: {
  title: string
  icon: IconName
  tone: 'sky' | 'amber' | 'rose' | 'violet' | 'slate' | 'teal'
}) {
  return (
    <h2 className={`exdash-section-title exdash-section-title-${tone}`}>
      <span className={`exdash-section-icon exdash-section-icon-${tone}`} aria-hidden="true">
        <Icon name={icon} size="sm" />
      </span>
      {title}
    </h2>
  )
}

export function NextBestActionsPanel({
  priorities,
  backgroundReady,
  onNotify,
}: NextBestActionsPanelProps) {
  return (
    <section className="exdash-panel exdash-action-center" aria-label="Next Best Actions">
      <div className="exdash-section-head">
        <div className="exdash-action-center-head">
          <ExdashSectionTitle title="Next Best Actions" icon="flag" tone="rose" />
          <p className="exdash-action-center-sub">
            Priority Intelligence — recommended actions from campaign signals
          </p>
        </div>
        <span className="exdash-section-meta">
          {!backgroundReady ? 'Loading' : priorities.length === 0 ? 'Clear' : `${priorities.length} priorities`}
        </span>
      </div>

      {!backgroundReady ? (
        <p className="exdash-muted" aria-busy="true">
          Loading campaign data…
        </p>
      ) : priorities.length === 0 ? (
        <p className="exdash-muted">Nothing requires attention right now.</p>
      ) : (
        <ol className="exdash-action-list">
          {priorities.map((item) => {
            const action = item.recommendedAction
            return (
              <li key={item.id} className="exdash-action-row">
                <span
                  className={`exdash-queue-badge ${SEVERITY_BADGE[item.severity]}`}
                  aria-label={item.severity}
                >
                  {item.severity.toUpperCase()}
                </span>
                <div className="exdash-action-body">
                  <span className="exdash-queue-title">{item.reason}</span>
                  <span className="exdash-queue-detail">
                    Recommended Action: {action.recommendation}
                    {item.responsiblePersonLabel
                      ? ` · ${item.responsiblePersonLabel}`
                      : null}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
                  {action.kind === 'notify' && action.communicationContext ? (
                    <button
                      type="button"
                      className="exdash-action-cta"
                      onClick={() => onNotify(item)}
                    >
                      {action.label}
                    </button>
                  ) : action.route ? (
                    <Link to={action.route} className="exdash-action-cta">
                      {action.label}
                    </Link>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <div className="exdash-action-footer">
        <Link to={adminMissionWorkspacePath()} className="exdash-section-link">
          Open Mission Workspace →
        </Link>
      </div>
    </section>
  )
}
