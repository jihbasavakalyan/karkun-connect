#!/usr/bin/env node
/**
 * KC-036A — Forensic dump: R007 Active connection history (READ-ONLY).
 *
 * Usage:
 *   node scripts/admin/kc036a-r007-connection-forensics.mjs
 *   node scripts/admin/kc036a-r007-connection-forensics.mjs --rukn=R007
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

function argValue(flag, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`))
  return hit ? hit.slice(flag.length + 1) : fallback
}

function dayKey(iso) {
  if (!iso || typeof iso !== 'string') return 'unknown'
  const d = iso.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : 'unknown'
}

function hourKey(iso) {
  if (!iso || typeof iso !== 'string') return 'unknown'
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2})/.exec(iso)
  return m ? `${m[1]}:00` : dayKey(iso)
}

function isCampaignEligible(k) {
  const cat = String(k?.category || k?.personCategory || 'Karkun').toLowerCase()
  if (cat.includes('muttafiq')) return false
  if (k?.isSoftRemoved === true || k?.lifecycleStatus === 'soft_removed') return false
  if (k?.isArchived === true && (k?.archiveKind === 'duplicate_merge' || k?.archiveKind === 'admin_delete')) {
    return false
  }
  return true
}

function clusterGaps(sortedIso) {
  /** Groups where successive createdAt are within 5 minutes */
  const clusters = []
  let current = []
  let prev = null
  for (const iso of sortedIso) {
    const t = Date.parse(iso)
    if (!Number.isFinite(t)) {
      continue
    }
    if (prev == null || t - prev <= 5 * 60 * 1000) {
      current.push(iso)
    } else {
      if (current.length) clusters.push(current)
      current = [iso]
    }
    prev = t
  }
  if (current.length) clusters.push(current)
  return clusters
}

