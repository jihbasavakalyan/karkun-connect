/**
 * KC-0058 — Integrity scanner report types.
 */

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
  }
  errors: IntegrityFinding[]
  warnings: IntegrityFinding[]
  recommendations: string[]
}
