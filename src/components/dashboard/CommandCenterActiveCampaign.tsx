import { MOCK_CAMPAIGNS } from '@/constants/mockMissions'
import { MissionProgress } from '@/components/dashboard/MissionProgress'

export function CommandCenterActiveCampaign() {
  const campaign = MOCK_CAMPAIGNS.find((item) => item.status === 'active')

  if (!campaign) {
    return (
      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Active Campaign</h2>
        <p className="mt-4 text-sm text-secondary">No active campaign.</p>
      </section>
    )
  }

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Active Campaign</h2>

      <p className="mt-3 text-xl font-semibold text-text-heading">{campaign.name}</p>

      <p className="mt-2 text-sm text-secondary">
        Duration{' '}
        <span className="font-medium text-text-heading">
          {campaign.startDate} — {campaign.endDate}
        </span>
      </p>

      <MissionProgress
        progress={campaign.progress ?? 0}
        label="Progress"
        variant="inline"
      />
    </section>
  )
}
