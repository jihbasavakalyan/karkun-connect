import { useUserPreferences } from '@/hooks/useUserPreferences'
import type { NotificationPreferences } from '@/types/userPreferences.types'
import { SettingsRow, SettingsSection, SettingsToggle } from './SettingsPrimitives'

const ROWS: {
  key: keyof NotificationPreferences
  label: string
  hint: string
}[] = [
  {
    key: 'followUpReminders',
    label: 'Follow-up reminders',
    hint: 'Gentle nudges for pending follow-ups',
  },
  {
    key: 'meetingReminders',
    label: 'Meeting reminders',
    hint: 'Upcoming meeting prompts',
  },
  {
    key: 'ijtemaReminders',
    label: 'Ijtema reminders',
    hint: 'Ijtema attendance and preparation',
  },
  {
    key: 'campaignAnnouncements',
    label: 'Campaign announcements',
    hint: 'Important campaign updates',
  },
  {
    key: 'adminAnnouncements',
    label: 'Admin announcements',
    hint: 'Organisation-wide notices',
  },
]

export function NotificationSettingsSection() {
  const { preferences, setNotification } = useUserPreferences()

  return (
    <SettingsSection
      title="Notifications"
      description="Control reminders carefully. Prefer in-app guidance over noise."
    >
      {ROWS.map((row) => {
        const value = preferences.notifications[row.key]
        return (
          <div key={row.key} className="rounded-lg border border-border/70 bg-surface-muted/30 p-3">
            <p className="text-sm font-medium text-text-heading">{row.label}</p>
            <p className="mt-0.5 text-xs text-secondary">{row.hint}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <SettingsRow label="In-app">
                <SettingsToggle
                  label={`${row.label} in-app`}
                  checked={value.inApp}
                  onChange={(inApp) => setNotification(row.key, { inApp })}
                />
              </SettingsRow>
              <SettingsRow label="Push" hint="Reserved for later">
                <SettingsToggle
                  label={`${row.label} push`}
                  checked={value.push}
                  onChange={(push) => setNotification(row.key, { push })}
                />
              </SettingsRow>
            </div>
          </div>
        )
      })}
    </SettingsSection>
  )
}
