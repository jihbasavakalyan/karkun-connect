import {
  CommandCenterActiveCampaign,
  CommandCenterAssignmentMetrics,
  CommandCenterBaitulMaalMetrics,
  CommandCenterIjtemaAttendanceMetrics,
  CommandCenterJihWebPortalMetrics,
  CommandCenterPeopleStats,
  CommandCenterQuickActions,
  CommandCenterTodaysWork,
  RecentActivityPanel,
} from '@/components/dashboard'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'

export function AdminHomePage() {
  useAssignmentEngine()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <CommandCenterActiveCampaign />
      <CommandCenterPeopleStats />
      <CommandCenterJihWebPortalMetrics />
      <CommandCenterBaitulMaalMetrics />
      <CommandCenterIjtemaAttendanceMetrics />
      <CommandCenterAssignmentMetrics />
      <CommandCenterTodaysWork />

      <div className="grid gap-6 lg:grid-cols-2">
        <CommandCenterQuickActions />
        <RecentActivityPanel />
      </div>
    </div>
  )
}
