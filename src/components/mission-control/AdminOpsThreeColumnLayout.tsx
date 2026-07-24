/**
 * Previous Admin dashboard operational layout (Immediate Priorities /
 * Attention Required / Pending Actions).
 *
 * Kept for easy restore if the Action Center experiment is reverted.
 * Do not delete while the experiment is under review.
 */

import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/design-system/iconNames'
import { adminExecutionPath } from '@/constants/routes'
import type { AdminInterventionItem } from '@/lib/missionControl/adminMissionControlPresentation'
import type { AdminMissionControlModel } from '@/lib/missionControl/buildAdminMissionControl'
import type { AdminCommandCenterSnapshot } from '@/types/campaignAutomation.types'

const SEVERITY_CLASS = {
  critical: 'exdash-severity-critical',
  attention: 'exdash-severity-attention',
  watch: 'exdash-severity-watch',
} as const

const ALERT_SEVERITY_CLASS = {
  high: SEVERITY_CLASS.critical,
  medium: SEVERITY_CLASS.attention,
  low: SEVERITY_CLASS.watch,
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

type AdminOpsThreeColumnLayoutProps = {
  model: AdminMissionControlModel
  snapshot: AdminCommandCenterSnapshot
  interventions: AdminInterventionItem[]
  backgroundReady: boolean
}

export function AdminOpsThreeColumnLayout({
  model,
  snapshot,
  interventions,
  backgroundReady,
}: AdminOpsThreeColumnLayoutProps) {
  return (
    <div className="exdash-ops-command" aria-label="Operational command center">
      <section className="exdash-panel exdash-ops-column" aria-label="Immediate priorities">
        <div className="exdash-section-head">
          <ExdashSectionTitle title="Immediate Priorities" icon="flag" tone="amber" />
          <span className="exdash-section-meta">
            {model.todaysPriorities.length === 0
              ? 'Clear'
              : `${model.todaysPriorities.length} focus`}
          </span>
        </div>
        <div className="exdash-ops-column-body">
          {model.todaysPriorities.length === 0 ? (
            <p className="exdash-muted">No mission priorities right now.</p>
          ) : (
            <ol className="exdash-queue">
              {model.todaysPriorities.map((item, index) => (
                <li key={item.id}>
                  <Link to={item.route} className="exdash-queue-item">
                    <span className="exdash-queue-rank" aria-hidden="true">
                      {index + 1}
                    </span>
                    <div className="exdash-queue-body">
                      <span className="exdash-queue-title">{item.title}</span>
                      <span className="exdash-queue-detail">{item.detail}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <section className="exdash-panel exdash-ops-column" aria-label="Attention required">
        <div className="exdash-section-head">
          <ExdashSectionTitle title="Attention Required" icon="warning" tone="rose" />
          <span className="exdash-section-meta">
            {snapshot.alerts.length === 0 ? 'Clear' : `${snapshot.alerts.length} active`}
          </span>
        </div>
        <div className="exdash-ops-column-body">
          {snapshot.alerts.length === 0 ? (
            <p className="exdash-muted">No mission alerts right now.</p>
          ) : (
            <ol className="exdash-queue">
              {snapshot.alerts.map((alert, index) => (
                <li key={alert.id}>
                  <Link
                    to={alert.route || adminExecutionPath()}
                    className="exdash-queue-item"
                  >
                    <span className="exdash-queue-rank" aria-hidden="true">
                      {index + 1}
                    </span>
                    <div className="exdash-queue-body">
                      <span className="exdash-queue-title">{alert.title}</span>
                      <span className="exdash-queue-detail">{alert.message}</span>
                    </div>
                    <span className={`exdash-queue-badge ${ALERT_SEVERITY_CLASS[alert.severity]}`}>
                      {alert.severity}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <section className="exdash-panel exdash-ops-column" aria-label="Pending actions">
        <div className="exdash-section-head">
          <ExdashSectionTitle title="Pending Actions" icon="bell" tone="rose" />
          <span className="exdash-section-meta">
            {!backgroundReady
              ? 'Loading'
              : interventions.length === 0
                ? 'Clear'
                : `${interventions.length} prioritized`}
          </span>
        </div>
        <div className="exdash-ops-column-body">
          {!backgroundReady ? (
            <p className="exdash-muted" aria-busy="true">
              Loading campaign data…
            </p>
          ) : interventions.length === 0 ? (
            <p className="exdash-muted">No urgent interventions right now.</p>
          ) : (
            <ol className="exdash-queue">
              {interventions.map((item, index) => (
                <li key={item.id}>
                  <Link to={item.route} className="exdash-queue-item">
                    <span className="exdash-queue-rank" aria-hidden="true">
                      {index + 1}
                    </span>
                    <div className="exdash-queue-body">
                      <span className="exdash-queue-title">{item.title}</span>
                      <span className="exdash-queue-detail">{item.detail}</span>
                    </div>
                    <span className={`exdash-queue-badge ${SEVERITY_CLASS[item.severity]}`}>
                      {item.severity}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  )
}
