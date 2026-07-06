import {
  CommandCenterActiveCampaign,
  CommandCenterAssignmentMetrics,
  CommandCenterQuickActions,
  CommandCenterTodaysWork,
  RecentActivityPanel,
} from '@/components/dashboard'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'

export function AdminHomePage() {
  useAssignmentEngine()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Campaign Command Center</h1>
        <p className="mt-2 text-secondary">What needs your attention today?</p>
      </div>

      <CommandCenterActiveCampaign />
      <CommandCenterAssignmentMetrics />
      <CommandCenterTodaysWork />

      <div className="grid gap-6 lg:grid-cols-2">
        <CommandCenterQuickActions />
        <RecentActivityPanel />
      </div>
    </div>
  )
}
