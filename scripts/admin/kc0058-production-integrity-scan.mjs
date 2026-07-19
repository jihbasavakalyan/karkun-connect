#!/usr/bin/env node
/**
 * KC-0058 — Production IntegrityScanner (Admin SDK, read-only).
 *
 * Usage:
 *   node scripts/admin/kc0058-production-integrity-scan.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

function parseKarkunNum(id) {
  const m = /^kr-(\d+)$/i.exec(String(id || ''))
  return m ? Number.parseInt(m[1], 10) : null
}

async function main() {
  const { db, projectId } = initFirebaseAdmin()
  const [karkunsSnap, ruknsSnap, connectionsSnap, counterSnap, campaignsSnap] = await Promise.all([
    db.collection('karkuns').get(),
    db.collection('rukns').get(),
    db.collection('connections').get(),
    db.collection('settings').doc('karkunCounter').get(),
    db.collection('campaigns').get(),
  ])

  const errors = []
  const warnings = []
  let checksRun = 0

  const karkuns = karkunsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const rukns = ruknsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const assignments = connectionsSnap.docs.map((d) => ({ assignmentId: d.id, ...d.data() }))
  const karkunIds = new Set(karkuns.map((k) => k.id))
  const ruknIds = new Set(rukns.map((r) => r.id))
  const counter = counterSnap.exists ? Number(counterSnap.data()?.nextKarkunNum ?? 1) : 1
  let maxNum = 0
  for (const k of karkuns) {
    const n = parseKarkunNum(k.id)
    if (n != null && n > maxNum) maxNum = n
  }

  checksRun += 1
  if (counter <= maxNum) {
    errors.push({
      code: 'COUNTER_DRIFT',
      severity: 'error',
      message: `nextKarkunNum=${counter} lags max=${maxNum}`,
    })
  }

  checksRun += 1
  const seenK = new Map()
  for (const k of karkuns) seenK.set(k.id, (seenK.get(k.id) || 0) + 1)
  for (const [id, count] of seenK) {
    if (count > 1) errors.push({ code: 'DUPLICATE_KARKUN_ID', message: `${id} x${count}` })
  }

  checksRun += 1
  const activeByKarkun = new Map()
  for (const a of assignments) {
    if (!karkunIds.has(a.karkunId)) {
      errors.push({
        code: 'MISSING_KARKUN_REF',
        message: `${a.assignmentId} → missing ${a.karkunId}`,
      })
    }
    if (!ruknIds.has(a.ruknId)) {
      errors.push({
        code: 'MISSING_RUKN_REF',
        message: `${a.assignmentId} → missing ${a.ruknId}`,
      })
    }
    if (a.status === 'Active') {
      const list = activeByKarkun.get(a.karkunId) || []
      list.push(a.assignmentId)
      activeByKarkun.set(a.karkunId, list)
    }
  }
  for (const [karkunId, ids] of activeByKarkun) {
    if (ids.length > 1) {
      errors.push({
        code: 'BROKEN_CONNECTION_MULTI_ACTIVE',
        message: `${karkunId} has ${ids.length} Active`,
      })
    }
  }

  checksRun += 1
  if (campaignsSnap.empty) {
    warnings.push({ code: 'MISSING_CAMPAIGN_LIBRARY', message: 'No campaigns docs' })
  }

  // KC-0058.1 — dashboard-aligned counts (canonical Connected ≠ raw doc count).
  let activeRowCount = 0
  let archivedConnectionCount = 0
  const activeUnique = new Set()
  for (const a of assignments) {
    if (a.isArchived) archivedConnectionCount += 1
    if (a.status === 'Active' && !a.isArchived) {
      activeRowCount += 1
      const k = karkuns.find((row) => row.id === a.karkunId)
      if (k && !k.isArchived) activeUnique.add(a.karkunId)
    }
  }
  const connected = activeUnique.size
  const remaining = karkuns.filter((k) => !k.isArchived && k.assignmentStatus === 'Available').length
  const total = connected + remaining
  const progressPct = total > 0 ? Math.round((connected / total) * 100) : 0

  const report = {
    ticket: 'KC-0058.1',
    projectId,
    generatedAt: new Date().toISOString(),
    summary: {
      errorCount: errors.length,
      warningCount: warnings.length,
      checksRun,
      healthy: errors.length === 0,
      karkunCount: karkuns.length,
      ruknCount: rukns.length,
      connectionDocumentCount: assignments.length,
      activeConnectionRowCount: activeRowCount,
      archivedConnectionCount,
      connected,
      remaining,
      total,
      progressPct,
      nextKarkunNum: counter,
      maxKarkunNum: maxNum,
    },
    dashboardAlignment: {
      note: 'Admin Dashboard Connections KPI = connected/total from MetricsService (canonical Active unique Karkuns / campaign pool).',
      expectedDashboardConnectionsLabel: `${connected}/${total}`,
      expectedProgressPct: progressPct,
      rawConnectionDocuments: assignments.length,
    },
    errors,
    warnings,
    recommendations:
      errors.length === 0
        ? [
            'Integrity scan clean — continue normal operations.',
            `Dashboard Connections should show ${connected}/${total} (${progressPct}%).`,
          ]
        : ['Review errors before approvals/transfers. Prefer archive over delete.'],
  }

  const dir = resolve('production-data/exports')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const out = resolve(dir, 'kc0058-production-integrity-scan.json')
  writeFileSync(out, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  console.log(`Wrote ${out}`)
  process.exitCode = report.summary.healthy ? 0 : 2
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
