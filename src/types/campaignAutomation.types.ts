import type { UserRole } from '@/types/auth.types'

export type AutomationPriority = 1 | 2 | 3 | 4 | 5

export type CampaignHeroData = {
  name: string
  theme: string
  objective: string
  duration: string
  dayLabel: string
  currentDay: number | null
  totalDays: number
  daysRemaining: number | null
  daysUntilStart: number | null
  timelineStatus: 'upcoming' | 'active' | 'completed'
  campaignStatus: 'active' | 'archived'
  progress: number
  healthScore: number
  nextMilestone: string
  percentageElapsed: number
}

export type CommandCenterKpi = {
  id: string
  label: string
  value: number
  route: string
}

export type AutomationWorkType =
  | 'overdue-follow-up'
  | 'scheduled-visit'
  | 'first-meeting'
  | 'compliance'
  | 'new-assignment'
  | 'call'
  | 'reminder'

export type ScheduleItem = {
  id: string
  time: string
  title: string
  subtitle?: string
  type: AutomationWorkType | 'follow-up' | 'reminder'
  route: string
  priority: AutomationPriority
  karkunId?: string
}

export type CallQueueItem = {
  id: string
  karkunId: string
  karkunName: string
  mobile: string
  ruknId: string
  assignmentId: string
  label: string
  route: string
}

export type ReminderItem = {
  id: string
  label: string
  reason: string
  route: string
  priority: AutomationPriority
}

export type FollowUpQueueSection = 'overdue' | 'today' | 'tomorrow' | 'thisWeek'

export type FollowUpQueueGroup = {
  section: FollowUpQueueSection
  label: string
  items: {
    followUpId: string
    karkunName: string
    followUpDate: string
    purpose: string
    route: string
  }[]
}

export type AutomationAlert = {
  id: string
  severity: 'high' | 'medium' | 'low'
  title: string
  message: string
  route: string
}

export type NextRecommendedAction = {
  title: string
  description: string
  route: string
  actionLabel: string
  isCaughtUp: boolean
}

export type AdminCommandCenterSnapshot = {
  role: 'administrator'
  hero: CampaignHeroData | null
  kpis: CommandCenterKpi[]
  schedule: ScheduleItem[]
  callQueue: CallQueueItem[]
  reminders: ReminderItem[]
  followUpQueue: FollowUpQueueGroup[]
  alerts: AutomationAlert[]
  nextAction: NextRecommendedAction
}

export type RuknCommandCenterSnapshot = {
  role: 'rukn'
  ruknId: string
  hero: CampaignHeroData | null
  kpis: CommandCenterKpi[]
  schedule: ScheduleItem[]
  callQueue: CallQueueItem[]
  reminders: ReminderItem[]
  followUpQueue: FollowUpQueueGroup[]
  alerts: AutomationAlert[]
  nextAction: NextRecommendedAction
  completedToday: { id: string; label: string; time: string }[]
}

export type CommandCenterSnapshot = AdminCommandCenterSnapshot | RuknCommandCenterSnapshot

export type AutomationContext = {
  role: UserRole
  ruknId?: string
}
