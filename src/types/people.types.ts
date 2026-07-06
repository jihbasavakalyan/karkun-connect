export type PersonGender = 'Male' | 'Female'

export type PersonStatus = 'active' | 'inactive'

export type PersonKind = 'rukn' | 'karkun'

export type PeopleSortField = 'name' | 'mobile' | 'status' | 'createdAt' | 'updatedAt'

export type PeopleSortDirection = 'asc' | 'desc'

export type PeopleFilters = {
  search: string
  gender: PersonGender | ''
  status: PersonStatus | ''
  assignmentStatus: '' | 'Assigned' | 'Unassigned'
  jihPortalRegistration: '' | 'Not Registered' | 'Registered'
  jihPortalReporting: '' | 'Pending' | 'Submitted'
}

export type PeopleAuditAction =
  | 'create'
  | 'update'
  | 'mobile_update'
  | 'status_change'
  | 'assign'
  | 'unassign'
  | 'import'
  | 'annexure1_submit'

export type PeopleAuditEntry = {
  id: string
  personKind: PersonKind
  personId: string
  personName: string
  action: PeopleAuditAction
  field?: string
  previousValue?: string
  newValue?: string
  updatedBy: string
  timestamp: string
}

export type ImportRowError = {
  row: number
  name: string
  mobile: string
  reason: string
}

export type ImportDuplicateRow = {
  row: number
  name: string
  mobile: string
  existingPerson: string
}

export type ImportNameWarning = {
  row: number
  name: string
  similarTo: string
  existingPerson: string
}

export type ImportSummary = {
  totalRows: number
  imported: number
  skipped: number
  duplicateMobiles: ImportDuplicateRow[]
  invalidMobiles: ImportRowError[]
  existingRecords: ImportDuplicateRow[]
  possibleNameDuplicates: ImportNameWarning[]
  otherErrors: ImportRowError[]
}

export type PeopleStatistics = {
  totalRukns: number
  maleRukns: number
  femaleRukns: number
  totalMaleKarkuns: number
  totalFemaleKarkuns: number
  assignedKarkuns: number
  unassignedKarkuns: number
  activeUsers: number
  inactiveUsers: number
}

export type PersonContactInput = {
  name: string
  gender: PersonGender
  mobile: string
  whatsapp?: string
  place: string
  status: PersonStatus
  notes?: string
}

export const DEFAULT_PLACE = 'Basavakalyan'

export const PEOPLE_PAGE_SIZE = 10

export const GENDER_FILTER_OPTIONS = [
  { value: '', label: 'All Genders' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
] as const

export const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const

export const ASSIGNMENT_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'Assigned', label: 'Assigned' },
  { value: 'Unassigned', label: 'Unassigned' },
] as const

export function formatPersonStatus(status: PersonStatus): string {
  return status === 'active' ? 'Active' : 'Inactive'
}
