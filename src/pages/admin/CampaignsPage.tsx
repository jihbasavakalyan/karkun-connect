import { Link } from 'react-router-dom'
import { ActiveCampaignSubtitle } from '@/components/layout/CampaignStatusBar'
import { getActiveCampaigns, getArchivedCampaigns } from '@/services/campaignService'
import { ROUTES } from '@/constants/routes'
import {
  CampaignsListPanel,
  CreateCampaignButton,
} from '@/components/dashboard/CampaignsListPanel'
import { PageHeader, PageShell } from '@/components/ui'

export function CampaignsPage() {
  const activeCampaigns = getActiveCampaigns()
  const archivedCampaigns = getArchivedCampaigns()

  return (
    <PageShell variant="narrow">
      <PageHeader
        title="Campaign"
        description="Campaign planning and monitoring for your local Jamaat."
        actions={<CreateCampaignButton />}
      />
      <ActiveCampaignSubtitle />

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
    </PageShell>
  )
}
