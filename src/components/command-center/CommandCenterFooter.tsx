import { APP_VERSION, APP_TAGLINE } from '@/constants/app'
import { getActiveCampaign } from '@/services/campaignService'

export function CommandCenterFooter() {
  const campaign = getActiveCampaign()
  const syncedAt = new Date().toLocaleString()

  return (
    <footer className="rounded-lg border border-border bg-surface-muted/60 px-4 py-3 text-center">
      {campaign?.motto && (
        <p className="text-xs font-semibold text-text-heading">{campaign.motto}</p>
      )}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[10px] text-secondary">
        <span>{APP_TAGLINE}</span>
        <span aria-hidden="true">·</span>
        <span>v{APP_VERSION} RC1</span>
        <span aria-hidden="true">·</span>
        <span>Sync {syncedAt}</span>
      </div>
    </footer>
  )
}
