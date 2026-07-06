import {
  CommandCenterActiveCampaign,
  CommandCenterQuickActions,
  CommandCenterTodaysWork,
  RecentActivityPanel,
} from '@/components/dashboard'

export function AdminHomePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Campaign Command Center</h1>
        <p className="mt-2 text-secondary">What needs your attention today?</p>
      </div>

      <CommandCenterActiveCampaign />
      <CommandCenterTodaysWork />

      <div className="grid gap-6 lg:grid-cols-2">
        <CommandCenterQuickActions />
        <RecentActivityPanel />
      </div>
    </div>
  )
}
