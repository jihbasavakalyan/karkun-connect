#!/usr/bin/env node
/**
 * KC-0061 Phase B — Full connections ASN integrity audit (complete scan, no sampling).
 */
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function parseAssignmentNumber(assignmentNumber) {
  const match = String(assignmentNumber ?? '')
    .trim()
    .match(/^ASN-(\d+)$/i)
  if (!match) return null
  const value = Number.parseInt(match[1], 10)
  return Number.isFinite(value) ? value : null
}

function formatAsn(n) {
  return `ASN-${String(n).padStart(6, '0')}`
}

/** Same algorithm as src/lib/connections/assignmentNumber.ts */
function findAssignmentNumberCollisions(records) {
  const byNumber = new Map()
  for (const record of records) {
    const number = record.assignmentNumber?.trim().toUpperCase()
    if (!number) continue
    const list = byNumber.get(number) ?? []
    list.push(record.assignmentId)
    byNumber.set(number, list)
  }
  return [...byNumber.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([assignmentNumber, assignmentIds]) => ({ assignmentNumber, assignmentIds }))
    .sort((a, b) => a.assignmentNumber.localeCompare(b.assignmentNumber))
}

function assertUniqueAssignmentNumbers(records) {
  const collisions = findAssignmentNumberCollisions(records)
  if (collisions.length === 0) return { ok: true, collisions: [] }
  const detail = collisions
    .map((item) => `${item.assignmentNumber}=[${item.assignmentIds.join(',')}]`)
    .join('; ')
  return {
    ok: false,
    collisions,
    error: `Duplicate assignment numbers detected: ${detail}`,
  }
}

const { db } = await initFirebaseAdmin()

console.error('Scanning ALL connections documents...')
const snap = await db.collection('connections').get()
const docs = snap.docs.map((d) => ({ docId: d.id, path: d.ref.path, ...d.data() }))

const metaSnap = await db.collection('settings').doc('connectionMeta').get()
const meta = metaSnap.exists ? metaSnap.data() : null
const nextSequence = Number(meta?.nextSequence)

console.error(`Loaded ${docs.length} connections. Loading people for orphan checks...`)
const [karkunsSnap, ruknsSnap] = await Promise.all([
  db.collection('karkuns').get(),
  db.collection('rukns').get(),
])
const karkunIds = new Set(karkunsSnap.docs.map((d) => d.id))
const ruknIds = new Set(ruknsSnap.docs.map((d) => d.id))

const records = docs.map((d) => ({
  assignmentId: d.assignmentId ?? d.docId,
  assignmentNumber: d.assignmentNumber ?? '',
  karkunId: d.karkunId ?? '',
  ruknId: d.ruknId ?? '',
  status: d.status ?? '',
}))

const assertResult = assertUniqueAssignmentNumbers(records)
const collisions = assertResult.collisions

const usedNumeric = new Set()
const emptyAsn = []
const invalidAsn = []
let highestAsn = 0

for (const r of records) {
  const raw = String(r.assignmentNumber || '').trim()
  if (!raw) {
    emptyAsn.push(r.assignmentId)
    continue
  }
  const n = parseAssignmentNumber(raw)
  if (n === null) {
    invalidAsn.push({ assignmentId: r.assignmentId, assignmentNumber: raw })
    continue
  }
  highestAsn = Math.max(highestAsn, n)
  usedNumeric.add(n)
}

const missing = []
for (let i = 1; i <= highestAsn; i += 1) {
  if (!usedNumeric.has(i)) missing.push(formatAsn(i))
}

const orphanMissingKarkun = []
const orphanMissingRukn = []
const idMismatch = []
const seenIds = new Map()
const duplicateAssignmentIds = []

for (const d of docs) {
  const aid = d.assignmentId ?? d.docId
  seenIds.set(aid, (seenIds.get(aid) ?? 0) + 1)
  if (d.docId !== aid) {
    idMismatch.push({ docId: d.docId, assignmentId: d.assignmentId ?? null })
  }
  if (d.karkunId && !karkunIds.has(d.karkunId)) {
    orphanMissingKarkun.push({
      assignmentId: aid,
      karkunId: d.karkunId,
      asn: d.assignmentNumber ?? null,
    })
  }
  if (d.ruknId && !ruknIds.has(d.ruknId)) {
    orphanMissingRukn.push({
      assignmentId: aid,
      ruknId: d.ruknId,
      asn: d.assignmentNumber ?? null,
    })
  }
}
for (const [id, count] of seenIds) {
  if (count > 1) duplicateAssignmentIds.push({ assignmentId: id, count })
}

const report = {
  scannedAt: new Date().toISOString(),
  collection: 'connections',
  scanMode: 'complete',
  totalConnections: docs.length,
  highestASN: highestAsn > 0 ? formatAsn(highestAsn) : null,
  highestAsnNumeric: highestAsn,
  nextSequence: Number.isFinite(nextSequence) ? nextSequence : null,
  nextSequenceGtHighest: Number.isFinite(nextSequence) ? nextSequence > highestAsn : null,
  duplicateAsnCount: collisions.length,
  duplicateAsns: collisions,
  missingAsnCount: missing.length,
  missingAsns: missing,
  emptyAsnCount: emptyAsn.length,
  emptyAsnAssignmentIds: emptyAsn,
  invalidAsnCount: invalidAsn.length,
  invalidAsns: invalidAsn,
  orphanedAssignmentIds: {
    missingKarkunCount: orphanMissingKarkun.length,
    missingKarkun: orphanMissingKarkun,
    missingRuknCount: orphanMissingRukn.length,
    missingRukn: orphanMissingRukn,
    docIdMismatchCount: idMismatch.length,
    docIdMismatch: idMismatch,
    duplicateAssignmentIdCount: duplicateAssignmentIds.length,
    duplicateAssignmentIds,
  },
  assertUniqueAssignmentNumbers: {
    passes: assertResult.ok,
    error: assertResult.error ?? null,
    algorithm: 'src/lib/connections/assignmentNumber.ts assertUniqueAssignmentNumbers',
  },
  connectionMeta: meta,
}

const outPath = resolve(ROOT, 'production-data/exports/kc0061-phaseb-full-integrity-audit.json')
writeFileSync(outPath, JSON.stringify(report, null, 2))

console.log(
  JSON.stringify(
    {
      totalConnections: report.totalConnections,
      highestASN: report.highestASN,
      nextSequence: report.nextSequence,
      nextSequenceGtHighest: report.nextSequenceGtHighest,
      duplicateAsnCount: report.duplicateAsnCount,
      missingAsnCount: report.missingAsnCount,
      emptyAsnCount: report.emptyAsnCount,
      invalidAsnCount: report.invalidAsnCount,
      orphaned: {
        missingKarkun: report.orphanedAssignmentIds.missingKarkunCount,
        missingRukn: report.orphanedAssignmentIds.missingRuknCount,
        docIdMismatch: report.orphanedAssignmentIds.docIdMismatchCount,
        duplicateAssignmentIds: report.orphanedAssignmentIds.duplicateAssignmentIdCount,
      },
      assertUniqueAssignmentNumbersPasses: report.assertUniqueAssignmentNumbers.passes,
      assertError: report.assertUniqueAssignmentNumbers.error,
      duplicateAsns: report.duplicateAsns,
      missingAsns: report.missingAsns,
      wrote: outPath,
    },
    null,
    2,
  ),
)
