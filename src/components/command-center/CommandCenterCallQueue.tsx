import { Link } from 'react-router-dom'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import type { CallQueueItem } from '@/types/campaignAutomation.types'

type CommandCenterCallQueueProps = {
  callQueue: CallQueueItem[]
}

export function CommandCenterCallQueue({ callQueue }: CommandCenterCallQueueProps) {
  if (callQueue.length === 0) {
    return null
  }

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Call Queue</h2>
      <p className="mt-1 text-sm text-secondary">Start with a call, then proceed to the visit</p>
      <ul className="mt-4 space-y-3">
        {callQueue.map((item, index) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3"
          >
            <div>
              <p className="text-xs font-medium uppercase text-secondary">
                {index === 0 ? 'Next call' : `Queue #${index + 1}`}
              </p>
              <p className="text-sm font-semibold text-text-heading">{item.label}</p>
              {item.mobile && <p className="text-xs text-secondary">{item.mobile}</p>}
            </div>
            <Link to={item.route}>
              <SecondaryButton type="button">Call completed →</SecondaryButton>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
