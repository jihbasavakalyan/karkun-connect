import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE, APP_VERSION } from '@/constants/app'
import { getActiveCampaignName, formatActiveCampaignDuration } from '@/services/campaignService'

export function SettingsPage() {
  const campaignName = getActiveCampaignName()
  const campaignDuration = formatActiveCampaignDuration()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Settings</h1>
        <p className="mt-2 text-secondary">Pilot configuration and application information.</p>
      </div>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Application</h2>
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

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Active Campaign</h2>
        <p className="mt-2 text-sm text-secondary">
          {campaignName} · {campaignDuration}
        </p>
        <p className="mt-2 text-sm text-secondary">
          Campaign identity is managed from the Campaign module. User preferences and backend
          configuration are deferred to Version 2.
        </p>
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Authentication</h2>
        <p className="mt-2 text-sm text-secondary">
          This pilot uses mock authentication with demo accounts. Sessions persist when Remember Me
          is enabled. See Help for workflow guidance.
        </p>
      </section>
    </div>
  )
}
