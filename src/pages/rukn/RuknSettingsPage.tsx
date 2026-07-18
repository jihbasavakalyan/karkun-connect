import { PageHeader, PageShell } from '@/components/ui'
import { SettingsExperience } from '@/components/settings'

/** Rukn Settings — Profile, Rafeeq, Notifications, Appearance, Privacy, About. */
export function RuknSettingsPage() {
  return (
    <PageShell variant="narrow">
      <PageHeader
        title="Settings"
        description="Personalize your experience. Settings are optional—the app works well by default."
      />
      <SettingsExperience role="rukn" />
    </PageShell>
  )
}
