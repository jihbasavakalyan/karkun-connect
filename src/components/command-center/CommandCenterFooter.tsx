import { APP_VERSION, APP_TAGLINE } from '@/constants/app'
import { getActiveCampaign } from '@/services/campaignService'

export function CommandCenterFooter() {
  const campaign = getActiveCampaign()
  const syncedAt = new Date().toLocaleString()

  return (
    <footer className="rounded-2xl border border-border bg-surface-muted/60 px-6 py-8 text-center">
      {campaign?.motto && (
        <p className="text-lg font-semibold text-text-heading">{campaign.motto}</p>
      )}
      {campaign?.theme && (
        <p className="mx-auto mt-2 max-w-2xl text-sm italic text-secondary">
          &ldquo;{campaign.theme}&rdquo;
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-secondary">
        <span>{APP_TAGLINE}</span>
        <span aria-hidden="true">·</span>
        <span>Version {APP_VERSION} RC1</span>
        <span aria-hidden="true">·</span>
        <span>Last sync {syncedAt}</span>
      </div>
    </footer>
  )
}
