import { ROUTES, adminExecutionPath } from '@/constants/routes'

export type CommandCenterWorkItem = {
  id: string
  label: string
  count: number
  to: string
}

export type CommandCenterActivityItem = {
  id: string
  type: 'meeting' | 'report' | 'karkun'
  title: string
  subtitle: string
  timestamp: string
  to?: string
}

export const COMMAND_CENTER_TODAYS_WORK: CommandCenterWorkItem[] = [
  {
    id: 'pending-meetings',
    label: 'Pending Meetings',
    count: 4,
    to: adminExecutionPath('pending'),
  },
  {
    id: 'pending-reports',
    label: 'Pending Reports',
    count: 8,
    to: adminExecutionPath('reports'),
  },
  {
    id: 'pending-follow-ups',
    label: 'Pending Follow-ups',
    count: 5,
    to: `${ROUTES.ADMIN_FOLLOW_UP}?section=follow-ups`,
  },
]

export const COMMAND_CENTER_RECENT_ACTIVITY: CommandCenterActivityItem[] = []

export type MockFollowUpTask = {
  id: string
  karkunName: string
  dueDate: string
  note: string
  status: 'pending' | 'overdue'
}

export const MOCK_FOLLOW_UP_TASKS: MockFollowUpTask[] = []

export const MOCK_RESPONSIBILITIES = [
  { id: 'resp-1', title: 'Weekly area coordination call', assignee: 'Amir Khan', dueDate: '2026-03-16' },
  { id: 'resp-2', title: 'JIH registration review batch', assignee: 'Ruqia Tahaniyat', dueDate: '2026-03-18' },
  { id: 'resp-3', title: 'Campaign progress summary', assignee: 'Mohd Minhajuddin', dueDate: '2026-03-20' },
]

export const MOCK_TRAINING_ITEMS = [
  { id: 'train-1', title: 'Annexure-1 field visit training', status: 'Completed', date: '2026-03-01' },
  { id: 'train-2', title: 'Daily Progress Report workflow', status: 'Scheduled', date: '2026-03-20' },
  { id: 'train-3', title: 'Follow-up best practices', status: 'Pending', date: '2026-03-25' },
]

export const MOCK_IMPROVEMENT_TASKS = [
  { id: 'imp-1', title: 'Reduce average visit completion time', priority: 'High' },
  { id: 'imp-2', title: 'Improve mobile number collection rate', priority: 'Medium' },
  { id: 'imp-3', title: 'Standardize meeting notes format', priority: 'Low' },
]

export const MOCK_DAILY_PROGRESS_TIMELINE = [
  { id: 'dpr-1', date: '2026-03-12', summary: '8 visits completed, 6 reports submitted, 2 follow-ups scheduled' },
  { id: 'dpr-2', date: '2026-03-11', summary: '5 visits completed, 5 reports submitted, campaign day 11 closed' },
  { id: 'dpr-3', date: '2026-03-10', summary: '7 visits completed, 4 pending reports carried forward' },
]

export const MOCK_CAMPAIGN_HEALTH = {
  overallScore: 72,
  visitCompletionRate: 68,
  reportSubmissionRate: 74,
  followUpCompletionRate: 61,
}

export const MOCK_PERFORMANCE_METRICS = [
  { id: 'perf-1', label: 'Meetings This Week', value: 24, trend: '+12%' },
  { id: 'perf-2', label: 'Reports Submitted', value: 18, trend: '+8%' },
  { id: 'perf-3', label: 'Active Rukn', value: 49, trend: '—' },
  { id: 'perf-4', label: 'Assigned Karkun', value: 11, trend: '+2' },
]
