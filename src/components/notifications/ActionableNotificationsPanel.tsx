/**
 * Phase 6 — Actionable notifications panel (TASK-050).
 * Derived from Calendar/Occurrence + Work. Deep-links to existing surfaces.
 * Not an inbox. Not a second communication model.
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import {
  loadActionableNotificationsForUser,
  type ActionableNotificationAudience,
} from '@/lib/notifications/actionableNotifications'

type ActionableNotificationsPanelProps = {
  audience: ActionableNotificationAudience
  ruknId?: string
  variant?: 'command-center' | 'card'
}

export function ActionableNotificationsPanel({
  audience,
  ruknId,
  variant = 'card',
}: ActionableNotificationsPanelProps) {
  const { preferences } = useUserPreferences()
  const items = useMemo(
    () =>
      loadActionableNotificationsForUser({
        audience,
        ruknId,
        preferences: preferences.notifications,
      }),
    [audience, preferences.notifications, ruknId],
  )

  if (variant === 'command-center') {
    return (
      <section className="exdash-panel cc-workflow-panel" aria-label="Actionable notifications">
        <div className="exdash-section-head">
          <h2 className="exdash-section-title exdash-section-title-sky">
            <span className="exdash-section-icon exdash-section-icon-sky" aria-hidden="true">
              <Icon name="flag" size="sm" />
            </span>
            Actionable notifications
          </h2>
          <span className="exdash-section-meta">{items.length} open</span>
        </div>
        {items.length === 0 ? (
          <p className="exdash-muted">No actionable notifications from calendar or work.</p>
        ) : (
          <ul className="cc-action-list">
            {items.map((item) => (
              <li key={item.id}>
                <Link to={item.actionHref} className="cc-action-row">
                  <span className="cc-action-copy">
                    <span className="cc-action-label">{item.title}</span>
                    <span className="cc-action-desc">{item.body}</span>
                  </span>
                  <span className="cc-action-go" aria-hidden="true">
                    {item.actionLabel} →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  }

  return (
    <section
      className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card"
      aria-label="Actionable notifications"
    >
      <h2 className="text-sm font-semibold text-text-heading">Actionable notifications</h2>
      <p className="mt-1 text-xs text-secondary">
        From calendar and work. Opens the existing action surface.
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-secondary">Nothing needs action from calendar or work right now.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="py-2.5">
              <p className="text-sm font-semibold text-text-heading">{item.title}</p>
              <p className="mt-0.5 text-xs text-secondary">{item.body}</p>
              <Link
                to={item.actionHref}
                className="mt-1.5 inline-flex text-sm font-medium text-primary"
              >
                {item.actionLabel} →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
