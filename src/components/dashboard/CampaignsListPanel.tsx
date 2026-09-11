import { Link } from 'react-router-dom'
import type { CampaignListItem } from '@/constants/mockMissions'
import {
  adminCompliancePath,
  adminExecutionPath,
  adminFollowUpPath,
  ROUTES,
} from '@/constants/routes'
import {
  formatCampaignDate,
  getCampaignPeriodStatus,
  getCampaignProgress,
} from '@/services/campaignService'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { MissionProgress } from '@/components/dashboard/MissionProgress'
import { URDU_REPORT } from '@/lib/reporting/campaignReportUrdu'

const OPS_LINK_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-text-heading hover:border-primary/30 hover:bg-surface-muted'

type CampaignCardProps = {
  campaign: CampaignListItem
  showProgress: boolean
}

function campaignStatusLabel(campaign: CampaignListItem): string {
  const periodStatus = getCampaignPeriodStatus(campaign)
  if (periodStatus === 'completed') return 'Completed'
  if (periodStatus === 'upcoming') return 'Upcoming'
  if (campaign.status === 'archived') return 'Archived'
  return 'Active'
}

function CampaignOperationalLinks({ emphasize }: { emphasize: boolean }) {
  return (
    <nav
      className="mt-4 flex flex-wrap gap-2"
      aria-label={emphasize ? 'Campaign work' : 'Campaign operational links'}
    >
      <Link to={adminFollowUpPath()} className={OPS_LINK_CLASS}>
        Follow-up
      </Link>
      <Link to={adminExecutionPath()} className={OPS_LINK_CLASS}>
        Campaign Execution
      </Link>
      <Link to={adminCompliancePath()} className={OPS_LINK_CLASS}>
        Review
      </Link>
      <Link to={ROUTES.ADMIN_REPORTS} className={OPS_LINK_CLASS}>
        Reports
      </Link>
    </nav>
  )
}

function CampaignCard({ campaign, showProgress }: CampaignCardProps) {
  const periodStatus = getCampaignPeriodStatus(campaign)
  const isLive = campaign.status === 'active' && periodStatus === 'active'
  const statusLabel = campaignStatusLabel(campaign)
  const periodCompletedWhileLibraryActive =
    campaign.status === 'active' && periodStatus === 'completed'

  return (
    <article
      className={[
        'rounded-xl border p-4 sm:p-5',
        isLive ? 'border-primary/35 bg-surface' : 'border-border bg-surface',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
            {statusLabel}
            {isLive ? ' · Live' : ''}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-text-heading">{campaign.name}</h3>
          <p className="mt-1 text-sm text-secondary">
            {formatCampaignDate(campaign.startDate)} — {formatCampaignDate(campaign.endDate)}
          </p>
          {periodCompletedWhileLibraryActive ? (
            <p className="mt-2 text-xs text-secondary">
              Period completed. Library status remains active until an Administrator archives the
              campaign document.
            </p>
          ) : null}
          {campaign.theme ? (
            <p className="mt-2 text-sm text-secondary">{campaign.theme}</p>
          ) : null}
        </div>
      </div>

      {showProgress && isLive ? (
        <div className="mt-4">
          <MissionProgress progress={getCampaignProgress()} label="Progress" variant="inline" />
        </div>
      ) : null}

      <CampaignOperationalLinks emphasize={isLive} />
    </article>
  )
}

type CampaignListProps = {
  title: string
  description?: string
  campaigns: CampaignListItem[]
  emptyMessage: string
  showProgress: boolean
}

function CampaignList({
  title,
  description,
  campaigns,
  emptyMessage,
  showProgress,
}: CampaignListProps) {
  return (
    <section className="app-screen-block">
      <h2 className="app-screen-block-title">{title}</h2>
      {description ? <p className="mt-1 text-sm text-secondary">{description}</p> : null}
      {campaigns.length === 0 ? (
        <p className="mt-4 rounded-lg border border-border bg-surface p-4 text-sm text-secondary">
          {emptyMessage}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <CampaignCard campaign={campaign} showProgress={showProgress} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

type CampaignsListPanelProps = {
  activeCampaigns: CampaignListItem[]
  archivedCampaigns: CampaignListItem[]
}

export function CampaignsListPanel({
  activeCampaigns,
  archivedCampaigns,
}: CampaignsListPanelProps) {
  return (
    <div className="space-y-8">
      <CampaignList
        title="Current / Active"
        description="Campaigns whose library status is active and whose date period is currently open."
        campaigns={activeCampaigns}
        emptyMessage="No current campaign. Previous campaigns remain available below. Operational modules stay reachable from Reports and Activities."
        showProgress
      />
      <CampaignList
        title="Previous / Archived"
        description="Archived library campaigns, and active-library campaigns whose date period has completed."
        campaigns={archivedCampaigns}
        emptyMessage="No previous or archived campaigns."
        showProgress={false}
      />
    </div>
  )
}

/** Opens the existing setup wizard. Does not create a durable campaign document. */
export function CreateCampaignButton() {
  return (
    <Link to={ROUTES.ADMIN_CAMPAIGN_SETUP}>
      <PrimaryButton type="button">Campaign setup</PrimaryButton>
    </Link>
  )
}

export function CampaignLibraryWorkStrip() {
  return (
    <section
      className="rounded-xl border border-border bg-surface p-4"
      aria-labelledby="campaign-work-title"
    >
      <h2 id="campaign-work-title" className="text-sm font-semibold text-text-heading">
        Campaign work
      </h2>
      <p className="mt-1 text-sm text-secondary">
        Follow-up, Campaign Execution, Review, and Reports use the existing operational modules —
        not a separate campaign detail system.
      </p>
      <nav className="mt-3 flex flex-wrap gap-2" aria-label="Campaign operational destinations">
        <Link to={adminFollowUpPath()} className={OPS_LINK_CLASS}>
          Follow-up
        </Link>
        <Link to={adminExecutionPath()} className={OPS_LINK_CLASS}>
          Campaign Execution
        </Link>
        <Link to={adminCompliancePath()} className={OPS_LINK_CLASS}>
          Review
        </Link>
        <Link to={ROUTES.ADMIN_REPORTS} className={OPS_LINK_CLASS}>
          Reports · {URDU_REPORT.button}
        </Link>
      </nav>
    </section>
  )
}
