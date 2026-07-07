import { Link } from 'react-router-dom'
import { EnterpriseBadge, EnterpriseSectionHeader } from '@/components/enterprise'
import type { ReminderItem } from '@/types/campaignAutomation.types'

type CommandCenterRemindersProps = {
  reminders: ReminderItem[]
}

function urgencyVariant(priority: ReminderItem['priority']): 'danger' | 'warning' | 'info' | 'neutral' {
  if (priority <= 2) return 'danger'
  if (priority === 3) return 'warning'
  return 'info'
}

export function CommandCenterReminders({ reminders }: CommandCenterRemindersProps) {
  if (reminders.length === 0) {
    return (
      <section className="cc-card-sm">
        <EnterpriseSectionHeader title="Reminder Center" />
        <p className="mt-2 text-sm text-secondary">Compliance and execution reminders are up to date.</p>
      </section>
    )
  }

  return (
    <section className="cc-card-sm">
      <EnterpriseSectionHeader title="Reminder Center" />
      <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {reminders.map((reminder) => (
          <li key={reminder.id}>
            <Link
              to={reminder.route}
              className="flex items-start justify-between gap-2 rounded-lg border border-border p-2.5 transition-colors hover:bg-surface-muted"
            >
              <span className="min-w-0">
                <span className="block line-clamp-1 text-sm font-semibold text-text-heading">
                  {reminder.label}
                </span>
                <span className="mt-0.5 block line-clamp-1 text-xs text-secondary">{reminder.reason}</span>
              </span>
              <EnterpriseBadge variant={urgencyVariant(reminder.priority)}>Act</EnterpriseBadge>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
