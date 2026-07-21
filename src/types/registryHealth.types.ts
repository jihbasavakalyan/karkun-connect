/**
 * KC-0073 — Registry Health report types (read-only monitoring).
 */

import type { IntegrityFinding, IntegrityReport } from '@/types/integrity.types'

export type RegistryHealthTone = 'healthy' | 'warning' | 'critical'

export type RegistrySummary = {
  totalKarkuns: number
  active: number
  archived: number
  connected: number
  available: number
  assigned: number
  unassigned: number
}

export type RegistryHealthAlert = {
  id: string
  issue: string
  severity: 'error' | 'warning'
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

export type RegistryHealthReport = {
  generatedAt: string
  readOnly: true
  summary: RegistrySummary
  score: RegistryHealthScore
  duplicateChecks: {
    duplicateMobiles: number
    duplicateRegistryIds: number
    duplicateActiveConnections: number
    duplicateAssignments: number
  }
  integrityFindings: IntegrityFinding[]
  dataQualityFindings: IntegrityFinding[]
  alerts: RegistryHealthAlert[]
  /** Underlying integrity scan (unchanged KC-0058/0068 engine). */
  integrity: IntegrityReport
}
