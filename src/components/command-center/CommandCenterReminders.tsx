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
  return (
    <section className="cc-card-sm">
      <EnterpriseSectionHeader title="Reminder Center" />

      {reminders.length === 0 ? (
        <p className="mt-1 text-xs text-secondary">Compliance and execution reminders are up to date.</p>
      ) : (
        <ul className="cc-list-md mt-1 space-y-1">
          {reminders.map((reminder) => (
            <li key={reminder.id}>
              <Link
                to={reminder.route}
                className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1.5 transition-colors hover:bg-surface-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-text-heading">
                    {reminder.label}
                  </span>
                  <span className="block truncate text-[10px] text-secondary">{reminder.reason}</span>
                </span>
                <EnterpriseBadge variant={urgencyVariant(reminder.priority)}>Act</EnterpriseBadge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
