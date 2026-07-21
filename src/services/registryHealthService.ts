/**
 * KC-0073 — Registry Health framework (read-only monitoring).
 * Composes IntegrityScanner + registry summary / quality checks.
 * Never mutates production data.
 */

import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { isValidMobileFormat, normalizeMobile } from '@/lib/mobileValidation'
import { IntegrityScanner } from '@/services/integrityScanner'
import { getAllAssignments } from '@/stores/assignmentStore'
import type { IntegrityFinding } from '@/types/integrity.types'
import type {
  RegistryHealthAlert,
  RegistryHealthReport,
  RegistryHealthScore,
  RegistrySummary,
} from '@/types/registryHealth.types'

const ERROR_PENALTY = 8
const WARNING_PENALTY = 2
const MIN_SCORE = 0

function finding(
  code: string,
  severity: IntegrityFinding['severity'],
  message: string,
  extras?: Partial<IntegrityFinding>,
): IntegrityFinding {
  return { code, severity, message, ...extras }
}

function buildRegistrySummary(): RegistrySummary {
  const karkuns = MOCK_KARKUN_REGISTRY
  const assignments = getAllAssignments()
  const activeConnectedIds = new Set(
    assignments.filter((a) => a.status === 'Active' && !a.isArchived).map((a) => a.karkunId),
  )

  let active = 0
  let archived = 0
  let connected = 0
  let available = 0
  let assigned = 0
  let unassigned = 0

  for (const k of karkuns) {
    if (k.isArchived) {
      archived += 1
      continue
    }
    active += 1
    if (activeConnectedIds.has(k.id)) connected += 1
    else available += 1
    if (k.assignmentStatus === 'Assigned') assigned += 1
    else if (k.assignmentStatus === 'Available') unassigned += 1
  }

  return {
    totalKarkuns: karkuns.length,
    active,
    archived,
    connected,
    available,
    assigned,
    unassigned,
  }
}

function runRegistryConsistencyChecks(): IntegrityFinding[] {
  const findings: IntegrityFinding[] = []
  const assignments = getAllAssignments()
  const activeByKarkun = new Map<string, number>()
  for (const a of assignments) {
    if (a.status !== 'Active' || a.isArchived) continue
    activeByKarkun.set(a.karkunId, (activeByKarkun.get(a.karkunId) ?? 0) + 1)
  }

  for (const k of MOCK_KARKUN_REGISTRY) {
    if (k.isArchived) continue
    const activeCount = activeByKarkun.get(k.id) ?? 0

    // Connected registry row should have an Active connection.
    if (k.assignmentStatus === 'Assigned' && activeCount === 0) {
      findings.push(
        finding(
          'CONNECTED_WITHOUT_ACTIVE_CONNECTION',
          'error',
          `Karkun ${k.name} (${k.id}) is Assigned but has no Active connection`,
          { entityKind: 'karkun', entityId: k.id },
        ),
      )
    }

    // Available should not have an Active connection.
    if (k.assignmentStatus === 'Available' && activeCount > 0) {
      findings.push(
        finding(
          'AVAILABLE_WITH_ACTIVE_CONNECTION',
          'error',
          `Karkun ${k.name} (${k.id}) is Available but has ${activeCount} Active connection(s)`,
          { entityKind: 'karkun', entityId: k.id, details: { activeCount } },
        ),
      )
    }
  }

  return findings
}

