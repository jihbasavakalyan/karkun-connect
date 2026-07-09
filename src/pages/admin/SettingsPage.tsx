import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE, APP_VERSION } from '@/constants/app'
import { getActiveCampaignName, formatActiveCampaignDuration } from '@/services/campaignService'
import { DangerZone } from '@/components/admin/DangerZone'
import { PageHeader, PageShell } from '@/components/ui'

export function SettingsPage() {
  const campaignName = getActiveCampaignName()
  const campaignDuration = formatActiveCampaignDuration()

  return (
    <PageShell variant="narrow">
      <PageHeader
        title="Settings"
        description="Pilot configuration and application information."
      />

      <div className="ds-section-group">
        <section className="ds-section">
          <h2 className="ds-section-title">Application</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-secondary">Name</dt>
              <dd className="font-medium text-text-heading">{APP_NAME}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-secondary">Tagline</dt>
              <dd className="font-medium text-text-heading">{APP_TAGLINE}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-secondary">Version</dt>
              <dd className="font-medium text-text-heading">{APP_VERSION} RC1</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-secondary">{APP_DESCRIPTION}</p>
        </section>

        <section className="ds-section">
          <h2 className="ds-section-title">Active Campaign</h2>
          <p className="ds-section-subtitle">
            {campaignName} · {campaignDuration}
          </p>
          <p className="mt-2 text-sm text-secondary">
            Campaign identity is managed from the Campaign module. User preferences and backend
            configuration are deferred to Version 2.
          </p>
        </section>

        <section className="ds-section">
          <h2 className="ds-section-title">Authentication</h2>
          <p className="ds-section-subtitle">
            This pilot uses mock authentication with demo accounts. Sessions persist when Remember Me
            is enabled. See Help for workflow guidance.
          </p>
        </section>

        <DangerZone />
      </div>
    </PageShell>
  )
}
