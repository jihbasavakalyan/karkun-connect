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
    <section className="cc-card-sm">
      <EnterpriseSectionHeader title="Follow-up Queue" />

      {allItems.length === 0 ? (
        <p className="mt-1 text-xs text-secondary">All follow-ups are scheduled or completed.</p>
      ) : (
        <ul className="cc-list-md mt-1 space-y-1">
          {allItems.map((item) => (
            <li key={item.followUpId}>
              <Link
                to={item.route}
                className={[
                  'flex items-center justify-between gap-2 rounded border px-2 py-1 transition-shadow hover:shadow-card',
                  SECTION_STYLES[item.section],
                ].join(' ')}
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-text-heading">{item.karkunName}</p>
                  <p className="truncate text-[10px] text-secondary">{item.purpose}</p>
                </div>
                <span className="shrink-0 text-[9px] font-medium uppercase text-secondary">
                  {item.groupLabel}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
