export type KarkunCampaignStatus = 'active' | 'inactive' | 'not_assigned'

export type JihRegistrationStatus = 'approved' | 'pending' | 'not_started' | 'rejected'

export type KarkunVisitStatus = 'scheduled' | 'completed' | 'pending' | 'overdue' | 'none'

export type JihAppRegistrationStatus = 'Not Discussed' | 'Recommended' | 'Registered'

export type KarkunAssignmentPoolStatus = 'Available' | 'Assigned'

export type PersonGender = 'Male' | 'Female'

export type PersonStatus = 'active' | 'inactive'

export type KarkunRegistryRecord = {
  id: string
  name: string
  gender: PersonGender
  mobile: string
  whatsapp?: string
  place: string
  status: PersonStatus
  createdAt: string
  updatedAt: string
  updatedBy: string
  address: string
  area: string
  assignedRukn: string
  assignedRuknId: string
  assignmentStatus: KarkunAssignmentPoolStatus
  assignmentDate?: string
  campaignStatus: KarkunCampaignStatus
  jihRegistration: JihRegistrationStatus
  visitStatus: KarkunVisitStatus
  lastVisit: string | null
  commitment: string | null
  currentCommitment: string
  jihAppRegistrationStatus: JihAppRegistrationStatus
  notes: string
  isArchived: boolean
}

export type KarkunRegistryFilters = {
  campaignStatus: string
  assignedRukn: string
  area: string
  gender: string
  status: string
  assignmentStatus: string
}

export const KARKUN_REGISTRY_PAGE_SIZE = 5

export const CAMPAIGN_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'not_assigned', label: 'Not Assigned' },
] as const

export const JIH_STATUS_LABELS: Record<JihRegistrationStatus, string> = {
  approved: 'Approved',
  pending: 'Pending Review',
  not_started: 'Not Started',
  rejected: 'Rejected',
}

export const VISIT_STATUS_LABELS: Record<KarkunVisitStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  pending: 'Pending',
  overdue: 'Overdue',
  none: 'None',
}

export const CAMPAIGN_STATUS_LABELS: Record<KarkunCampaignStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  not_assigned: 'Not Assigned',
}

export const JIH_APP_REGISTRATION_OPTIONS: JihAppRegistrationStatus[] = [
  'Not Discussed',
  'Recommended',
  'Registered',
]

export const DEFAULT_JIH_APP_REGISTRATION_STATUS: JihAppRegistrationStatus = 'Not Discussed'
