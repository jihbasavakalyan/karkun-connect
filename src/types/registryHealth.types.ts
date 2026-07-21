/**
 * KC-0073 — Registry Health report types (read-only monitoring).
 */

import type { IntegrityFinding, IntegrityReport } from '@/types/integrity.types'

export type RegistryHealthTone = 'healthy' | 'warning' | 'critical'

export type RegistryHealthAlertSeverity = 'critical' | 'warning' | 'information'

export type RegistrySummary = {
  totalKarkuns: number
  active: number
  archived: number
  connected: number
  available: number
  assigned: number
  unassigned: number
  male: number
  female: number
  pendingRequests: number
}

export type RegistryCheckResult = {
  id: string
  label: string
  passed: boolean
  count: number
  severity: RegistryHealthAlertSeverity
}

export type RegistryHealthAlert = {
  id: string
  issue: string
  severity: RegistryHealthAlertSeverity
  code: string
  affectedRecords: string[]
  recommendedAction: string
}

export type RegistryHealthScore = {
  score: number
  tone: RegistryHealthTone
  label: string
  errorPenalty: number
  warningPenalty: number
}

export type RegistryScanMeta = {
  lastScanAt: string
  totalChecks: number
  passed: number
  warnings: number
  criticalIssues: number
}

export type RegistryDuplicateChecks = {
  duplicateMobiles: number
  duplicateRegistryIds: number
  duplicateActiveAssignments: number
  duplicateActiveConnections: number
  duplicatePendingRequests: number
}

export type RegistryConsistencyChecks = {
  connectedEqualsActiveConnections: boolean
  connectedCount: number
  activeConnectionCount: number
  assignedEqualsActiveAssignments: boolean
  assignedCount: number
  activeAssignmentCount: number
  archivedExcludedFromActive: boolean
  mergedDuplicatesRemainArchived: boolean
  orphanMergedIntoRefs: number
}

export type RegistryDataQualityCounts = {
  missingMobile: number
  missingName: number
  missingGender: number
  missingArea: number
  missingStatus: number
  invalidMobileFormat: number
  unknownGender: number
  unknownStatus: number
}

export type RegistryHealthReport = {
  generatedAt: string
  readOnly: true
  summary: RegistrySummary
  score: RegistryHealthScore
  scan: RegistryScanMeta
  integrityChecks: RegistryCheckResult[]
  duplicateChecks: RegistryDuplicateChecks
  dataQuality: RegistryDataQualityCounts
  consistency: RegistryConsistencyChecks
  integrityFindings: IntegrityFinding[]
  dataQualityFindings: IntegrityFinding[]
  alerts: RegistryHealthAlert[]
  /** Underlying integrity scan (unchanged KC-0058/0068 engine). */
  integrity: IntegrityReport
}
