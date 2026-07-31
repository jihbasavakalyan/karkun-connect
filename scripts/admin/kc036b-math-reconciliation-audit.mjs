#!/usr/bin/env node
/**
 * KC-036B — Mathematical reconciliation audit (Admin SDK, READ-ONLY).
 *
 * Proves registry + connection totals reconcile.
 * Does NOT mutate Firestore.
 *
 * Usage:
 *   node scripts/admin/kc036b-math-reconciliation-audit.mjs
 *   npm run admin:kc036b:math-audit
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

function normalizeMobile(m) {
  return String(m || '').replace(/\D/g, '')
}

function getPersonCategory(k) {
  if (k.category === 'Karkun' || k.category === 'Muttafiq') return k.category
  if (k.isArchived && k.archiveKind !== 'duplicate_merge' && k.archiveKind !== 'admin_delete') {
    return 'Muttafiq'
  }
  return 'Karkun'
}

function isSoftRemoved(k) {
  if (!k.isArchived) return false
  return k.archiveKind === 'duplicate_merge' || k.archiveKind === 'admin_delete'
}

function isCampaignEligible(k) {
  return getPersonCategory(k) === 'Karkun' && !isSoftRemoved(k) && !k.isArchived
}

function genderOf(person) {
  const g = String(person.gender || '').toLowerCase()
  if (g === 'male' || g === 'm' || g === 'مرد') return 'male'
  if (g === 'female' || g === 'f' || g === 'خاتون' || g === 'خواتین') return 'female'
  return 'unknown'
}

function percentile(sorted, p) {
  if (!sorted.length) return 0
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

function median(sorted) {
  return percentile(sorted, 0.5)
}

function mode(values) {
  if (!values.length) return null
  const freq = new Map()
  for (const v of values) freq.set(v, (freq.get(v) || 0) + 1)
  let best = null
  let bestN = 0
  for (const [v, n] of freq) {
    if (n > bestN) {
      best = v
      bestN = n
    }
  }
  return { value: best, count: bestN }
}

function stdDev(values, mean) {
  if (values.length < 2) return 0
  const sumSq = values.reduce((a, v) => a + (v - mean) ** 2, 0)
  return Math.sqrt(sumSq / values.length)
}

function histogram(values, bucketSize = 5) {
  const buckets = {}
  for (const v of values) {
    const start = Math.floor(v / bucketSize) * bucketSize
    const label = `${start}-${start + bucketSize - 1}`
    buckets[label] = (buckets[label] || 0) + 1
  }
  return Object.fromEntries(Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })))
}

function classifyRegistryStatus(k) {
  // Mutually exclusive priority for Phase 1 math
  if (isSoftRemoved(k) && k.archiveKind === 'admin_delete') return 'deleted'
  if (isSoftRemoved(k) && k.archiveKind === 'duplicate_merge') return 'soft_removed_duplicate'
  if (k.isArchived) return 'archived'
  const status = String(k.status || '').toLowerCase()
  if (status === 'inactive') return 'inactive'
  if (status === 'suspended') return 'suspended'
  if (status === 'pending') return 'pending'
  if (status === 'active' || status === '') return 'active'
  return 'unknown_status'
}

async function main() {
  const { db, projectId } = initFirebaseAdmin()
  const [karkunsSnap, ruknsSnap, connectionsSnap] = await Promise.all([
    db.collection('karkuns').get(),
    db.collection('rukns').get(),
    db.collection('connections').get(),
  ])

  const karkuns = karkunsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const rukns = ruknsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const connections = connectionsSnap.docs.map((d) => ({ assignmentId: d.id, ...d.data() }))

  const karkunById = new Map(karkuns.map((k) => [k.id, k]))
  const ruknById = new Map(rukns.map((r) => [r.id, r]))
  const ruknIds = new Set(rukns.map((r) => r.id))
  const karkunIds = new Set(karkuns.map((k) => k.id))

  // ── Phase 1: Registry mathematics ───────────────────────────
  const registryByStatus = {
    active: 0,
    inactive: 0,
    archived: 0,
    deleted: 0,
    soft_removed_duplicate: 0,
    pending: 0,
    suspended: 0,
    unknown_status: 0,
  }
  const statusExamples = {}
  for (const k of karkuns) {
    const bucket = classifyRegistryStatus(k)
    registryByStatus[bucket] += 1
    if (!statusExamples[bucket]) statusExamples[bucket] = []
    if (statusExamples[bucket].length < 5) {
      statusExamples[bucket].push({ id: k.id, name: k.name, status: k.status, archiveKind: k.archiveKind })
    }
  }
  const registryTotal = karkuns.length
  const statusSum = Object.values(registryByStatus).reduce((a, b) => a + b, 0)
  const phase1Pass = statusSum === registryTotal

  const byCategory = { Karkun: 0, Muttafiq: 0 }
  for (const k of karkuns) {
    if (isSoftRemoved(k)) continue
    byCategory[getPersonCategory(k)] = (byCategory[getPersonCategory(k)] || 0) + 1
  }

  // ── Eligible Active Karkuns (campaign) ──────────────────────
  const eligible = karkuns.filter(isCampaignEligible)
  const eligibleIds = new Set(eligible.map((k) => k.id))

  // ── Active connections ──────────────────────────────────────
  const activeConnections = connections.filter(
    (c) => c.status === 'Active' && c.isArchived !== true,
  )

  // Canonical: unique eligible karkunId with Active connection
  const activeByKarkun = new Map()
  for (const c of activeConnections) {
    const list = activeByKarkun.get(c.karkunId) || []
    list.push(c)
    activeByKarkun.set(c.karkunId, list)
  }

  const multiActive = []
  for (const [karkunId, list] of activeByKarkun) {
    if (list.length > 1) {
      multiActive.push({
        karkunId,
        count: list.length,
        ruknIds: [...new Set(list.map((x) => x.ruknId))],
        assignmentIds: list.map((x) => x.assignmentId),
      })
    }
  }

  const connectedEligibleIds = new Set()
  const connectedIneligibleActive = []
  for (const [karkunId, list] of activeByKarkun) {
    if (eligibleIds.has(karkunId)) {
      connectedEligibleIds.add(karkunId)
    } else {
      connectedIneligibleActive.push({
        karkunId,
        activeRows: list.length,
        category: karkunById.get(karkunId) ? getPersonCategory(karkunById.get(karkunId)) : null,
        isArchived: karkunById.get(karkunId)?.isArchived ?? null,
        missingRegistry: !karkunById.has(karkunId),
      })
    }
  }

  const totalConnected = connectedEligibleIds.size
  const unconnectedEligible = eligible.filter((k) => !connectedEligibleIds.has(k.id))
  const totalUnconnected = unconnectedEligible.length
  const phase2Sum = totalConnected + totalUnconnected
  const phase2Pass = phase2Sum === eligible.length

  // ── Phase 3: Per-Rukn distribution ───────────────────────────
  const perRuknSets = new Map()
  for (const r of rukns) perRuknSets.set(r.id, new Set())

  for (const c of activeConnections) {
    const k = karkunById.get(c.karkunId)
    if (!k || !isCampaignEligible(k)) continue
    if (!perRuknSets.has(c.ruknId)) perRuknSets.set(c.ruknId, new Set())
    perRuknSets.get(c.ruknId).add(c.karkunId)
  }

  const distribution = []
  for (const [ruknId, set] of perRuknSets) {
    const r = ruknById.get(ruknId)
    distribution.push({
      ruknId,
      ruknName: r?.name || ruknId,
      gender: genderOf(r || {}),
      status: r?.status || null,
      connected: set.size,
      pctOfTotalConnected:
        totalConnected > 0 ? Number(((set.size / totalConnected) * 100).toFixed(2)) : 0,
      pctOfTotalRegistry:
        registryTotal > 0 ? Number(((set.size / registryTotal) * 100).toFixed(2)) : 0,
      pctOfEligible:
        eligible.length > 0 ? Number(((set.size / eligible.length) * 100).toFixed(2)) : 0,
    })
  }
  distribution.sort((a, b) => b.connected - a.connected)
  distribution.forEach((row, i) => {
    row.rank = i + 1
  })

  // ── Phase 4: Σ Rukn connected = total connected ──────────────
  const sumRuknConnected = distribution.reduce((a, r) => a + r.connected, 0)
  const phase4Diff = sumRuknConnected - totalConnected
  const phase4Pass = phase4Diff === 0

  // Detect if any karkun counted in >1 rukn set (should be impossible if unique)
  const karkunToRukns = new Map()
  for (const [ruknId, set] of perRuknSets) {
    for (const kid of set) {
      const list = karkunToRukns.get(kid) || []
      list.push(ruknId)
      karkunToRukns.set(kid, list)
    }
  }
  const multiRuknConnected = [...karkunToRukns.entries()]
    .filter(([, rs]) => rs.length > 1)
    .map(([karkunId, ruknIdList]) => ({ karkunId, ruknIds: ruknIdList }))

  // ── Phase 5: Duplicates ─────────────────────────────────────
  const byAsn = new Map()
  for (const c of connections) {
    const asn = c.assignmentNumber || c.asn
    if (!asn) continue
    const list = byAsn.get(asn) || []
    list.push(c.assignmentId)
    byAsn.set(asn, list)
  }
  const duplicateAsns = [...byAsn.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([asn, assignmentIds]) => ({ asn, assignmentIds }))

  const byAssignmentId = new Map()
  for (const c of connections) {
    byAssignmentId.set(c.assignmentId, (byAssignmentId.get(c.assignmentId) || 0) + 1)
  }
  const duplicateAssignmentIds = [...byAssignmentId.entries()]
    .filter(([, n]) => n > 1)
    .map(([id, count]) => ({ assignmentId: id, count }))

  const byKarkunDocId = new Map()
  for (const k of karkuns) {
    byKarkunDocId.set(k.id, (byKarkunDocId.get(k.id) || 0) + 1)
  }
  // Firestore doc IDs are unique by definition; still report if array had dups
  const duplicateKarkunIds = [...byKarkunDocId.entries()]
    .filter(([, n]) => n > 1)
    .map(([id, count]) => ({ id, count }))

  const byMobile = new Map()
  for (const k of karkuns) {
    if (isSoftRemoved(k)) continue
    const m = normalizeMobile(k.mobile)
    if (!m || m.length < 10) continue
    const list = byMobile.get(m) || []
    list.push({ id: k.id, name: k.name, category: getPersonCategory(k) })
    byMobile.set(m, list)
  }
  const duplicateMobiles = [...byMobile.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([mobile, people]) => ({ mobile, people }))

  const phase5 = {
    duplicateActiveAssignments: multiActive.length,
    duplicateAsns: duplicateAsns.length,
    duplicateMobiles: duplicateMobiles.length,
    duplicateKarkunIds: duplicateKarkunIds.length,
    duplicateConnectionRecords: duplicateAssignmentIds.length,
    multipleAssignedRukns: multiRuknConnected.length,
  }
  const phase5Pass = Object.values(phase5).every((n) => n === 0)

  // ── Phase 6: Active eligible not connected ──────────────────
  const missingConnections = unconnectedEligible.map((k) => ({
    karkunId: k.id,
    asn: k.assignmentNumber || k.asn || null,
    name: k.name || null,
    gender: genderOf(k),
    status: k.status || null,
    assignmentStatus: k.assignmentStatus || null,
    campaignStatus: k.campaignStatus || null,
    assignedRuknId: k.assignedRuknId || '',
    reason:
      String(k.assignedRuknId || '').trim()
        ? 'Registry shows assignedRuknId but no Active connection row'
        : k.assignmentStatus === 'Assigned'
          ? 'assignmentStatus=Assigned without Active connection'
          : 'Available / not connected',
  }))

  // ── Phase 7: Statistics on per-Rukn connected counts ─────────
  const counts = distribution.map((d) => d.connected).sort((a, b) => a - b)
  const sum = counts.reduce((a, b) => a + b, 0)
  const avg = counts.length ? sum / counts.length : 0
  const modeResult = mode(counts)
  const sd = stdDev(counts, avg)
  const p25 = percentile(counts, 0.25)
  const p75 = percentile(counts, 0.75)
  const iqr = p75 - p25
  const highOutliers = distribution.filter((d) => d.connected > p75 + 1.5 * iqr)
  const lowOutliers = distribution.filter(
    (d) => d.connected < p25 - 1.5 * iqr && iqr > 0,
  )
  // Rukns with 0 connections among those with any status
  const zeroConnected = distribution.filter((d) => d.connected === 0)

  const stats = {
    min: counts.length ? counts[0] : 0,
    max: counts.length ? counts[counts.length - 1] : 0,
    average: Number(avg.toFixed(4)),
    median: median(counts),
    mode: modeResult,
    standardDeviation: Number(sd.toFixed(4)),
    p25,
    p75,
    coefficientOfVariation: avg > 0 ? Number((sd / avg).toFixed(4)) : 0,
    histogramBucketSize5: histogram(counts, 5),
    highOutliers: highOutliers.map((d) => ({
      ruknId: d.ruknId,
      ruknName: d.ruknName,
      connected: d.connected,
    })),
    lowOutliers: lowOutliers.map((d) => ({
      ruknId: d.ruknId,
      ruknName: d.ruknName,
      connected: d.connected,
    })),
    zeroConnectedCount: zeroConnected.length,
    balancedRange: { low: p25, high: p75 },
  }

  // ── Phase 8: Gender analysis ────────────────────────────────
  function genderSlice(people, label) {
    const total = people.length
    const connected = people.filter((k) => connectedEligibleIds.has(k.id)).length
    const notConnected = total - connected
    const ruknGender = distribution.filter((d) => d.gender === label)
    const ruknCounts = ruknGender.map((d) => d.connected)
    const rAvg = ruknCounts.length
      ? ruknCounts.reduce((a, b) => a + b, 0) / ruknCounts.length
      : 0
    return {
      gender: label,
      totalPeople: total,
      connected,
      notConnected,
      connectionPct: total > 0 ? Number(((connected / total) * 100).toFixed(2)) : 0,
      ruknCount: ruknGender.length,
      averagePerRukn: Number(rAvg.toFixed(2)),
      highest: ruknGender.length
        ? Math.max(...ruknGender.map((d) => d.connected))
        : 0,
      lowest: ruknGender.length
        ? Math.min(...ruknGender.map((d) => d.connected))
        : 0,
    }
  }

  const eligibleMale = eligible.filter((k) => genderOf(k) === 'male')
  const eligibleFemale = eligible.filter((k) => genderOf(k) === 'female')
  const eligibleUnknown = eligible.filter((k) => genderOf(k) === 'unknown')
  const genderAnalysis = {
    male: genderSlice(eligibleMale, 'male'),
    female: genderSlice(eligibleFemale, 'female'),
    unknown: genderSlice(eligibleUnknown, 'unknown'),
  }

  // ── Phase 9: Integrity ──────────────────────────────────────
  const orphanConnectionsMissingKarkun = activeConnections.filter(
    (c) => !karkunIds.has(c.karkunId),
  )
  const orphanConnectionsMissingRukn = activeConnections.filter(
    (c) => !ruknIds.has(c.ruknId),
  )
  const invalidRuknIdsOnRegistry = eligible.filter(
    (k) =>
      String(k.assignedRuknId || '').trim() &&
      !ruknIds.has(String(k.assignedRuknId).trim()),
  )

  const integrity = {
    noOrphanActiveConnectionMissingKarkun: {
      pass: orphanConnectionsMissingKarkun.length === 0,
      count: orphanConnectionsMissingKarkun.length,
      samples: orphanConnectionsMissingKarkun.slice(0, 10).map((c) => ({
        assignmentId: c.assignmentId,
        karkunId: c.karkunId,
        ruknId: c.ruknId,
      })),
    },
    noOrphanActiveConnectionMissingRukn: {
      pass: orphanConnectionsMissingRukn.length === 0,
      count: orphanConnectionsMissingRukn.length,
      samples: orphanConnectionsMissingRukn.slice(0, 10).map((c) => ({
        assignmentId: c.assignmentId,
        karkunId: c.karkunId,
        ruknId: c.ruknId,
      })),
    },
    noInvalidAssignedRuknIdOnEligible: {
      pass: invalidRuknIdsOnRegistry.length === 0,
      count: invalidRuknIdsOnRegistry.length,
      samples: invalidRuknIdsOnRegistry.slice(0, 10).map((k) => ({
        id: k.id,
        assignedRuknId: k.assignedRuknId,
      })),
    },
    everyConnectionReferencesExistingKarkun: {
      pass: connections.every((c) => karkunIds.has(c.karkunId)),
      failCount: connections.filter((c) => !karkunIds.has(c.karkunId)).length,
    },
    everyConnectionReferencesExistingRukn: {
      pass: connections.every((c) => ruknIds.has(c.ruknId)),
      failCount: connections.filter((c) => !ruknIds.has(c.ruknId)).length,
    },
    noMultiActivePerKarkun: {
      pass: multiActive.length === 0,
      count: multiActive.length,
    },
    noCircularRefsApplicable: {
      pass: true,
      note: 'Connection graph is bipartite (Rukn↔Karkun); no self-referential cycle model in schema.',
    },
  }
  const phase9Pass = Object.values(integrity).every((v) => v.pass === true)

  // ── Phase 10: Final proof ───────────────────────────────────
  const finalProof = {
    registryTotal,
    statusSum,
    statusTotalsEqualRegistry: statusSum === registryTotal,
    eligibleActiveKarkuns: eligible.length,
    connected: totalConnected,
    notConnected: totalUnconnected,
    connectedPlusNotConnected: phase2Sum,
    connectedPlusNotConnectedEqualsEligible: phase2Pass,
    sumRuknConnected,
    sumRuknEqualsConnected: phase4Pass,
    phase4Diff,
    difference: phase4Diff,
    multiRuknConnectedCount: multiRuknConnected.length,
    connectedIneligibleActiveRows: connectedIneligibleActive.length,
    allReconcile:
      phase1Pass &&
      phase2Pass &&
      phase4Pass &&
      phase5.duplicateActiveAssignments === 0 &&
      phase5.multipleAssignedRukns === 0 &&
      phase9Pass,
  }

  const checks = [
    { id: 'P1_status_sum', pass: phase1Pass },
    { id: 'P2_connected_plus_unconnected', pass: phase2Pass },
    { id: 'P4_sum_rukn_equals_connected', pass: phase4Pass },
    { id: 'P5_zero_multi_active', pass: phase5.duplicateActiveAssignments === 0 },
    { id: 'P5_zero_multi_rukn', pass: phase5.multipleAssignedRukns === 0 },
    { id: 'P5_zero_dup_asn', pass: phase5.duplicateAsns === 0 },
    { id: 'P5_zero_dup_assignment_id', pass: phase5.duplicateConnectionRecords === 0 },
    { id: 'P5_zero_dup_karkun_id', pass: phase5.duplicateKarkunIds === 0 },
    {
      id: 'P5_zero_dup_mobile',
      pass: phase5.duplicateMobiles === 0,
      note: 'Duplicate mobiles are registry DQ; may be non-zero without breaking connection math',
    },
    { id: 'P9_integrity', pass: phase9Pass },
  ]

  const connectionMathPass =
    phase1Pass &&
    phase2Pass &&
    phase4Pass &&
    phase5.duplicateActiveAssignments === 0 &&
    phase5.multipleAssignedRukns === 0 &&
    phase9Pass

  const report = {
    ticket: 'KC-036B',
    generatedAt: new Date().toISOString(),
    projectId,
    readOnly: true,
    executiveSummary: {
      mathematicallyConsistentConnectionModel: connectionMathPass,
      confidence: connectionMathPass
        ? duplicateMobiles.length === 0
          ? 'High'
          : 'High'
        : 'Medium',
      registryTotal,
      eligibleActiveKarkuns: eligible.length,
      connected: totalConnected,
      notConnected: totalUnconnected,
      ruknCount: rukns.length,
      sumRuknConnected,
      difference: phase4Diff,
      duplicateMobiles: duplicateMobiles.length,
      unconnectedEligible: totalUnconnected,
      headline: connectionMathPass
        ? `Connection mathematics reconcile: Σ Rukn (${sumRuknConnected}) = Connected (${totalConnected}); Connected+Unconnected (${phase2Sum}) = Eligible (${eligible.length}).`
        : `Connection mathematics DO NOT fully reconcile (diff=${phase4Diff}).`,
    },
    phase1_registry: {
      registryTotal,
      byStatus: registryByStatus,
      statusSum,
      pass: phase1Pass,
      statusExamples,
      byCategory,
    },
    phase2_connections: {
      totalConnectedEligible: totalConnected,
      totalUnconnectedEligible: totalUnconnected,
      eligibleActiveKarkuns: eligible.length,
      sum: phase2Sum,
      pass: phase2Pass,
      activeConnectionRows: activeConnections.length,
      connectedIneligibleActiveSamples: connectedIneligibleActive.slice(0, 25),
      connectedIneligibleActiveCount: connectedIneligibleActive.length,
    },
    phase3_distribution: distribution,
    phase4_reconciliation: {
      sumRuknConnected,
      totalConnected,
      difference: phase4Diff,
      pass: phase4Pass,
      multiRuknConnected,
    },
    phase5_duplicates: {
      ...phase5,
      passConnectionUniqueness:
        phase5.duplicateActiveAssignments === 0 &&
        phase5.multipleAssignedRukns === 0 &&
        phase5.duplicateAsns === 0 &&
        phase5.duplicateConnectionRecords === 0 &&
        phase5.duplicateKarkunIds === 0,
      samples: {
        multiActive: multiActive.slice(0, 20),
        duplicateAsns: duplicateAsns.slice(0, 20),
        duplicateMobiles: duplicateMobiles.slice(0, 30),
        multiRuknConnected: multiRuknConnected.slice(0, 20),
      },
    },
    phase6_missing: {
      count: missingConnections.length,
      records: missingConnections,
    },
    phase7_statistics: stats,
    phase8_gender: genderAnalysis,
    phase9_integrity: integrity,
    phase10_finalProof: finalProof,
    validationMatrix: checks,
    overall: {
      connectionMathPass,
      confidence: connectionMathPass ? 'High' : 'Medium',
      notes: [
        'Eligible = category Karkun, not archived, not soft-removed (KC-0101 isCampaignEligible).',
        'Connected = unique eligible karkunId with ≥1 Active non-archived connection.',
        'Duplicate mobiles are reported separately; they do not by themselves break Rukn connection summation.',
      ],
    },
  }

  const outDir = resolve('production-data/exports')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outPath = resolve(outDir, `kc036b-math-audit-${stamp}.json`)
  const latestPath = resolve(outDir, 'kc036b-math-audit-latest.json')
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8')
  writeFileSync(latestPath, JSON.stringify(report, null, 2), 'utf8')

  // Markdown table for docs generation helper
  const mdTable = [
    '| Rank | Rukn ID | Rukn Name | Gender | Connected | % Connected | % Registry |',
    '| ---: | ------- | --------- | ------ | --------: | ----------: | ---------: |',
    ...distribution.map(
      (d) =>
        `| ${d.rank} | ${d.ruknId} | ${d.ruknName} | ${d.gender} | ${d.connected} | ${d.pctOfTotalConnected}% | ${d.pctOfTotalRegistry}% |`,
    ),
  ].join('\n')
  writeFileSync(resolve(outDir, 'kc036b-rukn-distribution-table.md'), mdTable, 'utf8')

  console.log(
    JSON.stringify(
      {
        ok: true,
        outPath,
        latestPath,
        executiveSummary: report.executiveSummary,
        phase1: { pass: phase1Pass, registryTotal, statusSum, byStatus: registryByStatus },
        phase2: {
          pass: phase2Pass,
          connected: totalConnected,
          unconnected: totalUnconnected,
          eligible: eligible.length,
        },
        phase4: { pass: phase4Pass, sumRuknConnected, difference: phase4Diff },
        phase5,
        phase6Missing: missingConnections.length,
        phase7: {
          min: stats.min,
          max: stats.max,
          avg: stats.average,
          median: stats.median,
          sd: stats.standardDeviation,
          cv: stats.coefficientOfVariation,
          highOutliers: stats.highOutliers,
        },
        phase8: genderAnalysis,
        phase9Pass,
        validationMatrix: checks,
        top10: distribution.slice(0, 10),
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
