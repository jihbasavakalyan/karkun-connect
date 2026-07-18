import { PageHeader, PageShell } from '@/components/ui'
import { SettingsExperience } from '@/components/settings'

/** Admin Settings — full role-aware experience including Campaign & Data. */
export function SettingsPage() {
  return (
    <PageShell variant="narrow">
      <PageHeader
        title="Settings"
        description="Personalization and administration. The app works well by default—visit here only when you need to adjust something."
      />
      <SettingsExperience role="administrator" />
    </PageShell>
  )
}
