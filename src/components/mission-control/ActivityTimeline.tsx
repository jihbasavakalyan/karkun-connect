/**
 * KC-0109 — Unified Activity Timeline (Live Activity + System History).
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { ROUTES } from '@/constants/routes'
import { buildActivityTimeline } from '@/lib/missionControl/campaignOperationsCommandCenter'
import { subscribeToActivityLog } from '@/stores/activityLogStore'

type ActivityTimelineProps = {
  limit?: number
  ready?: boolean
}

export function ActivityTimeline({ limit = 12, ready = true }: ActivityTimelineProps) {
  const [tick, setTick] = useState(0)

  useEffect(() => subscribeToActivityLog(() => setTick((value) => value + 1)), [])

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const items = useMemo(() => {
    void tick
    if (!ready) return []
    return buildActivityTimeline(limit)
  }, [tick, limit, ready])

  return (
    <section className="exdash-feed" aria-label="Activity Timeline">
      <div className="exdash-section-head">
        <div>
          <h2 className="exdash-section-title exdash-section-title-teal">
            <span className="exdash-section-icon exdash-section-icon-teal" aria-hidden="true">
              <Icon name="refresh" size="sm" />
            </span>
            Activity Timeline
          </h2>
          <p className="exdash-feed-subtitle">Field activity and system events, newest first</p>
        </div>
        <span className="exdash-feed-live" aria-hidden="true">
          ● Live
        </span>
      </div>

      {!ready ? (
        <p className="exdash-muted" aria-busy="true">
          Loading activity…
        </p>
      ) : items.length === 0 ? (
        <p className="exdash-muted">
          No activity yet. Visits, connections, and system events will appear here.
        </p>
      ) : (
        <ul className="exdash-feed-list">
          {items.map((item) => (
            <li key={item.id} className="exdash-feed-item">
              <div className="exdash-feed-avatar" aria-hidden="true">
                {item.initials}
              </div>
              <div className="exdash-feed-body">
                <div className="exdash-feed-row">
                  <p className="exdash-feed-actor">{item.actorName}</p>
                  <span className="exdash-feed-icon" title={item.kind} aria-hidden="true">
                    {item.icon}
                  </span>
                </div>
                <p className="exdash-feed-action">{item.actionLine}</p>
                <p className="exdash-feed-time">
                  {item.relativeTime}
                  <span className="exdash-feed-time-abs"> · {item.absoluteTime}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="exdash-feed-footer">
        <Link to={ROUTES.ADMIN_COMMUNICATION} className="exdash-section-link">
          View All Activity →
        </Link>
      </div>
    </section>
  )
}
