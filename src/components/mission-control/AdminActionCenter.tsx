/**
 * Today's Mission — compact primary execution hub for the Admin dashboard.
 * Presentation only; reuses existing alert + intervention queue data.
 */

import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/design-system/iconNames'
import { ROUTES, adminAllTasksPath } from '@/constants/routes'
import {
  ADMIN_TODAYS_MISSION_TOP_N,
  type AdminActionCenterItem,
} from '@/lib/missionControl/adminDashboardOpsExperiment'

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
  /** summary = top N on homepage; full = complete operational queue */
  variant?: 'summary' | 'full'
}

export function AdminActionCenter({
  items,
  backgroundReady,
  variant = 'summary',
}: AdminActionCenterProps) {
  const isSummary = variant === 'summary'
  const visibleItems = isSummary ? items.slice(0, ADMIN_TODAYS_MISSION_TOP_N) : items
  const title = isSummary ? "Today's Mission" : 'All Tasks'
  const subtitle = isSummary
    ? 'Tasks requiring your attention today'
    : 'Complete operational queue, ordered by urgency.'

  return (
    <section
      className={`exdash-panel exdash-action-center${isSummary ? ' exdash-action-center-compact' : ''}`}
      aria-label={title}
    >
      <div className="exdash-section-head">
        <div className="exdash-action-center-head">
          <ExdashSectionTitle title={title} icon="flag" tone="amber" />
          <p className="exdash-action-center-sub">{subtitle}</p>
        </div>
        <span className="exdash-section-meta">
          {!backgroundReady
            ? 'Loading'
            : items.length === 0
              ? 'Clear'
              : isSummary
                ? `${Math.min(items.length, ADMIN_TODAYS_MISSION_TOP_N)} of ${items.length}`
                : `${items.length} tasks`}
        </span>
      </div>

      {!backgroundReady ? (
        <p className="exdash-muted" aria-busy="true">
          Loading campaign data…
        </p>
      ) : visibleItems.length === 0 ? (
        <p className="exdash-muted">Nothing requires attention right now.</p>
      ) : (
        <ol className="exdash-action-list">
          {visibleItems.map((item) => (
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
                  ) : null}
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

      {isSummary && backgroundReady && items.length > 0 ? (
        <div className="exdash-action-footer">
          <Link to={adminAllTasksPath()} className="exdash-section-link">
            View All Tasks →
          </Link>
        </div>
      ) : null}

      {!isSummary ? (
        <div className="exdash-action-footer">
          <Link to={ROUTES.ADMIN} className="exdash-section-link">
            ← Back to Dashboard
          </Link>
        </div>
      ) : null}
    </section>
  )
}
