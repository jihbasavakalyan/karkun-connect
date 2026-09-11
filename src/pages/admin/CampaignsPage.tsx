import { Link } from 'react-router-dom'
import { ActiveCampaignSubtitle } from '@/components/layout/CampaignStatusBar'
import {
  getActiveCampaigns,
  getArchivedCampaigns,
  getCampaignLibrary,
} from '@/services/campaignService'
import { ROUTES } from '@/constants/routes'
import {
  CampaignLibraryWorkStrip,
  CampaignsListPanel,
  CreateCampaignButton,
} from '@/components/dashboard/CampaignsListPanel'
import { GenerateCampaignReportButton } from '@/components/reporting/GenerateCampaignReportButton'
import { CardSkeleton, PageHeader, PageShell } from '@/components/ui'
import { useRepositoryHydrationStatus } from '@/hooks/useRepositoryHydration'

export function CampaignsPage() {
  const hydration = useRepositoryHydrationStatus()
  const activeCampaigns = getActiveCampaigns()
  const archivedCampaigns = getArchivedCampaigns()
  const libraryCount = getCampaignLibrary().length

  if (!hydration.ready && !hydration.failed) {
    return (
      <PageShell variant="narrow" className="app-screen">
        <PageHeader title="مہمات" description="Campaign library" />
        <CardSkeleton count={3} />
      </PageShell>
    )
  }

  return (
    <PageShell variant="narrow" className="app-screen">
      <PageHeader
        title="مہمات"
        description="منتخب اہداف اور سرگرمیوں کا فوکسڈ ٹریکنگ اور عمل۔ مہم سرگرمیوں کی مالک نہیں اور نقل نہیں بناتی۔"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <GenerateCampaignReportButton size="sm" />
            <CreateCampaignButton />
          </div>
        }
      />
      <ActiveCampaignSubtitle />

      {hydration.failed ? (
        <p className="mb-4 rounded-lg border border-border bg-surface p-4 text-sm text-amber-800" role="alert">
          Campaign library could not finish loading. Showing available local data where present.
          Retry by refreshing the page.
        </p>
      ) : null}

      <div className="mb-6">
        <CampaignLibraryWorkStrip />
      </div>

      {libraryCount === 0 && !hydration.failed ? (
        <p className="mb-6 rounded-lg border border-border bg-surface p-4 text-sm text-secondary">
          No campaigns in the library yet. This is not the same as zero campaign metrics.
        </p>
      ) : null}

      <CampaignsListPanel
        activeCampaigns={activeCampaigns}
        archivedCampaigns={archivedCampaigns}
      />

      <p className="mt-6 text-sm text-secondary">
        Campaign setup opens a preparatory wizard. Launch confirms a local preview only — it does
        not create or update a durable campaign document. The live library above remains the
        authoritative list.{' '}
        <Link to={ROUTES.ADMIN_CAMPAIGN_SETUP} className="font-medium text-primary hover:underline">
          Open campaign setup
        </Link>
      </p>
    </PageShell>
  )
}
