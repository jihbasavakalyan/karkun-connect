export type KarkunCampaignStatus = 'active' | 'inactive' | 'not_assigned'

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
  /** Optional Father Name (Male) or Husband Name (Female). Blank until enriched. */
  fatherHusbandName?: string
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
  visitStatus: KarkunVisitStatus
  lastVisit: string | null
  commitment: string | null
  currentCommitment: string
  jihAppRegistrationStatus: JihAppRegistrationStatus
  notes: string
  isArchived: boolean
  /** KC-0058 — recovery metadata (optional; additive). */
  createdBy?: string
  archivedAt?: string
  archivedBy?: string
  restoredAt?: string
  restoredBy?: string
  version?: number
  /** KC-0070 — duplicate resolution archive metadata (optional; never hard-deletes). */
  archiveKind?: 'standard' | 'duplicate_merge' | 'admin_delete'
  mergedInto?: string
  mergedBy?: string
  mergedAt?: string
  mergeReason?: string
  originalDocumentId?: string
  /** KC-0076 — administrator registry review (optional; additive). */
  needsReview?: boolean
  reviewReason?: KarkunReviewReason
  reviewNotes?: string
  reviewedBy?: string
  reviewedAt?: string
  /** Set when archiveKind is admin_delete (controlled removal from active registry). */
  deleteReason?: string
}

/** KC-0076 — reasons for Mark for Review. */
export type KarkunReviewReason =
  | 'Unknown Person'
  | 'Duplicate Suspected'
  | 'Incomplete Information'
  | 'Incorrect Details'
  | 'Other'

export const KARKUN_REVIEW_REASON_OPTIONS: readonly KarkunReviewReason[] = [
  'Unknown Person',
  'Duplicate Suspected',
  'Incomplete Information',
  'Incorrect Details',
  'Other',
] as const

/** Registry list lifecycle filter (Admin). */
export type KarkunRegistryLifecycleFilter = '' | 'active' | 'archived' | 'needs_review'

export const REGISTRY_LIFECYCLE_FILTER_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'needs_review', label: 'Needs Review' },
] as const

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
  { value: 'not_assigned', label: 'Not Connected' },
] as const

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
  not_assigned: 'Not Connected',
}

export const JIH_APP_REGISTRATION_OPTIONS: JihAppRegistrationStatus[] = [
  'Not Discussed',
  'Recommended',
  'Registered',
]

export const DEFAULT_JIH_APP_REGISTRATION_STATUS: JihAppRegistrationStatus = 'Not Discussed'
