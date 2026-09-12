import { Link } from 'react-router-dom'
import { adminCommunicationPath } from '@/lib/communicationNavigation'
import { useCommunication } from '@/hooks/useCommunication'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/design-system/iconNames'

export function CommunicationSummaryCards() {
  const { metrics } = useCommunication()

  const cards: {
    key: string
    label: string
    count: number
    section: 'history' | 'failed' | 'scheduled'
    icon: IconName
  }[] = [
    { key: 'today', label: "Today's Messages", count: metrics.messagesToday, section: 'history', icon: 'message' },
    { key: 'delivered', label: 'Delivered', count: metrics.delivered, section: 'history', icon: 'check' },
    { key: 'read', label: 'Read', count: metrics.read, section: 'history', icon: 'eye' },
    { key: 'pending', label: 'Pending', count: metrics.pending, section: 'history', icon: 'clock' },
    { key: 'failed', label: 'Failed', count: metrics.failed, section: 'failed', icon: 'warning' },
    { key: 'scheduled', label: 'Scheduled', count: metrics.scheduled, section: 'scheduled', icon: 'calendar' },
  ]

  return (
    <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
      {cards.map((card) => (
        <li key={card.key}>
          <Link to={adminCommunicationPath(card.section)} className="block">
            <div className="kc-panel flex min-h-[88px] flex-col px-4 py-3 transition-colors hover:border-kc-shell/20 sm:py-4">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary">
                <Icon name={card.icon} size="sm" />
                {card.label}
              </span>
              <span className="mt-1 text-2xl font-semibold tracking-tight text-text-heading sm:mt-2 sm:text-3xl">
                {card.count}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
