import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import type { CampaignListItem } from '@/constants/mockMissions'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { MissionProgress } from '@/components/dashboard/MissionProgress'

type CampaignCardProps = {
  campaign: CampaignListItem
}

function CampaignCard({ campaign }: CampaignCardProps) {
  const isActive = campaign.status === 'active'

  return (
    <article
      className={[
        'rounded-(--radius-card) border p-5 shadow-card',
        isActive ? 'border-primary/40 bg-primary-muted/20' : 'border-border bg-surface',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
            {isActive ? 'Active' : 'Archived'}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-text-heading">{campaign.name}</h3>
          <p className="mt-1 text-sm text-secondary">
            {campaign.startDate} — {campaign.endDate}
          </p>
        </div>
        {isActive && (
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-surface">
            Live
          </span>
        )}
      </div>

      {campaign.progress !== undefined && (
        <div className="mt-4">
          <MissionProgress progress={campaign.progress!} label="Progress" variant="inline" />
        </div>
      )}
    </article>
  )
}

type CampaignListProps = {
  title: string
  campaigns: CampaignListItem[]
  emptyMessage?: string
}

function CampaignList({ title, campaigns, emptyMessage }: CampaignListProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-text-heading">{title}</h2>
      {campaigns.length === 0 ? (
        <p className="mt-4 text-sm text-secondary">{emptyMessage ?? 'None available.'}</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <CampaignCard campaign={campaign} />
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
      <CampaignList title="Active Campaign" campaigns={activeCampaigns} />
      <CampaignList
        title="Archived Campaigns"
        campaigns={archivedCampaigns}
        emptyMessage="No archived campaigns."
      />
    </div>
  )
}

export function CreateCampaignButton() {
  return (
    <Link to={ROUTES.ADMIN_CAMPAIGN_SETUP}>
      <PrimaryButton type="button">Create Campaign</PrimaryButton>
    </Link>
  )
}
