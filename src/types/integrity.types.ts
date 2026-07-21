/**
 * KC-0058 — Integrity scanner report types.
 */

import type { CampaignConnectionMetrics } from '@/services/metricsService'

export type IntegritySeverity = 'error' | 'warning'

export type IntegrityFinding = {
  code: string
  severity: IntegritySeverity
  message: string
  entityKind?: string
  entityId?: string
  details?: Record<string, unknown>
}

export type IntegrityReport = {
  generatedAt: string
  summary: {
    errorCount: number
    warningCount: number
    checksRun: number
    healthy: boolean
    /** KC-0058.1 — shared MetricsService fields (aligned with Admin Dashboard). */
    connectionDocumentCount: number
    activeConnectionRowCount: number
    connected: number
    remaining: number
    total: number
    progressPct: number
  }
  errors: IntegrityFinding[]
  warnings: IntegrityFinding[]
  recommendations: string[]
  /** Full MetricsService snapshot for forensic comparison with the dashboard. */
  metrics: CampaignConnectionMetrics
  /** KC-0069 — read-only merge candidates; never auto-applied. */
  mergeCandidates: IntegrityMergeCandidate[]
}

export type IntegrityMergeCandidate = {
  mobile: string
  original: { id: string; name: string; connectionStatus: string }
  duplicate: { id: string; name: string; connectionStatus: string }[]
  reason: string
  connectedRecordIds: string[]
  disconnectedRecordIds: string[]
  recommendation: string
}
