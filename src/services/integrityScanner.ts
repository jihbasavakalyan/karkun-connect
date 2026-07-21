/**
 * KC-0058 / KC-0068 — IntegrityScanner (read-only; no automatic repairs).
 */

import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { ruknMaster } from '@/data/ruknMaster'
import { namesPossiblyDuplicate, normalizePersonName } from '@/lib/nameMatching'
import { normalizeMobile } from '@/lib/mobileValidation'
import { getMaxKarkunNumFromRegistry, getNextKarkunNum, parseKarkunIdNum } from '@/lib/peopleStore'
import { getAllAssignments } from '@/stores/assignmentStore'
import { getPendingKarkunRequests } from '@/stores/karkunRequestStore'
import { getCampaignLibrary } from '@/services/campaignService'
import { getCampaignConnectionMetrics } from '@/services/metricsService'
import type {
  IntegrityFinding,
  IntegrityMergeCandidate,
  IntegrityReport,
} from '@/types/integrity.types'

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

  // KC-0068 — Duplicate mobile numbers in Karkun registry (non-archived).
  checksRun += 1
  const mergeCandidates: IntegrityMergeCandidate[] = []
  const mobileOwners = new Map<string, { id: string; name: string }[]>()
  for (const k of karkuns) {
    if (k.isArchived) continue
    const mobile = k.mobile?.trim()
    if (!mobile) continue
    const key = normalizeMobile(mobile)
    if (!key) continue
    const list = mobileOwners.get(key) ?? []
    list.push({ id: k.id, name: k.name })
    mobileOwners.set(key, list)
  }
  for (const [mobile, owners] of mobileOwners) {
    if (owners.length > 1) {
      errors.push(
        finding(
          'DUPLICATE_MOBILE',
          'error',
          `Duplicate mobile ${mobile} across ${owners.length} Karkuns`,
          {
            entityKind: 'karkun',
            details: { mobile, owners },
          },
        ),
      )
      // KC-0069 — also flag as distinct document IDs (not a UI double-render).
      errors.push(
        finding(
          'DUPLICATE_FIRESTORE_DOCUMENT_IDS',
          'error',
          `Distinct Karkun document IDs share mobile ${mobile}: ${owners.map((o) => o.id).join(', ')}`,
          {
            entityKind: 'karkun',
            details: { mobile, documentIds: owners.map((o) => o.id) },
          },
        ),
      )

      const memberStatus = owners.map((owner) => {
        const active = assignments.some(
          (a) => a.karkunId === owner.id && a.status === 'Active',
        )
        return {
          id: owner.id,
          name: owner.name,
          connectionStatus: active ? 'Connected (Active)' : 'Disconnected / no Active',
          active,
        }
      })
      const connected = memberStatus.filter((m) => m.active)
      const disconnected = memberStatus.filter((m) => !m.active)
      const original = connected[0] ?? memberStatus[0]!
      const duplicate = memberStatus.filter((m) => m.id !== original.id)
      mergeCandidates.push({
        mobile,
        original: {
          id: original.id,
          name: original.name,
          connectionStatus: original.connectionStatus,
        },
        duplicate: duplicate.map((d) => ({
          id: d.id,
          name: d.name,
          connectionStatus: d.connectionStatus,
        })),
        reason: 'Same mobile on multiple Karkun registry rows (distinct IDs)',
        connectedRecordIds: connected.map((c) => c.id),
        disconnectedRecordIds: disconnected.map((d) => d.id),
        recommendation:
          connected.length === 1
            ? `Keep ${original.id}. Manually review/archive ${duplicate.map((d) => d.id).join(', ')}. No auto-delete.`
            : `Manual review required for mobile ${mobile} before any merge.`,
      })
    }
  }

  // KC-0068 — Missing mobile numbers on active Karkuns.
  checksRun += 1
  for (const k of karkuns) {
    if (k.isArchived || k.status !== 'active') continue
    if (!k.mobile?.trim()) {
      warnings.push(
        finding(
          'MISSING_MOBILE',
          'warning',
          `Karkun ${k.name} (${k.id}) has no mobile number`,
          { entityKind: 'karkun', entityId: k.id },
        ),
      )
    }
  }

  // KC-0068 — Duplicate pending requests (same mobile).
  checksRun += 1
  const pending = getPendingKarkunRequests()
  const pendingByMobile = new Map<string, string[]>()
  for (const request of pending) {
    const key = normalizeMobile(request.mobile)
    if (!key) continue
    const list = pendingByMobile.get(key) ?? []
    list.push(request.id)
    pendingByMobile.set(key, list)
  }
  for (const [mobile, requestIds] of pendingByMobile) {
    if (requestIds.length > 1) {
      errors.push(
        finding(
          'DUPLICATE_PENDING_REQUEST',
          'error',
          `Duplicate pending requests for mobile ${mobile} (${requestIds.length})`,
          { details: { mobile, requestIds } },
        ),
      )
    }
  }

  // KC-0068 — Possible duplicate names (warning only; names are not unique).
  checksRun += 1
  const activeKarkuns = karkuns.filter((k) => !k.isArchived)
  const reportedNamePairs = new Set<string>()
  for (let i = 0; i < activeKarkuns.length; i += 1) {
    const left = activeKarkuns[i]!
    for (let j = i + 1; j < activeKarkuns.length; j += 1) {
      const right = activeKarkuns[j]!
      if (!namesPossiblyDuplicate(left.name, right.name)) continue
      const pairKey = [left.id, right.id].sort().join('|')
      if (reportedNamePairs.has(pairKey)) continue
      reportedNamePairs.add(pairKey)
      warnings.push(
        finding(
          'POSSIBLE_DUPLICATE_NAME',
          'warning',
          `Possible duplicate name: "${left.name}" (${left.id}) ≈ "${right.name}" (${right.id})`,
          {
            entityKind: 'karkun',
            details: {
              left: { id: left.id, name: left.name, mobile: left.mobile },
              right: { id: right.id, name: right.name, mobile: right.mobile },
              normalized: normalizePersonName(left.name),
            },
          },
        ),
      )
    }
  }

  const recommendations: string[] = []
  if (errors.some((e) => e.code === 'COUNTER_DRIFT')) {
    recommendations.push('Run npm run admin:kc0056:repair-counter to heal karkunCounter.')
  }
  if (errors.some((e) => e.code.startsWith('DUPLICATE_'))) {
    recommendations.push(
      'Investigate duplicates manually. Do not auto-merge or auto-delete production records.',
    )
  }
  if (errors.some((e) => e.code === 'DUPLICATE_MOBILE' || e.code === 'DUPLICATE_PENDING_REQUEST')) {
    recommendations.push('Block new requests/approvals for duplicate mobiles until resolved.')
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
  if (warnings.some((w) => w.code === 'POSSIBLE_DUPLICATE_NAME')) {
    recommendations.push('Review possible duplicate names carefully — names alone are not unique keys.')
  }
  if (errors.length === 0 && warnings.length === 0) {
    recommendations.push('Integrity scan clean — continue normal operations.')
  }
  recommendations.push(
    `Dashboard Connections should show ${metrics.connected}/${metrics.total} (${metrics.progressPct}%). Raw connection docs=${metrics.connectionDocumentCount}.`,
  )
  recommendations.push('KC-0068/KC-0069 integrity report is read-only. No automatic fixes are applied.')
  if (mergeCandidates.length > 0) {
    recommendations.push(
      `${mergeCandidates.length} merge candidate group(s) listed for administrator review only.`,
    )
  }

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
    mergeCandidates,
  }
}

/** Convenience alias matching the KC-0058 module name. */
export const IntegrityScanner = {
  run: runIntegrityScan,
}
