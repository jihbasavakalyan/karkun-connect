import { Link } from 'react-router-dom'
import { ActiveCampaignSubtitle } from '@/components/layout/CampaignStatusBar'
import { getActiveCampaigns, getArchivedCampaigns } from '@/services/campaignService'
import { ROUTES } from '@/constants/routes'
import {
  CampaignsListPanel,
  CreateCampaignButton,
} from '@/components/dashboard/CampaignsListPanel'

export function CampaignsPage() {
  const activeCampaigns = getActiveCampaigns()
  const archivedCampaigns = getArchivedCampaigns()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-heading">Campaign</h1>
          <ActiveCampaignSubtitle />
          <p className="mt-2 text-secondary">
            Campaign planning and monitoring for your local Jamaat.
          </p>
        </div>
        <CreateCampaignButton />
      </div>

      <CampaignsListPanel
        activeCampaigns={activeCampaigns}
        archivedCampaigns={archivedCampaigns}
      />

      {activeCampaigns.length > 0 && (
        <p className="text-sm text-secondary">
          Open the{' '}
          <Link to={ROUTES.ADMIN_CAMPAIGN_SETUP} className="font-medium text-primary hover:underline">
            campaign setup wizard
          </Link>{' '}
          to configure campaign details.
        </p>
      )}
    </div>
  )
}
