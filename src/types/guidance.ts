import type { IconName } from '@/design-system/iconNames'

/** Journey stages — order matters for progression. */
export type JourneyStageId =
  | 'connected'
  | 'first-meeting'
  | 'jih-registration'
  | 'orientation'
  | 'participation'
  | 'regular-contact'
  | 'development'

export const JOURNEY_STAGE_ORDER: JourneyStageId[] = [
  'connected',
  'first-meeting',
  'jih-registration',
  'orientation',
  'participation',
  'regular-contact',
  'development',
]

export const JOURNEY_STAGE_LABELS: Record<JourneyStageId, string> = {
  connected: 'Connected',
  'first-meeting': 'First Meeting',
  'jih-registration': 'JIH Registration',
  orientation: 'Orientation',
  participation: 'Participation',
  'regular-contact': 'Regular Contact',
  development: 'Tarbiyah & Development',
}

export type NextActionKind =
  | 'call-today'
  | 'visit-this-week'
  | 'help-jih-registration'
  | 'invite-ijtema'
  | 'arrange-meeting'
  | 'reconnect'
  | 'complete-visit-notes'
  | 'honor-commitment'
  | 'connect-karkun'

export type KarkunNextAction = {
  kind: NextActionKind
  label: string
  description: string
  route: string
  dueHint?: string
}

export type CommitmentStatus = 'pending' | 'completed' | 'cancelled'

export type Commitment = {
  id: string
  karkunId: string
  ruknId: string
  assignmentId?: string
  text: string
  targetDate: string
  reminderEnabled: boolean
  status: CommitmentStatus
  createdAt: string
  completedAt?: string
  createdBy: string
  source: 'visit' | 'manual' | 'follow-up'
}

export type ReminderType = 'visit' | 'call' | 'meeting' | 'registration' | 'general'

export type GuidanceReminder = {
  id: string
  karkunId: string
  karkunName: string
  type: ReminderType
  title: string
  message: string
  route: string
  priority: 1 | 2 | 3
}

export type RelationshipHealthLevel = 'healthy' | 'needs-attention' | 'urgent' | 'dormant'

export type RelationshipHealth = {
  level: RelationshipHealthLevel
  label: string
  icon: IconName
  reasons: string[]
}

export type JourneyTimelineEvent = {
  id: string
  karkunId: string
  stageId?: JourneyStageId
  title: string
  description?: string
  occurredAt: string
  source: 'system' | 'commitment' | 'visit' | 'manual'
}

export type SmartSuggestionKind =
  | 'home-visit'
  | 'phone-call'
  | 'registration-camp'
  | 'invite-programme'
  | 'literature'
  | 'family-meeting'

export type SmartSuggestion = {
  kind: SmartSuggestionKind
  label: string
  description: string
  route: string
}

export type KarkunGuidance = {
  karkunId: string
  karkunName: string
  assignmentId?: string
  currentStage: JourneyStageId
  stageLabel: string
  stagesCompleted: JourneyStageId[]
  nextAction: KarkunNextAction
  health: RelationshipHealth
  pendingCommitments: Commitment[]
  upcomingCommitment?: Commitment
  reminders: GuidanceReminder[]
  timeline: JourneyTimelineEvent[]
  suggestions: SmartSuggestion[]
}

export type MorningBrief = {
  greeting: string
  mission: string
  dailyGoal: string
  nextActions: (KarkunNextAction & { karkunId: string; karkunName: string })[]
  upcomingCommitments: Commitment[]
  recommendedCalls: GuidanceReminder[]
  recommendedVisits: GuidanceReminder[]
  recentProgress: JourneyTimelineEvent[]
}

export type AdminCoachingInsight = {
  id: string
  title: string
  description: string
  count: number
  route: string
  tone: 'support' | 'opportunity'
}

export type AdminCoachingSnapshot = {
  insights: AdminCoachingInsight[]
  ruknsNeedingSupport: { ruknId: string; ruknName: string; reason: string; route: string }[]
}
