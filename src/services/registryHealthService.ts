/**
 * KC-0073 — Registry Health dashboard engine (read-only monitoring).
 * Composes IntegrityScanner + registry summary / quality / consistency checks.
 * Uses in-memory repository caches only — no Firestore reads, no mutations.
 */

import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { ruknMaster } from '@/data/ruknMaster'
import { isValidMobileFormat, normalizeMobile } from '@/lib/mobileValidation'
import { IntegrityScanner } from '@/services/integrityScanner'
import { getAllAssignments } from '@/stores/assignmentStore'
import { getPendingKarkunRequests } from '@/stores/karkunRequestStore'
import type { IntegrityFinding } from '@/types/integrity.types'
import type {
  RegistryCheckResult,
  RegistryConsistencyChecks,
  RegistryDataQualityCounts,
  RegistryDuplicateChecks,
  RegistryHealthAlert,
  RegistryHealthAlertSeverity,
  RegistryHealthReport,
  RegistryHealthScore,
  RegistryScanMeta,
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
  let male = 0
  let female = 0

  for (const k of karkuns) {
    if (k.isArchived) {
      archived += 1
      continue
    }
    active += 1
    if (k.gender === 'Male') male += 1
    else if (k.gender === 'Female') female += 1
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
    male,
    female,
    pendingRequests: getPendingKarkunRequests().length,
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
  const validGenders = new Set(['Male', 'Female'])

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
    } else if (!validGenders.has(k.gender)) {
      findings.push(
        finding(
          'UNKNOWN_GENDER',
          'warning',
          `Karkun ${k.name || k.id} has unknown gender "${String(k.gender)}"`,
          { entityKind: 'karkun', entityId: k.id, details: { gender: k.gender } },
        ),
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

function runMergedReferenceChecks(): IntegrityFinding[] {
  const findings: IntegrityFinding[] = []
  const byId = new Map(MOCK_KARKUN_REGISTRY.map((k) => [k.id, k]))

  for (const k of MOCK_KARKUN_REGISTRY) {
    if (k.mergedInto || k.archiveKind === 'duplicate_merge') {
      if (!k.isArchived) {
        findings.push(
          finding(
            'MERGED_DUPLICATE_NOT_ARCHIVED',
            'error',
            `Merged duplicate ${k.id} is not archived`,
            { entityKind: 'karkun', entityId: k.id, details: { mergedInto: k.mergedInto } },
          ),
        )
      }
    }
    if (k.mergedInto) {
      const master = byId.get(k.mergedInto)
      if (!master) {
        findings.push(
          finding(
            'ORPHAN_MERGED_INTO_REF',
            'error',
            `Karkun ${k.id} mergedInto missing master ${k.mergedInto}`,
            { entityKind: 'karkun', entityId: k.id, details: { mergedInto: k.mergedInto } },
          ),
        )
      }
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

function mapAlertSeverity(code: string, severity: IntegrityFinding['severity']): RegistryHealthAlertSeverity {
  if (severity === 'error') return 'critical'
  if (
    code === 'POSSIBLE_DUPLICATE_NAME' ||
    code === 'COUNTER_AHEAD' ||
    code === 'ORPHAN_UNASSIGNED_META' ||
    code === 'MISSING_CAMPAIGN_LIBRARY'
  ) {
    return 'information'
  }
  return 'warning'
}

function recommendedActionFor(code: string): string {
  switch (code) {
    case 'DUPLICATE_MOBILE':
    case 'DUPLICATE_FIRESTORE_DOCUMENT_IDS':
      return 'Review in Duplicate Resolution (Settings → Data). Soft-archive orphans only — never auto-delete.'
    case 'DUPLICATE_KARKUN_ID':
    case 'DUPLICATE_ASSIGNMENT_ID':
    case 'DUPLICATE_ASN':
    case 'DUPLICATE_PENDING_REQUEST':
      return 'Investigate duplicate IDs manually before any repair.'
    case 'BROKEN_CONNECTION_MULTI_ACTIVE':
    case 'AVAILABLE_WITH_ACTIVE_CONNECTION':
    case 'CONNECTED_WITHOUT_ACTIVE_CONNECTION':
      return 'Reconcile registry assignmentStatus with Active connections (manual).'
    case 'MISSING_KARKUN_REF':
    case 'MISSING_RUKN_REF':
    case 'ORPHAN_MERGED_INTO_REF':
      return 'Repair or archive orphan references manually.'
    case 'MERGED_DUPLICATE_NOT_ARCHIVED':
      return 'Ensure merged duplicates remain soft-archived.'
    case 'MISSING_MOBILE':
    case 'INVALID_MOBILE_FORMAT':
      return 'Open the Karkun record and correct the mobile number.'
    case 'MISSING_NAME':
    case 'MISSING_GENDER':
    case 'MISSING_AREA':
    case 'MISSING_STATUS':
    case 'INVALID_STATUS':
    case 'UNKNOWN_GENDER':
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
    if (details && Array.isArray(details.requestIds)) {
      for (const id of details.requestIds as string[]) affected.push(id)
    }
    return {
      id: `${f.code}-${f.entityId ?? index}`,
      issue: f.message,
      severity: mapAlertSeverity(f.code, f.severity),
      code: f.code,
      affectedRecords: [...new Set(affected)],
      recommendedAction: recommendedActionFor(f.code),
    }
  })
}

function buildIntegrityCheckResults(
  allFindings: IntegrityFinding[],
  assignments = getAllAssignments(),
): RegistryCheckResult[] {
  const karkunIds = new Set(MOCK_KARKUN_REGISTRY.map((k) => k.id))
  const ruknIds = new Set(ruknMaster.map((r) => r.id))
  const active = assignments.filter((a) => a.status === 'Active' && !a.isArchived)

  const connectedWithoutActive = countByCode(allFindings, 'CONNECTED_WITHOUT_ACTIVE_CONNECTION')
  const missingKarkun = countByCode(allFindings, 'MISSING_KARKUN_REF')
  const missingRukn = countByCode(allFindings, 'MISSING_RUKN_REF')
  const invalidStatus = countByCode(allFindings, 'INVALID_STATUS') + countByCode(allFindings, 'MISSING_STATUS')
  const multiActive = countByCode(allFindings, 'BROKEN_CONNECTION_MULTI_ACTIVE')

  const activeMissingKarkun = active.filter((a) => !karkunIds.has(a.karkunId)).length
  const activeMissingRukn = active.filter((a) => !ruknIds.has(a.ruknId)).length

  return [
    {
      id: 'connected-has-active',
      label: 'Every Connected Karkun has an Active Connection',
      passed: connectedWithoutActive === 0,
      count: connectedWithoutActive,
      severity: 'critical',
    },
    {
      id: 'active-conn-karkun',
      label: 'Every Active Connection references an existing Karkun',
      passed: activeMissingKarkun === 0,
      count: activeMissingKarkun,
      severity: 'critical',
    },
    {
      id: 'active-conn-rukn',
      label: 'Every Active Connection references an existing Rukn',
      passed: activeMissingRukn === 0,
      count: activeMissingRukn,
      severity: 'critical',
    },
    {
      id: 'assignment-karkun',
      label: 'Every Assignment references an existing Karkun',
      passed: missingKarkun === 0,
      count: missingKarkun,
      severity: 'critical',
    },
    {
      id: 'assignment-rukn',
      label: 'Every Assignment references an existing Rukn',
      passed: missingRukn === 0,
      count: missingRukn,
      severity: 'critical',
    },
    {
      id: 'no-orphan-connections',
      label: 'No orphan connections',
      passed: missingKarkun === 0 && missingRukn === 0,
      count: missingKarkun + missingRukn,
      severity: 'critical',
    },
    {
      id: 'no-orphan-assignments',
      label: 'No orphan assignments',
      passed: missingKarkun === 0 && missingRukn === 0,
      count: missingKarkun + missingRukn,
      severity: 'critical',
    },
    {
      id: 'valid-status',
      label: 'No invalid status values',
      passed: invalidStatus === 0,
      count: invalidStatus,
      severity: 'critical',
    },
    {
      id: 'single-active-connection',
      label: 'No duplicate Active connections per Karkun',
      passed: multiActive === 0,
      count: multiActive,
      severity: 'critical',
    },
  ]
}

function buildDuplicateChecks(allFindings: IntegrityFinding[]): RegistryDuplicateChecks {
  return {
    duplicateMobiles: countByCode(allFindings, 'DUPLICATE_MOBILE'),
    duplicateRegistryIds: countByCode(allFindings, 'DUPLICATE_KARKUN_ID'),
    duplicateActiveAssignments:
      countByCode(allFindings, 'DUPLICATE_ASSIGNMENT_ID') + countByCode(allFindings, 'DUPLICATE_ASN'),
    duplicateActiveConnections: countByCode(allFindings, 'BROKEN_CONNECTION_MULTI_ACTIVE'),
    duplicatePendingRequests: countByCode(allFindings, 'DUPLICATE_PENDING_REQUEST'),
  }
}

function buildDataQualityCounts(findings: IntegrityFinding[]): RegistryDataQualityCounts {
  return {
    missingMobile: countByCode(findings, 'MISSING_MOBILE'),
    missingName: countByCode(findings, 'MISSING_NAME'),
    missingGender: countByCode(findings, 'MISSING_GENDER'),
    missingArea: countByCode(findings, 'MISSING_AREA'),
    missingStatus: countByCode(findings, 'MISSING_STATUS'),
    invalidMobileFormat: countByCode(findings, 'INVALID_MOBILE_FORMAT'),
    unknownGender: countByCode(findings, 'UNKNOWN_GENDER'),
    unknownStatus: countByCode(findings, 'INVALID_STATUS'),
  }
}

function buildConsistency(summary: RegistrySummary, allFindings: IntegrityFinding[]): RegistryConsistencyChecks {
  const activeConnectionCount = getAllAssignments().filter(
    (a) => a.status === 'Active' && !a.isArchived,
  ).length
  const activeAssignmentCount = activeConnectionCount
  const orphanMergedIntoRefs = countByCode(allFindings, 'ORPHAN_MERGED_INTO_REF')
  const mergedNotArchived = countByCode(allFindings, 'MERGED_DUPLICATE_NOT_ARCHIVED')

  return {
    connectedEqualsActiveConnections: summary.connected === activeConnectionCount,
    connectedCount: summary.connected,
    activeConnectionCount,
    assignedEqualsActiveAssignments: summary.assigned === activeAssignmentCount,
    assignedCount: summary.assigned,
    activeAssignmentCount,
    archivedExcludedFromActive: summary.active + summary.archived === summary.totalKarkuns,
    mergedDuplicatesRemainArchived: mergedNotArchived === 0,
    orphanMergedIntoRefs,
  }
}

function buildScanMeta(
  integrityChecks: RegistryCheckResult[],
  alerts: RegistryHealthAlert[],
  generatedAt: string,
): RegistryScanMeta {
  const passed = integrityChecks.filter((c) => c.passed).length
  return {
    lastScanAt: generatedAt,
    totalChecks: integrityChecks.length,
    passed,
    warnings: alerts.filter((a) => a.severity === 'warning').length,
    criticalIssues: alerts.filter((a) => a.severity === 'critical').length,
  }
}

/** Run a full Registry Health scan (read-only, in-memory caches only). */
export function runRegistryHealthScan(): RegistryHealthReport {
  const integrity = IntegrityScanner.run()
  const consistencyFindings = runRegistryConsistencyChecks()
  const mergeFindings = runMergedReferenceChecks()
  const dataQuality = runDataQualityChecks()

  const integrityMobileCodes = new Set(
    [...integrity.errors, ...integrity.warnings]
      .filter((f) => f.code === 'MISSING_MOBILE')
      .map((f) => f.entityId ?? f.message),
  )
  const dataQualityDeduped = dataQuality.filter((f) => {
    if (f.code !== 'MISSING_MOBILE') return true
    return !integrityMobileCodes.has(f.entityId ?? f.message)
  })

  const integrityFindings = [
    ...integrity.errors,
    ...integrity.warnings,
    ...consistencyFindings,
    ...mergeFindings,
  ]
  const allFindings = [...integrityFindings, ...dataQualityDeduped]
  const errors = allFindings.filter((f) => f.severity === 'error')
  const warnings = allFindings.filter((f) => f.severity === 'warning')

  const summary = buildRegistrySummary()
  const integrityChecks = buildIntegrityCheckResults(allFindings)
  const alerts = buildAlerts(allFindings)
  const generatedAt = new Date().toISOString()

  return {
    generatedAt,
    readOnly: true,
    summary,
    score: calculateScore(errors.length, warnings.length),
    scan: buildScanMeta(integrityChecks, alerts, generatedAt),
    integrityChecks,
    duplicateChecks: buildDuplicateChecks(allFindings),
    dataQuality: buildDataQualityCounts([...integrity.warnings, ...dataQualityDeduped, ...integrity.errors]),
    consistency: buildConsistency(summary, allFindings),
    integrityFindings,
    dataQualityFindings: dataQualityDeduped,
    alerts,
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
  rows.push(['summary', 'male', '', String(report.summary.male), '', ''])
  rows.push(['summary', 'female', '', String(report.summary.female), '', ''])
  rows.push(['summary', 'pendingRequests', '', String(report.summary.pendingRequests), '', ''])
  rows.push(['summary', 'healthScore', '', String(report.score.score), '', report.score.label])
  rows.push([
    'duplicate',
    'mobiles',
    '',
    String(report.duplicateChecks.duplicateMobiles),
    '',
    '',
  ])
  rows.push([
    'duplicate',
    'pendingRequests',
    '',
    String(report.duplicateChecks.duplicatePendingRequests),
    '',
    '',
  ])

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
