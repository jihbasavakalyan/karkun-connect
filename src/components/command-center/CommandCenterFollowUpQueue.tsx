import { Link } from 'react-router-dom'
import type { FollowUpQueueGroup } from '@/types/campaignAutomation.types'

type CommandCenterFollowUpQueueProps = {
  followUpQueue: FollowUpQueueGroup[]
}

const SECTION_STYLES: Record<FollowUpQueueGroup['section'], string> = {
  overdue: 'border-red-200 bg-red-50/60',
  today: 'border-primary/30 bg-surface',
  tomorrow: 'border-border bg-surface-muted',
  thisWeek: 'border-border bg-surface-muted',
}

export function CommandCenterFollowUpQueue({ followUpQueue }: CommandCenterFollowUpQueueProps) {
  if (followUpQueue.length === 0) {
    return null
  }

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Follow-up Queue</h2>
      <p className="mt-1 text-sm text-secondary">Grouped by urgency from follow-up records</p>
      <div className="mt-4 space-y-4">
        {followUpQueue.map((group) => (
          <div key={group.section}>
            <h3 className="text-sm font-semibold text-text-heading">{group.label}</h3>
            <ul className="mt-2 space-y-2">
              {group.items.map((item) => (
                <li key={item.followUpId}>
                  <Link
                    to={item.route}
                    className={[
                      'block rounded-lg border px-4 py-3 transition-shadow hover:shadow-card',
                      SECTION_STYLES[group.section],
                    ].join(' ')}
                  >
                    <p className="text-sm font-semibold text-text-heading">{item.karkunName}</p>
                    <p className="mt-0.5 text-xs text-secondary">{item.purpose}</p>
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
