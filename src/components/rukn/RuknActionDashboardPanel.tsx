/**
 * Phase 7 — Rukn action dashboard (TASK-055).
 * Answers “What needs my action?” from existing follow-up / journey / responsibility signals.
 * Work mutations stay on RuknWorkActionPanel. Calendar notices stay on notifications.
 */

import { Link } from 'react-router-dom'
import { buildRuknNowActions } from '@/lib/rukn/ruknActionDashboard'

type RuknActionDashboardPanelProps = {
  ruknId: string
}

export function RuknActionDashboardPanel({ ruknId }: RuknActionDashboardPanelProps) {
  const items = buildRuknNowActions(ruknId)

  return (
    <section
      className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card"
      aria-label="What needs my action?"
    >
      <h2 className="text-sm font-semibold text-text-heading">What needs my action?</h2>
      <p className="mt-1 text-xs text-secondary">
        Follow-ups, journey next steps, and active responsibilities. Work and calendar notices stay
        on their existing panels.
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-secondary">
          Nothing else needs action from follow-ups or journey right now.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="py-2.5">
              <Link to={item.href} className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-text-heading">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-secondary">{item.detail}</span>
                </span>
                <span className="shrink-0 text-sm font-medium text-primary">{item.actionLabel} →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
