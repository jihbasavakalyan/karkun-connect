import { Link } from 'react-router-dom'
import { EnterpriseBadge, EnterpriseSectionHeader } from '@/components/enterprise'
import type { CallQueueItem } from '@/types/campaignAutomation.types'

type CommandCenterCallQueueProps = {
  callQueue: CallQueueItem[]
}

export function CommandCenterCallQueue({ callQueue }: CommandCenterCallQueueProps) {
  return (
    <section className="cc-card-sm">
      <EnterpriseSectionHeader title="Call Queue" />

      {callQueue.length === 0 ? (
        <p className="mt-1 text-xs text-secondary">All connected Karkuns have completed their initial call.</p>
      ) : (
        <ul className="cc-list-md mt-1 space-y-1">
          {callQueue.map((item, index) => (
            <li key={item.id}>
              <Link
                to={item.route}
                className="flex items-center justify-between gap-2 rounded border border-border bg-surface-muted/60 px-2 py-1.5 transition-colors hover:bg-surface-muted"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <EnterpriseBadge variant={index === 0 ? 'danger' : 'neutral'}>
                      {index === 0 ? 'Next' : `#${index + 1}`}
                    </EnterpriseBadge>
                    <span className="truncate text-xs font-semibold text-text-heading">{item.label}</span>
                  </div>
                  <p className="truncate text-[10px] text-secondary">{item.karkunName}</p>
                </div>
                <span className="shrink-0 text-[10px] font-medium text-primary">Open →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