function runDataQualityChecks(): IntegrityFinding[] {
  const findings: IntegrityFinding[] = []
  const validStatuses = new Set(['active', 'inactive'])

  for (const k of MOCK_KARKUN_REGISTRY) {
    if (k.isArchived) continue

    if (!k.name?.trim()) {
      findings.push(
        finding('MISSING_NAME', 'error', `Karkun ${k.id} is missing a name`, {
          entityKind: 'karkun',
          entityId: k.id,
        }),
      )
    }
    if (!k.gender) {
      findings.push(
        finding('MISSING_GENDER', 'warning', `Karkun ${k.name || k.id} is missing gender`, {
          entityKind: 'karkun',
          entityId: k.id,
        }),
      )
    }
    if (!k.area?.trim()) {
      findings.push(
        finding('MISSING_AREA', 'warning', `Karkun ${k.name || k.id} is missing area`, {
          entityKind: 'karkun',
          entityId: k.id,
        }),
      )
    }
    if (!k.status) {
      findings.push(
        finding('MISSING_STATUS', 'error', `Karkun ${k.name || k.id} is missing status`, {
          entityKind: 'karkun',
          entityId: k.id,
        }),
      )
    } else if (!validStatuses.has(k.status)) {
      findings.push(
        finding(
          'INVALID_STATUS',
          'error',
          `Karkun ${k.name || k.id} has unknown status "${String(k.status)}"`,
          { entityKind: 'karkun', entityId: k.id, details: { status: k.status } },
        ),
      )
    }

    const mobile = k.mobile?.trim() ?? ''
    if (!mobile) {
      findings.push(
        finding('MISSING_MOBILE', 'warning', `Karkun ${k.name || k.id} has no mobile number`, {
          entityKind: 'karkun',
          entityId: k.id,
        }),
      )
    } else if (!isValidMobileFormat(mobile)) {
      findings.push(
        finding(
          'INVALID_MOBILE_FORMAT',
          'warning',
          `Karkun ${k.name || k.id} has invalid mobile "${mobile}"`,
          {
            entityKind: 'karkun',
            entityId: k.id,
            details: { mobile, normalized: normalizeMobile(mobile) },
          },
        ),
      )
    }
  }

  return findings
}

function countByCode(findings: IntegrityFinding[], code: string): number {
  return findings.filter((f) => f.code === code).length
}

function calculateScore(errors: number, warnings: number): RegistryHealthScore {
  const errorPenalty = errors * ERROR_PENALTY
  const warningPenalty = warnings * WARNING_PENALTY
  const score = Math.max(MIN_SCORE, 100 - errorPenalty - warningPenalty)

  let tone: RegistryHealthScore['tone']
  let label: string
  if (errors > 0 || score < 70) {
    tone = 'critical'
    label = 'Critical'
  } else if (warnings > 0 || score < 90) {
    tone = 'warning'
    label = 'Warning'
  } else {
    tone = 'healthy'
    label = 'Healthy'
  }

  return { score, tone, label, errorPenalty, warningPenalty }
}

function recommendedActionFor(code: string): string {
  switch (code) {
    case 'DUPLICATE_MOBILE':
    case 'DUPLICATE_FIRESTORE_DOCUMENT_IDS':
      return 'Review in Duplicate Resolution (Settings → Data). Soft-archive orphans only — never auto-delete.'
    case 'DUPLICATE_KARKUN_ID':
    case 'DUPLICATE_ASSIGNMENT_ID':
    case 'DUPLICATE_ASN':
      return 'Investigate duplicate IDs manually before any repair.'
    case 'BROKEN_CONNECTION_MULTI_ACTIVE':
    case 'AVAILABLE_WITH_ACTIVE_CONNECTION':
    case 'CONNECTED_WITHOUT_ACTIVE_CONNECTION':
      return 'Reconcile registry assignmentStatus with Active connections (manual).'
    case 'MISSING_KARKUN_REF':
    case 'MISSING_RUKN_REF':
      return 'Repair or archive orphan assignment/connection references manually.'
    case 'MISSING_MOBILE':
    case 'INVALID_MOBILE_FORMAT':
      return 'Open the Karkun record and correct the mobile number.'
    case 'MISSING_NAME':
    case 'MISSING_GENDER':
    case 'MISSING_AREA':
    case 'MISSING_STATUS':
    case 'INVALID_STATUS':
      return 'Open the Karkun record and complete required fields.'
    default:
      return 'Review the finding and resolve manually. No automatic repair is available.'
  }
}

