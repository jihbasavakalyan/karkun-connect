/**
 * KC-038 — Informational campaign extension notice (presentation only).
 */
import {
  CAMPAIGN_EXTENSION_ANNOUNCEMENT_UR,
  CAMPAIGN_PHASE_LABELS,
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
      className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary"
      dir="rtl"
      lang="ur"
      role="status"
      aria-label="Campaign extension announcement"
    >
      <p className="font-semibold text-primary">
        {CAMPAIGN_PHASE_LABELS.firstPhaseComplete} · {CAMPAIGN_PHASE_LABELS.secondPhaseInProgress}
      </p>
      <p className="mt-1 text-secondary">{CAMPAIGN_EXTENSION_ANNOUNCEMENT_UR}</p>
      <p className="mt-1 text-xs text-secondary" dir="ltr" lang="en">
        {CAMPAIGN_PHASE_LABELS.extendedCampaignEn} · {CAMPAIGN_PHASE_LABELS.campaignContinuesEn}
      </p>
    </aside>
  )
}
