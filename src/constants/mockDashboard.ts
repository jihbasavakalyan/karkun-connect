import { getPeopleStatistics } from '@/lib/peopleStore'
import { getJihWebPortalDashboardMetrics } from '@/services/jihWebPortalService'

export type DashboardStat = {
  id: string
  label: string
  value: number
  unit?: string
}

export function getAdminDashboardStats(): DashboardStat[] {
  const stats = getPeopleStatistics()
  const jihMetrics = getJihWebPortalDashboardMetrics()

  return [
    { id: 'total-rukn', label: 'Total Rukn', value: stats.totalRukns },
    { id: 'assigned-karkunan', label: 'Assigned Karkunan', value: stats.assignedKarkuns },
    { id: 'unassigned-karkunan', label: 'Unassigned Karkunan', value: stats.unassignedKarkuns },
    { id: 'pending-jih', label: 'Not Registered (JIH Web Portal)', value: jihMetrics.notRegistered },
  ]
}

export const adminDashboardStats: DashboardStat[] = getAdminDashboardStats()

export const ruknDashboardStats: DashboardStat[] = [
  { id: 'my-assigned-karkunan', label: 'My Assigned Karkunan', value: 0 },
  { id: 'visits-pending', label: 'Visits Pending', value: 0 },
  { id: 'reports-pending', label: 'Reports Pending', value: 0 },
]

export const adminTodayMission = {
  title: "Today's Mission",
  summary: 'Review pending visit reports',
  estimatedTime: '25 Minutes',
  actionLabel: 'Start Mission',
  progress: 0,
} as const

export const ruknTodayMission = {
  title: "Today's Mission",
  visitName: 'No visit scheduled',
  area: 'Basavakalyan',
  estimatedTime: '30 Minutes',
  actionLabel: 'Start Mission',
  progress: 0,
} as const
