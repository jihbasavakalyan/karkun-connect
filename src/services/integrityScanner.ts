/**
 * KC-0058 — IntegrityScanner (console/service only; no UI).
 */

import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { ruknMaster } from '@/data/ruknMaster'
import { getMaxKarkunNumFromRegistry, getNextKarkunNum, parseKarkunIdNum } from '@/lib/peopleStore'
import { getAllAssignments } from '@/stores/assignmentStore'
import { getCampaignLibrary } from '@/services/campaignService'
import { getCampaignConnectionMetrics } from '@/services/metricsService'
import type { IntegrityFinding, IntegrityReport } from '@/types/integrity.types'

function finding(
  code: string,
  severity: IntegrityFinding['severity'],
  message: string,
  extras?: Partial<IntegrityFinding>,
): IntegrityFinding {
  return { code, severity, message, ...extras }
}

/**
 * Run preservation / registry integrity checks against in-memory production state.
 */
export function runIntegrityScan(): IntegrityReport {
  const errors: IntegrityFinding[] = []
  const warnings: IntegrityFinding[] = []
  let checksRun = 0

  const karkuns = MOCK_KARKUN_REGISTRY
  const rukns = ruknMaster
  const assignments = getAllAssignments()
  const campaigns = [...getCampaignLibrary()]
  const campaignIds = new Set(campaigns.map((c) => c.id))
  const karkunIds = new Set(karkuns.map((k) => k.id))
  const ruknIds = new Set(rukns.map((r) => r.id))

  // 1. Counter drift
  checksRun += 1
  const maxNum = getMaxKarkunNumFromRegistry()
  const nextNum = getNextKarkunNum()
  if (nextNum <= maxNum) {
    errors.push(
      finding('COUNTER_DRIFT', 'error', `karkunCounter next=${nextNum} lags max existing kr-${maxNum}`, {
        details: { nextNum, maxNum },
      }),
    )
  } else if (nextNum > maxNum + 1) {
    warnings.push(
      finding(
        'COUNTER_AHEAD',
        'warning',
        `karkunCounter next=${nextNum} is ahead of max existing+1 (${maxNum + 1})`,
        { details: { nextNum, maxNum } },
      ),
    )
  }

  // 2. Duplicate Karkun IDs
  checksRun += 1
  const seenKarkunIds = new Map<string, number>()
  for (const k of karkuns) {
    seenKarkunIds.set(k.id, (seenKarkunIds.get(k.id) ?? 0) + 1)
  }
  for (const [id, count] of seenKarkunIds) {
    if (count > 1) {
      errors.push(
        finding('DUPLICATE_KARKUN_ID', 'error', `Duplicate Karkun id ${id} (${count} rows)`, {
          entityKind: 'karkun',
          entityId: id,
        }),
      )
    }
  }

  // 3. Duplicate Rukn IDs
  checksRun += 1
  const seenRuknIds = new Map<string, number>()
  for (const r of rukns) {
    seenRuknIds.set(r.id, (seenRuknIds.get(r.id) ?? 0) + 1)
  }
  for (const [id, count] of seenRuknIds) {
    if (count > 1) {
      errors.push(
        finding('DUPLICATE_RUKN_ID', 'error', `Duplicate Rukn id ${id} (${count} rows)`, {
          entityKind: 'rukn',
          entityId: id,
        }),
      )
    }
  }

  // 4. Duplicate assignment IDs / ASNs
  checksRun += 1
  const seenAsgn = new Map<string, number>()
  const seenAsn = new Map<string, number>()
  for (const a of assignments) {
    seenAsgn.set(a.assignmentId, (seenAsgn.get(a.assignmentId) ?? 0) + 1)
    const asn = a.assignmentNumber?.trim().toUpperCase()
    if (asn) seenAsn.set(asn, (seenAsn.get(asn) ?? 0) + 1)
  }
  for (const [id, count] of seenAsgn) {
    if (count > 1) {
      errors.push(
        finding('DUPLICATE_ASSIGNMENT_ID', 'error', `Duplicate assignmentId ${id}`, {
          entityKind: 'assignment',
          entityId: id,
        }),
      )
    }
  }
  for (const [asn, count] of seenAsn) {
    if (count > 1) {
      errors.push(
        finding('DUPLICATE_ASN', 'error', `Duplicate assignment number ${asn}`, {
          entityKind: 'assignment',
          details: { asn, count },
        }),
      )
    }
  }

  // 5. Broken connections / invalid refs / orphans
  checksRun += 1
  let activePerKarkun = new Map<string, string[]>()
  for (const a of assignments) {
    if (!karkunIds.has(a.karkunId)) {
      errors.push(
        finding(
          'MISSING_KARKUN_REF',
          'error',
          `Assignment ${a.assignmentId} references missing Karkun ${a.karkunId}`,
          { entityKind: 'assignment', entityId: a.assignmentId, details: { karkunId: a.karkunId } },
        ),
      )
    }
    if (!ruknIds.has(a.ruknId)) {
      errors.push(
        finding(
          'MISSING_RUKN_REF',
          'error',
          `Assignment ${a.assignmentId} references missing Rukn ${a.ruknId}`,
          { entityKind: 'assignment', entityId: a.assignmentId, details: { ruknId: a.ruknId } },
        ),
      )
    }
    if (a.status === 'Active') {
      const list = activePerKarkun.get(a.karkunId) ?? []
      list.push(a.assignmentId)
      activePerKarkun.set(a.karkunId, list)
    }
    // Historical Unassigned without endedDate is a soft warning
    if (a.status === 'Unassigned' && !a.endedDate) {
      warnings.push(
        finding(
          'ORPHAN_UNASSIGNED_META',
          'warning',
          `Unassigned assignment ${a.assignmentId} missing endedDate`,
          { entityKind: 'assignment', entityId: a.assignmentId },
        ),
      )
    }
  }

  checksRun += 1
  for (const [karkunId, ids] of activePerKarkun) {
    if (ids.length > 1) {
      errors.push(
        finding(
          'BROKEN_CONNECTION_MULTI_ACTIVE',
          'error',
          `Karkun ${karkunId} has ${ids.length} Active connections`,
          { entityKind: 'karkun', entityId: karkunId, details: { assignmentIds: ids } },
        ),
      )
    }
  }

  // 6. Invalid kr-* parse gaps (informational)
  checksRun += 1
  for (const k of karkuns) {
    if (parseKarkunIdNum(k.id) == null && !k.id.startsWith('verify-')) {
      warnings.push(
        finding('INVALID_KARKUN_ID_FORMAT', 'warning', `Karkun id ${k.id} is not kr-NNN format`, {
          entityKind: 'karkun',
          entityId: k.id,
        }),
      )
    }
  }

  // 7. Missing campaign references (library empty is OK; broken id is not)
  checksRun += 1
  if (campaigns.length === 0) {
    warnings.push(
      finding('MISSING_CAMPAIGN_LIBRARY', 'warning', 'No campaigns loaded in library'),
    )
  } else {
    for (const c of campaigns) {
      if (!c.id) {
        errors.push(finding('INVALID_CAMPAIGN', 'error', 'Campaign missing id'))
      }
    }
    // Placeholder for future assignment.campaignId checks
    void campaignIds
  }

  // KC-0058.1 — shared MetricsService (same Connected/Progress as Admin Dashboard).
  const metrics = getCampaignConnectionMetrics()
  checksRun += 1
  if (metrics.connected === 0 && metrics.activeConnectionRowCount > 0) {
    warnings.push(
      finding(
        'CANONICAL_CONNECTED_ZERO_WITH_ACTIVE_ROWS',
        'warning',
        `MetricsService connected=0 but ${metrics.activeConnectionRowCount} Active rows exist (likely missing/archived Karkun registry).`,
        { details: { ...metrics } },
      ),
    )
  }

  const recommendations: string[] = []
  if (errors.some((e) => e.code === 'COUNTER_DRIFT')) {
    recommendations.push('Run npm run admin:kc0056:repair-counter to heal karkunCounter.')
  }
  if (errors.some((e) => e.code.startsWith('DUPLICATE_'))) {
    recommendations.push('Investigate duplicate IDs with admin repair scripts before approving new records.')
  }
  if (errors.some((e) => e.code === 'BROKEN_CONNECTION_MULTI_ACTIVE')) {
    recommendations.push('Resolve multi-Active connections before Transfer/Assign operations.')
  }
  if (errors.some((e) => e.code === 'MISSING_KARKUN_REF' || e.code === 'MISSING_RUKN_REF')) {
    recommendations.push('Repair or archive orphan assignments that reference missing people.')
  }
  if (warnings.some((w) => w.code === 'CANONICAL_CONNECTED_ZERO_WITH_ACTIVE_ROWS')) {
    recommendations.push(
      'Dashboard Connected uses MetricsService.connected (canonical). Ensure Karkun registry is hydrated before reading KPIs.',
    )
  }
  if (errors.length === 0 && warnings.length === 0) {
    recommendations.push('Integrity scan clean — continue normal operations.')
  }
  recommendations.push(
    `Dashboard Connections should show ${metrics.connected}/${metrics.total} (${metrics.progressPct}%). Raw connection docs=${metrics.connectionDocumentCount}.`,
  )

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      errorCount: errors.length,
      warningCount: warnings.length,
      checksRun,
      healthy: errors.length === 0,
      connectionDocumentCount: metrics.connectionDocumentCount,
      activeConnectionRowCount: metrics.activeConnectionRowCount,
      connected: metrics.connected,
      remaining: metrics.remaining,
      total: metrics.total,
      progressPct: metrics.progressPct,
    },
    errors,
    warnings,
    recommendations,
    metrics,
  }
}

/** Convenience alias matching the KC-0058 module name. */
export const IntegrityScanner = {
  run: runIntegrityScan,
}
