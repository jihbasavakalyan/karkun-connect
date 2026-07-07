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
  const allItems = followUpQueue.flatMap((group) =>
    group.items.map((item) => ({ ...item, section: group.section, groupLabel: group.label })),
  )

  return (
    <section className="cc-card-sm flex h-full min-h-[220px] flex-col">
      <EnterpriseSectionHeader title="Follow-up Queue" />

      {allItems.length === 0 ? (
        <p className="mt-2 text-sm text-secondary">All follow-ups are scheduled or completed.</p>
      ) : (
        <ul className="mt-2 max-h-[180px] flex-1 space-y-1.5 overflow-y-auto">
          {allItems.map((item) => (
            <li key={item.followUpId}>
              <Link
                to={item.route}
                className={[
                  'block rounded-lg border p-2 transition-shadow hover:shadow-card',
                  SECTION_STYLES[item.section],
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-semibold text-text-heading">{item.karkunName}</p>
                  <span className="shrink-0 text-[10px] font-medium uppercase text-secondary">
                    {item.groupLabel}
                  </span>
                </div>
                <p className="line-clamp-1 text-xs text-secondary">{item.purpose}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
