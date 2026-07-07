import { Link } from 'react-router-dom'
import { EnterpriseSectionHeader } from '@/components/enterprise'
import type { FollowUpQueueGroup } from '@/types/campaignAutomation.types'

type CommandCenterFollowUpQueueProps = {
  followUpQueue: FollowUpQueueGroup[]
}

const SECTION_STYLES: Record<FollowUpQueueGroup['section'], string> = {
  overdue: 'border-red-200/80 bg-red-50/50',
  today: 'border-primary/30 bg-primary-muted/20',
  tomorrow: 'border-border bg-surface-muted/50',
  thisWeek: 'border-border bg-surface-muted/30',
}

export function CommandCenterFollowUpQueue({ followUpQueue }: CommandCenterFollowUpQueueProps) {
  if (followUpQueue.length === 0) {
    return (
      <section className="enterprise-card p-6">
        <EnterpriseSectionHeader
          title="Follow-up Queue"
          subtitle="Follow-up Engine — no pending follow-ups"
        />
        <p className="mt-4 text-sm text-secondary">All follow-ups are scheduled or completed.</p>
      </section>
    )
  }

  return (
    <section className="enterprise-card p-6">
      <EnterpriseSectionHeader
        title="Follow-up Queue"
        subtitle="Follow-up Engine — grouped by urgency"
      />
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {followUpQueue.map((group) => (
          <div key={group.section} className="min-w-0">
            <h3 className="text-sm font-semibold text-text-heading">{group.label}</h3>
            <ul className="mt-2 space-y-2">
              {group.items.map((item) => (
                <li key={item.followUpId}>
                  <Link
                    to={item.route}
                    className={[
                      'block rounded-xl border p-3 transition-shadow hover:shadow-card',
                      SECTION_STYLES[group.section],
                    ].join(' ')}
                  >
                    <p className="text-sm font-semibold text-text-heading">{item.karkunName}</p>
                    <p className="mt-0.5 text-xs text-secondary">{item.purpose}</p>
                    <p className="mt-1 text-[10px] font-medium uppercase text-secondary">
                      {item.followUpDate}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
