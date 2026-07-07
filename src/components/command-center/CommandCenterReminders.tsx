import { Link } from 'react-router-dom'
import type { ReminderItem } from '@/types/campaignAutomation.types'

type CommandCenterRemindersProps = {
  reminders: ReminderItem[]
}

export function CommandCenterReminders({ reminders }: CommandCenterRemindersProps) {
  if (reminders.length === 0) {
    return null
  }

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Reminders</h2>
      <p className="mt-1 text-sm text-secondary">Generated from compliance and execution data</p>
      <ul className="mt-4 space-y-2">
        {reminders.map((reminder) => (
          <li key={reminder.id}>
            <Link
              to={reminder.route}
              className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 transition-shadow hover:shadow-card"
            >
              <span>
                <span className="block text-sm font-semibold text-text-heading">{reminder.label}</span>
                <span className="mt-0.5 block text-xs text-secondary">{reminder.reason}</span>
              </span>
              <span className="shrink-0 text-xs font-medium text-primary">Act →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
