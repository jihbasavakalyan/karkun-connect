import {
  MOCK_ACTIVE_CAMPAIGN,
  MOCK_NEEDS_ATTENTION,
} from '@/constants/mockMissions'
import { getAdminDashboardStats } from '@/constants/mockDashboard'
import {
  generateAdminMissionQueue,
  getCurrentMission,
  getMissionProgress,
} from '@/lib/mockMissionEngine'
import { ActiveCampaignPanel } from '@/components/dashboard/ActiveCampaignPanel'
import { MissionHeroCard } from '@/components/dashboard/MissionHeroCard'
import { MissionProgress } from '@/components/dashboard/MissionProgress'
import { NeedsAttentionPanel } from '@/components/dashboard/NeedsAttentionPanel'
import { QuickActionsPanel } from '@/components/dashboard/QuickActionsPanel'
import { StatCard } from '@/components/dashboard/StatCard'

export function AdminHomePage() {
  const missions = generateAdminMissionQueue()
  const currentMission = getCurrentMission(missions)
  const progress = getMissionProgress(missions)
  const dashboardStats = getAdminDashboardStats()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Home</h1>
        <p className="mt-2 text-secondary">Your mission queue and campaign overview.</p>
      </div>

      <section className="space-y-4">
        <MissionHeroCard
          missionTitle={currentMission?.title ?? 'No missions today'}
          estimatedTime={currentMission?.estimatedTime ?? '—'}
        />
        <MissionProgress progress={progress} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ActiveCampaignPanel campaign={MOCK_ACTIVE_CAMPAIGN} />
        <NeedsAttentionPanel items={MOCK_NEEDS_ATTENTION} />
      </div>

      <QuickActionsPanel />
    </div>
  )
}
