import { Link } from 'react-router-dom'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { EnterpriseBadge, EnterpriseSectionHeader } from '@/components/enterprise'
import type { CallQueueItem } from '@/types/campaignAutomation.types'

type CommandCenterCallQueueProps = {
  callQueue: CallQueueItem[]
}

export function CommandCenterCallQueue({ callQueue }: CommandCenterCallQueueProps) {
  return (
    <section className="cc-card-sm flex h-full min-h-[220px] flex-col">
      <EnterpriseSectionHeader title="Call Queue" />

      {callQueue.length === 0 ? (
        <p className="mt-2 text-sm text-secondary">All assigned Karkuns have completed their initial call.</p>
      ) : (
        <ul className="mt-2 max-h-[180px] flex-1 space-y-1.5 overflow-y-auto">
          {callQueue.map((item, index) => (
            <li
              key={item.id}
              className="rounded-lg border border-border bg-surface-muted/60 p-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <EnterpriseBadge variant={index === 0 ? 'danger' : 'neutral'}>
                    {index === 0 ? 'Next' : `#${index + 1}`}
                  </EnterpriseBadge>
                  <p className="mt-1 line-clamp-1 text-sm font-semibold text-text-heading">{item.label}</p>
                  <p className="text-xs text-secondary">{item.karkunName}</p>
                </div>
                <Link to={item.route}>
                  <SecondaryButton type="button" className="text-xs">
                    Open
                  </SecondaryButton>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
