import { Link } from 'react-router-dom'
import { adminCommunicationPath } from '@/lib/communicationNavigation'
import { useCommunication } from '@/hooks/useCommunication'

export function CommunicationSummaryCards() {
  const { metrics } = useCommunication()

  const cards = [
    { key: 'today', label: "Today's Messages", count: metrics.messagesToday, section: 'history' as const, icon: '📨' },
    { key: 'delivered', label: 'Delivered', count: metrics.delivered, section: 'history' as const, icon: '✅' },
    { key: 'read', label: 'Read', count: metrics.read, section: 'history' as const, icon: '👁' },
    { key: 'pending', label: 'Pending', count: metrics.pending, section: 'history' as const, icon: '⏳' },
    { key: 'failed', label: 'Failed', count: metrics.failed, section: 'failed' as const, icon: '⚠️' },
    { key: 'scheduled', label: 'Scheduled', count: metrics.scheduled, section: 'scheduled' as const, icon: '📅' },
  ]

  return (
    <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
      {cards.map((card) => (
        <li key={card.key}>
          <Link to={adminCommunicationPath(card.section)} className="block">
            <div className="flex min-h-[88px] flex-col rounded-lg border border-border bg-surface px-4 py-3 shadow-card transition-shadow hover:shadow-card-hover sm:py-4">
              <span className="text-sm font-medium text-secondary">
                {card.icon} {card.label}
              </span>
              <span className="mt-1 text-2xl font-semibold text-text-heading sm:mt-2 sm:text-3xl">
                {card.count}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
