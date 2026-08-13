/**
 * KC-0127 — Attention Required widget (registry / delivery issues).
 */

import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { CommandCenterLinkItem } from '@/lib/missionControl/adminCommandCenterWorkflow'

type AttentionRequiredPanelProps = {
  items: CommandCenterLinkItem[]
  ready: boolean
}

export function AttentionRequiredPanel({ items, ready }: AttentionRequiredPanelProps) {
  return (
    <section className="exdash-panel cc-workflow-panel" aria-label="Attention Required">
      <div className="exdash-section-head">
        <h2 className="exdash-section-title exdash-section-title-amber">
          <span className="exdash-section-icon exdash-section-icon-amber" aria-hidden="true">
            <Icon name="warning" size="sm" />
          </span>
          Attention Required
        </h2>
        <span className="exdash-section-meta">{ready ? `${items.length} items` : 'Loading'}</span>
      </div>

      {!ready ? (
        <p className="exdash-muted" aria-busy="true">
          Scanning registry health…
        </p>
      ) : items.length === 0 ? (
        <p className="exdash-muted">No attention items right now.</p>
      ) : (
        <ul className="cc-attention-grid">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.route}
                className={`cc-attention-card${item.tone === 'critical' ? ' cc-attention-card-critical' : ''}`}
              >
                <p className="cc-attention-count">{item.count}</p>
                <p className="cc-attention-label">{item.label}</p>
                <p className="cc-attention-desc">{item.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
