import { MissionProgress } from '@/components/dashboard/MissionProgress'
import type { ActiveCampaignSummary } from '@/constants/mockMissions'

type ActiveCampaignPanelProps = {
  campaign: ActiveCampaignSummary
}

export function ActiveCampaignPanel({ campaign }: ActiveCampaignPanelProps) {
  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Active Campaign</h2>

      <p className="mt-3 text-xl font-semibold text-text-heading">{campaign.name}</p>

      <MissionProgress
        progress={campaign.progress}
        label="Campaign Progress"
        variant="inline"
      />

      <p className="mt-4 text-sm text-secondary">
        Current Day{' '}
        <span className="font-semibold text-text-heading">
          {campaign.currentDay} of {campaign.totalDays}
        </span>
      </p>
    </section>
  )
}
