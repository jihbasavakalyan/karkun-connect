/**
 * Action Center experiment — single operational queue ordered by urgency.
 * Presentation only; reuses existing alert + intervention queue data.
 */

import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/design-system/iconNames'
import type { AdminActionCenterItem } from '@/lib/missionControl/adminDashboardOpsExperiment'

const SEVERITY_DOT_CLASS = {
  critical: 'exdash-action-dot-critical',
  high: 'exdash-action-dot-high',
  medium: 'exdash-action-dot-medium',
} as const

const SEVERITY_BADGE_CLASS = {
  critical: 'exdash-severity-critical',
  high: 'exdash-severity-attention',
  medium: 'exdash-severity-watch',
} as const

type SectionTone = 'sky' | 'amber' | 'rose' | 'violet' | 'slate' | 'teal'

function ExdashSectionTitle({
  title,
  icon,
  tone,
}: {
  title: string
  icon: IconName
  tone: SectionTone
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

type AdminActionCenterProps = {
  items: AdminActionCenterItem[]
  backgroundReady: boolean
}

export function AdminActionCenter({ items, backgroundReady }: AdminActionCenterProps) {
  return (
    <section className="exdash-panel exdash-action-center" aria-label="Action Center">
      <div className="exdash-section-head">
        <div className="exdash-action-center-head">
          <ExdashSectionTitle title="Action Center" icon="flag" tone="amber" />
          <p className="exdash-action-center-sub">
            Everything requiring action, ordered by urgency.
          </p>
        </div>
        <span className="exdash-section-meta">
          {!backgroundReady
            ? 'Loading'
            : items.length === 0
              ? 'Clear'
              : `${items.length} requiring action`}
        </span>
      </div>

      {!backgroundReady ? (
        <p className="exdash-muted" aria-busy="true">
          Loading campaign data…
        </p>
      ) : items.length === 0 ? (
        <p className="exdash-muted">Nothing requires attention right now.</p>
      ) : (
        <ol className="exdash-action-list">
          {items.map((item) => (
            <li key={item.id} className="exdash-action-row">
              <span
                className={`exdash-action-dot ${SEVERITY_DOT_CLASS[item.severity]}`}
                title={item.severityLabel}
                aria-label={item.severityLabel}
              />
              <div className="exdash-action-body">
                <div className="exdash-action-title-row">
                  <span className="exdash-queue-title">{item.title}</span>
                  {item.count != null ? (
                    <span className={`exdash-queue-badge ${SEVERITY_BADGE_CLASS[item.severity]}`}>
                      {item.count}
                    </span>
                  ) : (
                    <span className={`exdash-queue-badge ${SEVERITY_BADGE_CLASS[item.severity]}`}>
                      {item.severityLabel}
                    </span>
                  )}
                </div>
                <span className="exdash-queue-detail">{item.description}</span>
              </div>
              <Link to={item.route} className="exdash-action-cta">
                {item.actionLabel}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