function buildAlerts(findings: IntegrityFinding[]): RegistryHealthAlert[] {
  return findings.map((f, index) => {
    const affected: string[] = []
    if (f.entityId) affected.push(f.entityId)
    const details = f.details
    if (details && Array.isArray(details.owners)) {
      for (const owner of details.owners as { id?: string }[]) {
        if (owner?.id) affected.push(owner.id)
      }
    }
    if (details && Array.isArray(details.documentIds)) {
      for (const id of details.documentIds as string[]) affected.push(id)
    }
    if (details && Array.isArray(details.assignmentIds)) {
      for (const id of details.assignmentIds as string[]) affected.push(id)
    }
    return {
      id: `${f.code}-${f.entityId ?? index}`,
      issue: f.message,
      severity: f.severity,
      code: f.code,
      affectedRecords: [...new Set(affected)],
      recommendedAction: recommendedActionFor(f.code),
    }
  })
}

/** Run a full Registry Health scan (read-only). */
export function runRegistryHealthScan(): RegistryHealthReport {
  const integrity = IntegrityScanner.run()
  const consistency = runRegistryConsistencyChecks()
  const dataQuality = runDataQualityChecks()

  // Deduplicate MISSING_MOBILE already present in integrity warnings.
  const integrityMobileCodes = new Set(
    [...integrity.errors, ...integrity.warnings]
      .filter((f) => f.code === 'MISSING_MOBILE')
      .map((f) => f.entityId ?? f.message),
  )
  const dataQualityDeduped = dataQuality.filter((f) => {
    if (f.code !== 'MISSING_MOBILE') return true
    return !integrityMobileCodes.has(f.entityId ?? f.message)
  })

  const integrityFindings = [...integrity.errors, ...integrity.warnings, ...consistency]
  const allFindings = [...integrityFindings, ...dataQualityDeduped]
  const errors = allFindings.filter((f) => f.severity === 'error')
  const warnings = allFindings.filter((f) => f.severity === 'warning')

  return {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    summary: buildRegistrySummary(),
    score: calculateScore(errors.length, warnings.length),
    duplicateChecks: {
      duplicateMobiles: countByCode(allFindings, 'DUPLICATE_MOBILE'),
      duplicateRegistryIds: countByCode(allFindings, 'DUPLICATE_KARKUN_ID'),
      duplicateActiveConnections: countByCode(allFindings, 'BROKEN_CONNECTION_MULTI_ACTIVE'),
      duplicateAssignments:
        countByCode(allFindings, 'DUPLICATE_ASSIGNMENT_ID') +
        countByCode(allFindings, 'DUPLICATE_ASN'),
    },
    integrityFindings,
    dataQualityFindings: dataQualityDeduped,
    alerts: buildAlerts(allFindings),
    integrity,
  }
}

export function exportRegistryHealthJson(report: RegistryHealthReport): string {
  return `${JSON.stringify(report, null, 2)}\n`
}

export function exportRegistryHealthCsv(report: RegistryHealthReport): string {
  const rows: string[][] = [
    ['section', 'code', 'severity', 'issue', 'affected', 'recommendedAction'],
  ]
  for (const alert of report.alerts) {
    rows.push([
      'alert',
      alert.code,
      alert.severity,
      alert.issue,
      alert.affectedRecords.join('|'),
      alert.recommendedAction,
    ])
  }
  rows.push(['summary', 'totalKarkuns', '', String(report.summary.totalKarkuns), '', ''])
  rows.push(['summary', 'active', '', String(report.summary.active), '', ''])
  rows.push(['summary', 'archived', '', String(report.summary.archived), '', ''])
  rows.push(['summary', 'connected', '', String(report.summary.connected), '', ''])
  rows.push(['summary', 'available', '', String(report.summary.available), '', ''])
  rows.push(['summary', 'healthScore', '', String(report.score.score), '', report.score.label])

  return rows
    .map((cols) =>
      cols
        .map((cell) => {
          const value = String(cell ?? '')
          if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
          return value
        })
        .join(','),
    )
    .join('\n')
}

export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export const RegistryHealth = {
  run: runRegistryHealthScan,
  exportJson: exportRegistryHealthJson,
  exportCsv: exportRegistryHealthCsv,
  download: downloadTextFile,
}
