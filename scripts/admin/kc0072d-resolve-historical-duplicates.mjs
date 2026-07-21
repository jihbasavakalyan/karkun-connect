#!/usr/bin/env node
/**
 * KC-0072D — Controlled historical duplicate resolution (soft-archive only).
 *
 * Processes ONLY the three verified pairs from KC-0072A/B.
 * Never deletes. Never touches Connected masters or Active connections.
 * Archive field conventions match src/services/duplicateResolutionService.ts (KC-0070).
 *
 *   node scripts/admin/kc0072d-resolve-historical-duplicates.mjs --dry-run
 *   node scripts/admin/kc0072d-resolve-historical-duplicates.mjs --apply
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const apply = process.argv.includes('--apply')
const dryRun = !apply

/** Hard-coded verified pairs only — no generic scan. */
const PAIRS = [
  { connectedId: 'kr-495', duplicateId: 'kr-494', expectedMobile: '9606209716', expectedName: 'Bismilla' },
  { connectedId: 'kr-497', duplicateId: 'kr-496', expectedMobile: '9738148593', expectedName: 'Shaik Haji' },
  { connectedId: 'kr-504', duplicateId: 'kr-503', expectedMobile: '9741397389', expectedName: 'Azhar Artist' },
]

const RESOLVED_BY = 'KC-0072D'
const REPORT_DIR = resolve('production-data/exports')

function normalizeMobileKey(mobile) {
  const digits = String(mobile ?? '').replace(/\D/g, '')
  if (digits.length >= 10) return digits.slice(-10)
  return digits
}

