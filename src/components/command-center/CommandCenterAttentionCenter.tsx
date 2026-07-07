import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type {
  AutomationAlert,
  FollowUpQueueGroup,
  ReminderItem,
} from '@/types/campaignAutomation.types'

type CommandCenterAttentionCenterProps = {
  alerts: AutomationAlert[]
  followUpQueue: FollowUpQueueGroup[]
  reminders: ReminderItem[]
}

type AttentionItem = {
  id: string
  title: string
  subtitle: string
  route: string
  tone: 'critical' | 'warning' | 'info'
}

type TabKey = 'critical' | 'today' | 'tomorrow' | 'thisWeek'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'critical', label: 'Critical' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'thisWeek', label: 'This Week' },
]

const TONE_DOT: Record<AttentionItem['tone'], string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
}

export function CommandCenterAttentionCenter({
  alerts,
  followUpQueue,
  reminders,
}: CommandCenterAttentionCenterProps) {
  const buckets = useMemo(() => {
    const followUpBy = (section: FollowUpQueueGroup['section']) =>
      (followUpQueue.find((group) => group.section === section)?.items ?? []).map<AttentionItem>(
        (item) => ({
          id: item.followUpId,
          title: item.karkunName,
          subtitle: item.purpose,
          route: item.route,
          tone: section === 'overdue' ? 'critical' : 'info',
        }),
      )

    const critical: AttentionItem[] = [
      ...alerts.map<AttentionItem>((alert) => ({
        id: alert.id,
        title: alert.title,
        subtitle: alert.message,
        route: alert.route,
        tone: alert.severity === 'high' ? 'critical' : alert.severity === 'medium' ? 'warning' : 'info',
      })),
      ...followUpBy('overdue'),
      ...reminders
        .filter((reminder) => reminder.priority <= 2)
        .map<AttentionItem>((reminder) => ({
          id: reminder.id,
          title: reminder.label,
          subtitle: reminder.reason,
          route: reminder.route,
          tone: 'warning',
        })),
    ]

    return {
      critical,
      today: followUpBy('today'),
      tomorrow: followUpBy('tomorrow'),
      thisWeek: followUpBy('thisWeek'),
    }
  }, [alerts, followUpQueue, reminders])

  const [active, setActive] = useState<TabKey>(
    buckets.critical.length > 0 ? 'critical' : 'today',
  )

  const items = buckets[active]

  return (
    <section className="cc-card-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="enterprise-section-title">Attention</h2>
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const count = buckets[tab.key].length
            const isActive = active === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActive(tab.key)}
                className={[
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-surface-muted text-secondary hover:text-text-heading',
                ].join(' ')}
              >
                {tab.label}
                {count > 0 && <span className={isActive ? 'ml-1' : 'ml-1 text-primary'}>{count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-2 text-xs text-secondary">Nothing needs attention here.</p>
      ) : (
        <ul className="cc-list-md mt-1.5 space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.route}
                className="flex items-center gap-2 rounded border border-border/80 px-2 py-1.5 transition-colors hover:bg-surface-muted"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[item.tone]}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-text-heading">{item.title}</p>
                  <p className="truncate text-[10px] text-secondary">{item.subtitle}</p>
                </div>
                <span className="shrink-0 text-[10px] font-medium text-primary">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
