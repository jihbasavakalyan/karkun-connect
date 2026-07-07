import { Link } from 'react-router-dom'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { EnterpriseBadge, EnterpriseSectionHeader } from '@/components/enterprise'
import type { CallQueueItem } from '@/types/campaignAutomation.types'

type CommandCenterCallQueueProps = {
  callQueue: CallQueueItem[]
}

export function CommandCenterCallQueue({ callQueue }: CommandCenterCallQueueProps) {
  if (callQueue.length === 0) {
    return (
      <section className="enterprise-card p-6">
        <EnterpriseSectionHeader
          title="Call Queue"
          subtitle="Call Queue Engine — no pending calls"
        />
        <p className="mt-4 text-sm text-secondary">All assigned Karkuns have completed their initial call.</p>
      </section>
    )
  }

  return (
    <section className="enterprise-card p-6">
      <EnterpriseSectionHeader
        title="Call Queue"
        subtitle="Call Queue Engine — start with a call, then proceed to visit"
      />
      <ul className="mt-4 space-y-3">
        {callQueue.map((item, index) => (
          <li
            key={item.id}
            className="rounded-xl border border-border bg-surface-muted/60 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <EnterpriseBadge variant={index === 0 ? 'danger' : 'neutral'}>
                    {index === 0 ? 'Next call' : `Queue #${index + 1}`}
                  </EnterpriseBadge>
                </div>
                <p className="mt-2 text-sm font-semibold text-text-heading">{item.label}</p>
                {item.mobile && <p className="mt-0.5 text-xs text-secondary">{item.mobile}</p>}
                <p className="mt-1 text-xs text-secondary">{item.karkunName}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={item.route}>
                  <SecondaryButton type="button">Open profile</SecondaryButton>
                </Link>
                <Link to={item.route}>
                  <SecondaryButton type="button">Call completed</SecondaryButton>
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
