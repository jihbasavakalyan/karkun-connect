#!/usr/bin/env node
/**
 * KC-036 — Connection distribution report (Admin SDK, READ-ONLY).
 *
 * Does NOT mutate Firestore. Writes JSON under production-data/exports/.
 *
 * Usage:
 *   node scripts/admin/kc036-connection-distribution-report.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

function median(sorted) {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

function isCampaignEligible(k) {
  const cat = String(k.category || k.personCategory || 'Karkun').toLowerCase()
  if (cat.includes('muttafiq')) return false
  if (k.isSoftRemoved === true || k.lifecycleStatus === 'soft_removed') return false
  return true
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

  const active = connections.filter(
    (c) => c.status === 'Active' && c.isArchived !== true,
  )

  // Multi-Active per Karkun
  const activeByKarkun = new Map()
  for (const c of active) {
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
        ruknIds: [...new Set(list.map((c) => c.ruknId))],
        assignmentIds: list.map((c) => c.assignmentId),
      })
    }
  }

  // Duplicate assignmentId / ASN
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

  // Canonical per-Rukn: unique eligible karkunId
  const perRuknCanonical = new Map()
  const perRuknRawActive = new Map()
  for (const r of rukns) {
    perRuknCanonical.set(r.id, new Set())
    perRuknRawActive.set(r.id, 0)
  }

  for (const c of active) {
    if (!perRuknRawActive.has(c.ruknId)) perRuknRawActive.set(c.ruknId, 0)
    perRuknRawActive.set(c.ruknId, (perRuknRawActive.get(c.ruknId) || 0) + 1)

    const k = karkunById.get(c.karkunId)
    if (!k || !isCampaignEligible(k)) continue
    if (!perRuknCanonical.has(c.ruknId)) perRuknCanonical.set(c.ruknId, new Set())
    perRuknCanonical.get(c.ruknId).add(c.karkunId)
  }

  const rows = []
  for (const [ruknId, set] of perRuknCanonical) {
    const rukn = ruknById.get(ruknId)
    rows.push({
      ruknId,
      ruknName: rukn?.name || ruknId,
      status: rukn?.status || null,
      canonicalConnected: set.size,
      rawActiveRows: perRuknRawActive.get(ruknId) || 0,
    })
  }
  rows.sort((a, b) => b.canonicalConnected - a.canonicalConnected)

  const counts = rows.map((r) => r.canonicalConnected).sort((a, b) => a - b)
  const sum = counts.reduce((a, b) => a + b, 0)
  const totalRukns = rows.length
  const totalConnectedUnique = new Set(
    [...perRuknCanonical.values()].flatMap((s) => [...s]),
  ).size

  const over40 = rows.filter((r) => r.canonicalConnected > 40)
  const over60 = rows.filter((r) => r.canonicalConnected > 60)
  const over100 = rows.filter((r) => r.canonicalConnected > 100)

  // Registry mirror vs Active
  let registryAssignedWithoutActive = 0
  let activeWithoutRegistryMirror = 0
  for (const k of karkuns) {
    if (!isCampaignEligible(k)) continue
    const assigned = String(k.assignedRuknId || '').trim()
    const hasActive = (activeByKarkun.get(k.id) || []).length > 0
    if (assigned && !hasActive) registryAssignedWithoutActive += 1
    if (!assigned && hasActive) activeWithoutRegistryMirror += 1
  }

  const report = {
    ticket: 'KC-036',
    generatedAt: new Date().toISOString(),
    projectId,
    readOnly: true,
    summary: {
      totalRukns,
      totalConnectedKarkunsCanonical: totalConnectedUnique,
      totalActiveConnectionRows: active.length,
      totalConnectionDocuments: connections.length,
      min: counts.length ? counts[0] : 0,
      max: counts.length ? counts[counts.length - 1] : 0,
      average: counts.length ? Number((sum / counts.length).toFixed(2)) : 0,
      median: median(counts),
      ruknsWithOver40: over40.length,
      ruknsWithOver60: over60.length,
      ruknsWithOver100: over100.length,
    },
    integrity: {
      multiActiveKarkuns: multiActive.length,
      multiActiveSamples: multiActive.slice(0, 25),
      duplicateAssignmentNumbers: duplicateAsns.length,
      duplicateAsnSamples: duplicateAsns.slice(0, 25),
      registryAssignedWithoutActive,
      activeWithoutRegistryMirror,
      karkunConnectedToMultipleRukns: multiActive.filter(
        (m) => m.ruknIds.length > 1,
      ).length,
    },
    buckets: {
      over40: over40.map((r) => ({
        ruknId: r.ruknId,
        ruknName: r.ruknName,
        count: r.canonicalConnected,
      })),
      over60: over60.map((r) => ({
        ruknId: r.ruknId,
        ruknName: r.ruknName,
        count: r.canonicalConnected,
      })),
      over100: over100.map((r) => ({
        ruknId: r.ruknId,
        ruknName: r.ruknName,
        count: r.canonicalConnected,
      })),
    },
    perRukn: rows,
  }

  const outDir = resolve('production-data/exports')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outPath = resolve(outDir, `kc036-connection-distribution-${stamp}.json`)
  const latestPath = resolve(outDir, 'kc036-connection-distribution-latest.json')
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8')
  writeFileSync(latestPath, JSON.stringify(report, null, 2), 'utf8')

  console.log(
    JSON.stringify(
      {
        ok: true,
        outPath,
        latestPath,
        summary: report.summary,
        integrity: {
          multiActiveKarkuns: report.integrity.multiActiveKarkuns,
          karkunConnectedToMultipleRukns:
            report.integrity.karkunConnectedToMultipleRukns,
          duplicateAssignmentNumbers:
            report.integrity.duplicateAssignmentNumbers,
          registryAssignedWithoutActive,
          activeWithoutRegistryMirror,
        },
        top10: rows.slice(0, 10),
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
