/**
 * Phase 7 — Admin organisational picture (TASK-060).
 * Derived counts only. Not a hierarchy or analytics store.
 */

import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { AdminOrganisationalPicture } from '@/lib/missionControl/adminOrganisationalPicture'

type OrganisationalPicturePanelProps = {
  picture: AdminOrganisationalPicture
  ready: boolean
}

export function OrganisationalPicturePanel({ picture, ready }: OrganisationalPicturePanelProps) {
  return (
    <section className="exdash-panel cc-workflow-panel" aria-label="Organisational picture">
      <div className="exdash-section-head">
        <h2 className="exdash-section-title exdash-section-title-teal">
          <span className="exdash-section-icon exdash-section-icon-teal" aria-hidden="true">
            <Icon name="users" size="sm" />
          </span>
          Organisational picture
        </h2>
        <span className="exdash-section-meta">{ready ? 'Current state' : 'Loading'}</span>
      </div>

      {!ready ? (
        <p className="exdash-muted" aria-busy="true">
          Loading organisational picture…
        </p>
      ) : (
        <>
          <p className="exdash-muted">
            Connection → Development → Participation → Responsibility → Leadership, plus existing
            operational counts. Not a new organisation database.
          </p>
          <ul className="cc-progress-grid mt-3">
            {picture.journey.map((cell) => (
              <li key={cell.id}>
                <Link to={cell.route} className="cc-progress-card">
                  <p className="cc-progress-label">{cell.label}</p>
                  <p className="cc-attention-count">{cell.count}</p>
                  <p className="cc-attention-desc">{cell.description}</p>
                </Link>
              </li>
            ))}
          </ul>
          <ul className="cc-attention-grid mt-3">
            {picture.operations.map((cell) => (
              <li key={cell.id}>
                <Link to={cell.route} className="cc-attention-card">
                  <p className="cc-attention-count">{cell.count}</p>
                  <p className="cc-attention-label">{cell.label}</p>
                  <p className="cc-attention-desc">{cell.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
