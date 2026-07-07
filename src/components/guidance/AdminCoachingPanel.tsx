import { Link } from 'react-router-dom'
import { buildAdminCoachingSnapshot } from '@/lib/guidance/adminCoachingEngine'
import type { AdminCoachingSnapshot } from '@/types/guidance'

type AdminCoachingPanelProps = {
  snapshot?: AdminCoachingSnapshot
}

export function AdminCoachingPanel({ snapshot }: AdminCoachingPanelProps) {
  const coaching = snapshot ?? buildAdminCoachingSnapshot()

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Where to Help Today</h2>
      <p className="mt-1 text-sm text-secondary">
        Coaching insights — support your Rukns where the campaign needs momentum.
      </p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {coaching.insights.map((insight) => (
          <li key={insight.id}>
            <Link
              to={insight.route}
              className="flex h-full flex-col rounded-lg border border-border bg-surface-muted p-4 transition-shadow hover:shadow-card"
            >
              <span className="text-2xl font-semibold text-primary">{insight.count}</span>
              <span className="mt-2 font-medium text-text-heading">{insight.title}</span>
              <span className="mt-1 flex-1 text-sm text-secondary">{insight.description}</span>
            </Link>
          </li>
        ))}
      </ul>

      {coaching.ruknsNeedingSupport.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-text-heading">Rukns Requiring Assistance</h3>
          <ul className="mt-3 space-y-2">
            {coaching.ruknsNeedingSupport.map((item) => (
              <li key={item.ruknId}>
                <Link
                  to={item.route}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm hover:border-primary"
                >
                  <span className="font-medium text-text-heading">{item.ruknName}</span>
                  <span className="text-secondary">{item.reason}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
