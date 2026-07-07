import { APP_VERSION, APP_TAGLINE } from '@/constants/app'
import { getActiveCampaign } from '@/services/campaignService'

export function CommandCenterFooter() {
  const campaign = getActiveCampaign()
  const syncedAt = new Date().toLocaleString()

  return (
    <footer className="rounded-xl border border-border bg-surface-muted/60 px-4 py-4 text-center">
      {campaign?.motto && (
        <p className="text-sm font-semibold text-text-heading">{campaign.motto}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-secondary">
        <span>{APP_TAGLINE}</span>
        <span aria-hidden="true">·</span>
        <span>Version {APP_VERSION} RC1</span>
        <span aria-hidden="true">·</span>
        <span>Last sync {syncedAt}</span>
      </div>
    </footer>
  )
}
