export type DashboardStat = {
  id: string
  label: string
  value: number
  unit?: string
}

export const adminDashboardStats: DashboardStat[] = [
  { id: 'campaign-progress', label: 'Campaign Progress', value: 68, unit: '%' },
  { id: 'assigned-karkunan', label: 'Assigned Karkunan', value: 142 },
  { id: 'reports-awaiting-review', label: 'Reports Awaiting Review', value: 8 },
  { id: 'pending-jih', label: 'Pending JIH Registrations', value: 5 },
]

export const ruknDashboardStats: DashboardStat[] = [
  { id: 'todays-tasks', label: "Today's Tasks", value: 6 },
  { id: 'my-assigned-karkunan', label: 'My Assigned Karkunan', value: 14 },
  { id: 'visits-pending', label: 'Visits Pending', value: 4 },
  { id: 'reports-pending', label: 'Reports Pending', value: 2 },
]

export const adminTodayMission = {
  title: "Today's Mission",
  summary: 'Review 8 Visit Reports',
  estimatedTime: '25 Minutes',
  actionLabel: 'Start Mission',
  progress: 60,
} as const

export const ruknTodayMission = {
  title: "Today's Mission",
  visitName: 'Mohammad Kareem',
  area: 'ABC Area',
  estimatedTime: '30 Minutes',
  actionLabel: 'Start Mission',
  progress: 60,
} as const
