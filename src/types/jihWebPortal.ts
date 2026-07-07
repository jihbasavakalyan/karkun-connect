export type JihWebPortalRegistrationStatus = 'Not Registered' | 'Registered'

export type JihMonthlyReportingStatus = 'Pending' | 'Submitted'

export type JihWebPortalRegistration = {
  karkunId: string
  status: JihWebPortalRegistrationStatus
  registrationNumber?: string
  registrationDate?: string
  remarks?: string
  updatedAt: string
  updatedBy: string
}

export type JihMonthlyReport = {
  karkunId: string
  monthKey: string
  status: JihMonthlyReportingStatus
  submissionDate?: string
  remarks?: string
  updatedAt: string
  updatedBy: string
}

export type JihWebPortalDashboardMetrics = {
  registered: number
  notRegistered: number
  pendingReports: number
  submittedReports: number
}

export type JihWebPortalKarkunSummary = {
  karkunId: string
  karkunName: string
  registration: JihWebPortalRegistration
  currentMonth: string
  monthlyStatus: JihMonthlyReportingStatus
  submissionDate?: string
  monthlyRemarks?: string
}

export type UpdateJihRegistrationInput = {
  karkunId: string
  status: JihWebPortalRegistrationStatus
  registrationNumber?: string
  registrationDate?: string
  remarks?: string
  updatedBy?: string
}

export type UpdateJihMonthlyReportInput = {
  karkunId: string
  monthKey?: string
  status: JihMonthlyReportingStatus
  submissionDate?: string
  remarks?: string
  updatedBy?: string
}

export type BulkUpdateJihRegistrationInput = {
  karkunIds: string[]
  status: JihWebPortalRegistrationStatus
  registrationDate?: string
  updatedBy?: string
}

export type BulkUpdateJihMonthlyReportInput = {
  karkunIds: string[]
  status: JihMonthlyReportingStatus
  submissionDate?: string
  updatedBy?: string
}

export const JIH_PORTAL_REGISTRATION_FILTER_OPTIONS = [
  { value: '', label: 'All Registration' },
  { value: 'Registered', label: 'Registered' },
  { value: 'Not Registered', label: 'Not Registered' },
] as const

export const JIH_PORTAL_REPORTING_FILTER_OPTIONS = [
  { value: '', label: 'All Reporting' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Submitted', label: 'Submitted' },
] as const
