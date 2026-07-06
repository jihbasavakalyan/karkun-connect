export type MissionStatus = 'pending' | 'in_progress' | 'completed'

export type AdminMissionType = 'review-reports' | 'assign-karkunan' | 'approve-jih'

export type RuknMissionType = 'call' | 'visit' | 'submit-report' | 'follow-up'

export type AdminMission = {
  id: string
  type: AdminMissionType
  title: string
  estimatedTime: string
  status: MissionStatus
}

export type RuknMission = {
  id: string
  type: RuknMissionType
  title: string
  estimatedTime: string
  status: MissionStatus
  visitName?: string
  area?: string
}

export const ADMIN_MISSION_QUEUE: AdminMission[] = [
  {
    id: 'admin-m1',
    type: 'review-reports',
    title: 'Review Reports',
    estimatedTime: '25 Minutes',
    status: 'in_progress',
  },
  {
    id: 'admin-m2',
    type: 'assign-karkunan',
    title: 'Assign Karkunan',
    estimatedTime: '15 Minutes',
    status: 'pending',
  },
  {
    id: 'admin-m3',
    type: 'approve-jih',
    title: 'JIH Web Portal Compliance',
    estimatedTime: '20 Minutes',
    status: 'pending',
  },
]

export const RUKN_MISSION_QUEUE: RuknMission[] = [
  {
    id: 'rukn-m1',
    type: 'call',
    title: 'Call',
    estimatedTime: '5 Minutes',
    status: 'completed',
    visitName: 'Mohammad Kareem',
    area: 'ABC Area',
  },
  {
    id: 'rukn-m2',
    type: 'visit',
    title: 'Visit',
    estimatedTime: '30 Minutes',
    status: 'in_progress',
    visitName: 'Mohammad Kareem',
    area: 'ABC Area',
  },
  {
    id: 'rukn-m3',
    type: 'submit-report',
    title: 'Submit Report',
    estimatedTime: '10 Minutes',
    status: 'pending',
    visitName: 'Mohammad Kareem',
    area: 'ABC Area',
  },
  {
    id: 'rukn-m4',
    type: 'follow-up',
    title: 'Follow-up',
    estimatedTime: '15 Minutes',
    status: 'pending',
    visitName: 'Ali Raza',
    area: 'DEF Area',
  },
]

export type ActiveCampaignSummary = {
  name: string
  progress: number
  currentDay: number
  totalDays: number
}

export type NeedsAttentionSummary = {
  pendingVisits: number
  pendingReports: number
  pendingJihRegistrations: number
}

export type CampaignListItem = {
  id: string
  name: string
  status: 'active' | 'archived'
  startDate: string
  endDate: string
  progress?: number
}

export const MOCK_ACTIVE_CAMPAIGN: ActiveCampaignSummary = {
  name: 'کارکن مہم',
  progress: 68,
  currentDay: 12,
  totalDays: 30,
}

export const MOCK_NEEDS_ATTENTION: NeedsAttentionSummary = {
  pendingVisits: 4,
  pendingReports: 8,
  pendingJihRegistrations: 5,
}

export const MOCK_CAMPAIGNS: CampaignListItem[] = [
  {
    id: 'campaign-active',
    name: 'کارکن مہم',
    status: 'active',
    startDate: '2026-03-01',
    endDate: '2026-03-30',
    progress: 68,
  },
  {
    id: 'campaign-archived-1',
    name: 'Spring Outreach 2025',
    status: 'archived',
    startDate: '2025-03-01',
    endDate: '2025-03-31',
    progress: 100,
  },
  {
    id: 'campaign-archived-2',
    name: 'Winter Campaign 2024',
    status: 'archived',
    startDate: '2024-12-01',
    endDate: '2024-12-31',
    progress: 100,
  },
]

export const RUKN_COMPLETED_TODAY = [
  { id: 'work-1', label: 'Call — Mohammad Kareem', time: '9:15 AM' },
  { id: 'work-2', label: 'Daily Progress Report submitted', time: '8:30 AM' },
]
