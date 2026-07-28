/**
 * KC-0127 — Next Actions panel (deep-linked operational queues).
 */

import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { CommandCenterLinkItem } from '@/lib/missionControl/adminCommandCenterWorkflow'

type NextActionsPanelProps = {
  items: CommandCenterLinkItem[]
  ready: boolean
}

export function NextActionsPanel({ items, ready }: NextActionsPanelProps) {
  return (
    <section className="exdash-panel cc-workflow-panel" aria-label="Next Actions">
      <div className="exdash-section-head">
        <h2 className="exdash-section-title exdash-section-title-rose">
          <span className="exdash-section-icon exdash-section-icon-rose" aria-hidden="true">
            <Icon name="flag" size="sm" />
          </span>
          Next Actions
        </h2>
        <span className="exdash-section-meta">{ready ? `${items.length} open` : 'Loading'}</span>
      </div>

      {!ready ? (
        <p className="exdash-muted" aria-busy="true">
          Loading next actions…
        </p>
      ) : items.length === 0 ? (
        <p className="exdash-muted">No pending actions — campaign queues are clear.</p>
      ) : (
        <ul className="cc-action-list">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.route}
                className={`cc-action-row${item.tone === 'critical' ? ' cc-action-row-critical' : item.tone === 'warn' ? ' cc-action-row-warn' : ''}`}
              >
                <span className="cc-action-count" aria-hidden="true">
                  {item.count}
                </span>
                <span className="cc-action-copy">
                  <span className="cc-action-label">{item.label}</span>
                  <span className="cc-action-desc">{item.description}</span>
                </span>
                <span className="cc-action-go" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