function normalizeName(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function bumpVersion(current) {
  const n = typeof current === 'number' && Number.isFinite(current) ? current : 0
  return n + 1
}

async function loadKarkun(db, id) {
  const snap = await db.collection('karkuns').doc(id).get()
  if (!snap.exists) return null
  return { id: snap.id, ...snap.data() }
}

async function connectionSummary(db, karkunId) {
  const snap = await db.collection('connections').where('karkunId', '==', karkunId).get()
  const docs = snap.docs.map((d) => ({ id: d.id, status: d.data().status ?? null }))
  return {
    count: docs.length,
    activeCount: docs.filter((d) => d.status === 'Active').length,
    statuses: docs.map((d) => d.status),
    docs,
  }
}

/**
 * Safety rules from KC-0072D — ALL must pass or the pair is skipped.
 */
function verifyPair(connected, duplicate, connectedConns, duplicateConns, expected) {
  const failures = []

  if (!connected) failures.push('Connected document missing')
  if (!duplicate) failures.push('Duplicate document missing')
  if (failures.length) return { ok: false, failures }

  if (connected.isArchived) failures.push('Connected record is already archived')
  if (duplicate.isArchived) failures.push('Duplicate record is already archived')

  const cMobile = normalizeMobileKey(connected.mobile)
  const dMobile = normalizeMobileKey(duplicate.mobile)
  if (!cMobile || cMobile !== dMobile) {
    failures.push(`Mobile mismatch: connected=${connected.mobile} duplicate=${duplicate.mobile}`)
  }
  if (expected.expectedMobile && cMobile !== normalizeMobileKey(expected.expectedMobile)) {
    failures.push(`Connected mobile does not match expected ${expected.expectedMobile}`)
  }

  if (normalizeName(connected.name) !== normalizeName(duplicate.name)) {
    failures.push(`Name mismatch: connected=${connected.name} duplicate=${duplicate.name}`)
  }
  if (
    expected.expectedName &&
    normalizeName(connected.name) !== normalizeName(expected.expectedName)
  ) {
    failures.push(`Connected name does not match expected ${expected.expectedName}`)
  }

  if (connectedConns.activeCount !== 1) {
    failures.push(`Connected record must have exactly 1 Active connection (has ${connectedConns.activeCount})`)
  }
  if (duplicateConns.activeCount !== 0) {
    failures.push(`Duplicate must have 0 Active connections (has ${duplicateConns.activeCount})`)
  }

  // Exactly one Available / Not Connected orphan (no Active).
  const orphanAvailable =
    !duplicate.isArchived &&
    duplicateConns.activeCount === 0 &&
    (duplicate.assignmentStatus === 'Available' || !duplicate.assignedRuknId)
  if (!orphanAvailable) {
    failures.push('Duplicate is not in Available / Not Connected state')
  }

  return { ok: failures.length === 0, failures }
}

function buildArchivePayload(duplicate, masterId, at) {
  const reason = `KC-0072D historical duplicate resolution: keep ${masterId}, archive ${duplicate.id}`
  const priorNotes = typeof duplicate.notes === 'string' ? duplicate.notes.trim() : ''
  return {
    isArchived: true,
    archivedAt: at,
    archivedBy: RESOLVED_BY,
    status: 'inactive',
    archiveKind: 'duplicate_merge',
    mergedInto: masterId,
    mergedBy: RESOLVED_BY,
    mergedAt: at,
    mergeReason: reason,
    originalDocumentId: duplicate.id,
    updatedAt: at,
    updatedBy: RESOLVED_BY,
    version: bumpVersion(duplicate.version),
    notes: [priorNotes, `[Archived Duplicate → ${masterId}] ${reason}`].filter(Boolean).join('\n'),
  }
}

async function countMetrics(db) {
  const [karkunsSnap, connectionsSnap] = await Promise.all([
    db.collection('karkuns').get(),
    db.collection('connections').get(),
  ])

  const byMobile = new Map()
  let archived = 0
  let activeDocs = 0
  for (const doc of karkunsSnap.docs) {
    const data = doc.data()
    if (data.isArchived) {
      archived += 1
      continue
    }
    activeDocs += 1
    const key = normalizeMobileKey(data.mobile)
    if (!key) continue
    const list = byMobile.get(key) ?? []
    list.push(doc.id)
    byMobile.set(key, list)
  }

  const duplicateMobileGroups = [...byMobile.entries()].filter(([, ids]) => ids.length > 1)
  const activeConnections = connectionsSnap.docs.filter((d) => d.data().status === 'Active').length

  return {
    totalKarkunDocuments: karkunsSnap.size,
    activeKarkunDocuments: activeDocs,
    archivedKarkunDocuments: archived,
    uniqueActiveMobiles: byMobile.size,
    duplicateMobileGroups: duplicateMobileGroups.length,
    duplicateMobileGroupDetails: duplicateMobileGroups.map(([mobile, ids]) => ({ mobile, ids })),
    connectionDocuments: connectionsSnap.size,
    activeConnections,
  }
}

async function main() {
  const { db, projectId } = initFirebaseAdmin()
  const at = new Date().toISOString()
  const pairResults = []

  for (const pair of PAIRS) {
    const connected = await loadKarkun(db, pair.connectedId)
    const duplicate = await loadKarkun(db, pair.duplicateId)
    const connectedConns = await connectionSummary(db, pair.connectedId)
    const duplicateConns = await connectionSummary(db, pair.duplicateId)
    const verification = verifyPair(connected, duplicate, connectedConns, duplicateConns, pair)

    const base = {
      connectedId: pair.connectedId,
      duplicateId: pair.duplicateId,
      mobile: connected?.mobile ?? duplicate?.mobile ?? pair.expectedMobile,
      name: connected?.name ?? duplicate?.name ?? pair.expectedName,
      verificationPassed: verification.ok,
      failures: verification.failures,
      timestamp: at,
      connectedActiveConnections: connectedConns.activeCount,
      duplicateActiveConnections: duplicateConns.activeCount,
    }

    if (!verification.ok) {
      pairResults.push({
        ...base,
        action: 'SKIPPED',
        reason: verification.failures.join('; '),
      })
      continue
    }

    const payload = buildArchivePayload(duplicate, pair.connectedId, at)

    if (dryRun) {
      pairResults.push({
        ...base,
        action: 'DRY_RUN_WOULD_ARCHIVE',
        archivedId: pair.duplicateId,
        preservedId: pair.connectedId,
        archivePayloadPreview: payload,
      })
      continue
    }

    await db.collection('karkuns').doc(pair.duplicateId).set(payload, { merge: true })

    // Audit activity (does not alter connections or master).
    const activityId = `activity-${Date.now()}-kc0072d-${pair.duplicateId}`
    await db.collection('activityLogs').doc(activityId).set({
      id: activityId,
      type: 'complete',
      severity: 'IMPORTANT',
      message: `KC-0072D Duplicate Merge: archived ${duplicate.name} (${pair.duplicateId}) into master ${pair.connectedId}.`,
      karkunId: pair.connectedId,
      actor: RESOLVED_BY,
      timestamp: at,
    })

    pairResults.push({
      ...base,
      action: 'ARCHIVED_DUPLICATE',
      archivedId: pair.duplicateId,
      preservedId: pair.connectedId,
      activityLogId: activityId,
    })
  }

  const metrics = await countMetrics(db)
  const report = {
    ticket: 'KC-0072D',
    generatedAt: at,
    projectId: projectId ?? null,
    mode: dryRun ? 'dry-run' : 'apply',
    readOnly: dryRun,
    pairsProcessed: PAIRS.length,
    archived: pairResults.filter((r) => r.action === 'ARCHIVED_DUPLICATE').length,
    skipped: pairResults.filter((r) => r.action === 'SKIPPED').length,
    dryRunWouldArchive: pairResults.filter((r) => r.action === 'DRY_RUN_WOULD_ARCHIVE').length,
    pairs: pairResults,
    postValidation: metrics,
    note: 'Soft-archive only (archiveKind=duplicate_merge). Connected karkuns and Active connections untouched.',
  }

  mkdirSync(REPORT_DIR, { recursive: true })
  const reportPath = resolve(
    REPORT_DIR,
    `kc0072d-historical-duplicate-resolution-${dryRun ? 'dry-run' : 'apply'}-${at.replace(/[:.]/g, '-')}.json`,
  )
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ reportPath, summary: {
    mode: report.mode,
    archived: report.archived,
    skipped: report.skipped,
    dryRunWouldArchive: report.dryRunWouldArchive,
    postValidation: metrics,
  } }, null, 2))
}

main().catch((error) => {
  console.error('[KC-0072D] failed', error)
  process.exitCode = 1
})