async function main() {
  const ruknId = argValue('--rukn', 'R007')
  const { db, projectId } = initFirebaseAdmin()

  const [ruknDoc, karkunsSnap, connectionsSnap, ledgerSnap] = await Promise.all([
    db.collection('rukns').doc(ruknId).get(),
    db.collection('karkuns').get(),
    db.collection('connections').where('ruknId', '==', ruknId).get(),
    db.collection('connectionLedger').where('ruknId', '==', ruknId).get().catch(() => null),
  ])

  const rukn = ruknDoc.exists ? { id: ruknDoc.id, ...ruknDoc.data() } : { id: ruknId }
  const karkunById = new Map(karkunsSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]))

  const allForRukn = connectionsSnap.docs.map((d) => {
    const data = d.data()
    return { assignmentId: d.id, ...data }
  })

  const active = allForRukn.filter((c) => c.status === 'Active' && c.isArchived !== true)

  // Field presence audit across Active docs
  const fieldPresence = {
    assignmentNumber: 0,
    assignedDate: 0,
    effectiveFrom: 0,
    assignedBy: 0,
    createdAt: 0,
    updatedAt: 0,
    createdBy: 0,
    source: 0,
    migrationFlag: 0,
    remarks: 0,
    transferHistory: 0,
    version: 0,
  }

  const rows = []
  for (const c of active) {
    const k = karkunById.get(c.karkunId)
    if (c.assignmentNumber) fieldPresence.assignmentNumber += 1
    if (c.assignedDate) fieldPresence.assignedDate += 1
    if (c.effectiveFrom) fieldPresence.effectiveFrom += 1
    if (c.assignedBy) fieldPresence.assignedBy += 1
    if (c.createdAt) fieldPresence.createdAt += 1
    if (c.updatedAt) fieldPresence.updatedAt += 1
    if (c.createdBy) fieldPresence.createdBy += 1
    if (c.source) fieldPresence.source += 1
    if (c.migrationFlag != null || c.fromMigration != null || c.seeded === true) {
      fieldPresence.migrationFlag += 1
    }
    if (c.remarks) fieldPresence.remarks += 1
    if (Array.isArray(c.transferHistory) && c.transferHistory.length) {
      fieldPresence.transferHistory += 1
    }
    if (c.version != null) fieldPresence.version += 1

    rows.push({
      assignmentId: c.assignmentId,
      asn: c.assignmentNumber || null,
      karkunId: c.karkunId,
      karkunName: k?.name || null,
      category: k?.category || null,
      campaignEligible: k ? isCampaignEligible(k) : false,
      currentAssignedRuknId: k?.assignedRuknId || null,
      assignedDate: c.assignedDate || null,
      effectiveFrom: c.effectiveFrom || null,
      createdAt: c.createdAt || null,
      updatedAt: c.updatedAt || null,
      assignedBy: c.assignedBy || null,
      createdBy: c.createdBy || null,
      source: c.source || null,
      remarks: c.remarks || null,
      transferHistoryCount: Array.isArray(c.transferHistory) ? c.transferHistory.length : 0,
      transferHistory: Array.isArray(c.transferHistory) ? c.transferHistory : [],
      rawKeys: Object.keys(c).sort(),
    })
  }

  rows.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))

  const byCreatedDay = {}
  const byEffectiveDay = {}
  const byAssignedBy = {}
  const byCreatedHour = {}
  for (const r of rows) {
    const cd = dayKey(r.createdAt)
    const ed = dayKey(r.effectiveFrom || r.assignedDate)
    const ah = hourKey(r.createdAt)
    byCreatedDay[cd] = (byCreatedDay[cd] || 0) + 1
    byEffectiveDay[ed] = (byEffectiveDay[ed] || 0) + 1
    byCreatedHour[ah] = (byCreatedHour[ah] || 0) + 1
    const ab = r.assignedBy || 'missing'
    byAssignedBy[ab] = (byAssignedBy[ab] || 0) + 1
  }

  const createdAts = rows.map((r) => r.createdAt).filter(Boolean).sort()
  const clusters = clusterGaps(createdAts).map((c) => ({
    size: c.length,
    first: c[0],
    last: c[c.length - 1],
    spanMs: Date.parse(c[c.length - 1]) - Date.parse(c[0]),
  }))

  // ASN sequence patterns
  const asns = rows
    .map((r) => r.asn)
    .filter(Boolean)
    .map((a) => {
      const m = /ASN-(\d+)/i.exec(String(a))
      return m ? Number(m[1]) : null
    })
    .filter((n) => n != null)
    .sort((a, b) => a - b)

  let consecutiveRuns = []
  if (asns.length) {
    let runStart = asns[0]
    let runPrev = asns[0]
    for (let i = 1; i < asns.length; i++) {
      if (asns[i] === runPrev + 1) {
        runPrev = asns[i]
      } else {
        consecutiveRuns.push({ from: runStart, to: runPrev, length: runPrev - runStart + 1 })
        runStart = asns[i]
        runPrev = asns[i]
      }
    }
    consecutiveRuns.push({ from: runStart, to: runPrev, length: runPrev - runStart + 1 })
    consecutiveRuns = consecutiveRuns.filter((r) => r.length >= 3).sort((a, b) => b.length - a.length)
  }

  // Sample distinct raw key unions
  const allKeys = new Set()
  for (const r of rows) for (const k of r.rawKeys) allKeys.add(k)

  // Ledger entries (if readable)
  let ledger = []
  if (ledgerSnap && !ledgerSnap.empty) {
    ledger = ledgerSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  // Comparison: load all Active for other Rukns counts (canonical eligible)
  const allConnections = await db.collection('connections').get()
  const perRukn = new Map()
  for (const d of allConnections.docs) {
    const c = d.data()
    if (c.status !== 'Active' || c.isArchived === true) continue
    const k = karkunById.get(c.karkunId)
    if (!k || !isCampaignEligible(k)) continue
    if (!perRukn.has(c.ruknId)) perRukn.set(c.ruknId, new Set())
    perRukn.get(c.ruknId).add(c.karkunId)
  }
  const counts = [...perRukn.entries()].map(([id, set]) => ({
    ruknId: id,
    count: set.size,
  }))
  counts.sort((a, b) => b.count - a.count)
  const r007Rank = counts.findIndex((c) => c.ruknId === ruknId) + 1
  const maxOther = counts.filter((c) => c.ruknId !== ruknId)[0]

  const report = {
    ticket: 'KC-036A',
    generatedAt: new Date().toISOString(),
    projectId,
    readOnly: true,
    ruknId,
    ruknName: rukn.name || null,
    ruknStatus: rukn.status || null,
    activeRowCount: rows.length,
    campaignEligibleActive: rows.filter((r) => r.campaignEligible).length,
    fieldPresence,
    availableMetadataKeys: [...allKeys].sort(),
    assignedByBreakdown: byAssignedBy,
    timelineByCreatedDay: Object.fromEntries(
      Object.entries(byCreatedDay).sort(([a], [b]) => a.localeCompare(b)),
    ),
    timelineByEffectiveDay: Object.fromEntries(
      Object.entries(byEffectiveDay).sort(([a], [b]) => a.localeCompare(b)),
    ),
    timelineByCreatedHour: Object.fromEntries(
      Object.entries(byCreatedHour).sort(([a], [b]) => a.localeCompare(b)),
    ),
    creationClustersWithin5Min: clusters,
    largestCreationClusters: clusters
      .slice()
      .sort((a, b) => b.size - a.size)
      .slice(0, 10),
    consecutiveAsnRunsLengthGte3: consecutiveRuns.slice(0, 15),
    distributionContext: {
      rankAmongRukns: r007Rank,
      totalRuknsWithConnections: counts.length,
      r007Count: perRukn.get(ruknId)?.size || 0,
      nextHighest: maxOther || null,
      top5: counts.slice(0, 5),
    },
    ledgerEntryCount: ledger.length,
    ledgerSample: ledger.slice(0, 20),
    connections: rows,
    nonActiveForSameRukn: allForRukn
      .filter((c) => c.status !== 'Active')
      .map((c) => ({
        assignmentId: c.assignmentId,
        asn: c.assignmentNumber || null,
        karkunId: c.karkunId,
        status: c.status,
        createdAt: c.createdAt || null,
        updatedAt: c.updatedAt || null,
        endedDate: c.endedDate || null,
      })),
  }

  const outDir = resolve('production-data/exports')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outPath = resolve(outDir, `kc036a-r007-forensics-${stamp}.json`)
  const latestPath = resolve(outDir, 'kc036a-r007-forensics-latest.json')
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8')
  writeFileSync(latestPath, JSON.stringify(report, null, 2), 'utf8')

  console.log(
    JSON.stringify(
      {
        ok: true,
        outPath,
        latestPath,
        summary: {
          ruknId,
          activeRowCount: report.activeRowCount,
          campaignEligibleActive: report.campaignEligibleActive,
          assignedByBreakdown: report.assignedByBreakdown,
          fieldPresence: report.fieldPresence,
          timelineByCreatedDay: report.timelineByCreatedDay,
          largestCreationClusters: report.largestCreationClusters,
          consecutiveAsnRunsLengthGte3: report.consecutiveAsnRunsLengthGte3,
          distributionContext: report.distributionContext,
          ledgerEntryCount: report.ledgerEntryCount,
          availableMetadataKeys: report.availableMetadataKeys,
        },
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
