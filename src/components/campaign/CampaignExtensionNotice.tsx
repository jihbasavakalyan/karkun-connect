/**
 * KC-038A — Single official campaign extension announcement (presentation only).
 */
import {
  CAMPAIGN_EXTENSION_ANNOUNCEMENT_UR,
  CAMPAIGN_EXTENSION_ANNOUNCEMENT_TITLE_UR,
  isCampaignEndExtended,
} from '@/constants/campaignIdentity'
import { getActiveCampaign } from '@/services/campaignService'

export function CampaignExtensionNotice() {
  const campaign = getActiveCampaign()
  if (!campaign || !isCampaignEndExtended(campaign.endDate)) {
    return null
  }

  return (
    <aside
      className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary"
      dir="rtl"
      lang="ur"
      role="status"
      aria-label={CAMPAIGN_EXTENSION_ANNOUNCEMENT_TITLE_UR}
    >
      <p className="font-semibold text-primary">{CAMPAIGN_EXTENSION_ANNOUNCEMENT_TITLE_UR}</p>
      <p className="mt-1.5 leading-relaxed text-secondary">{CAMPAIGN_EXTENSION_ANNOUNCEMENT_UR}</p>
    </aside>
  )
}
