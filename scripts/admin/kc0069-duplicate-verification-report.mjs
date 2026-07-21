#!/usr/bin/env node
/**
 * KC-0069 — Read-only duplicate verification + merge candidate report.
 *
 * Proves whether duplicate mobiles are distinct Firestore documents (Option A)
 * or a UI double-render (Option B). Never writes.
 *
 *   node scripts/admin/kc0069-duplicate-verification-report.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

function normalizeMobileKey(mobile) {
  const digits = String(mobile ?? '').replace(/\D/g, '')
  if (digits.length >= 10) return digits.slice(-10)
  return digits
}

function connectionStatusLabel(connections) {
  if (!connections.length) return 'No connection docs'
  if (connections.some((c) => c.status === 'Active')) return 'Connected (Active)'
  const latest = connections[0]
  return latest?.status ?? 'Unknown'
}

async function main() {
  const { db, projectId } = initFirebaseAdmin()
  const [karkunsSnap, connectionsSnap] = await Promise.all([
    db.collection('karkuns').get(),
    db.collection('connections').get(),
  ])

  const connectionsByKarkun = new Map()
  for (const doc of connectionsSnap.docs) {
    const data = doc.data()
    const karkunId = String(data.karkunId ?? '')
    if (!karkunId) continue
    const list = connectionsByKarkun.get(karkunId) ?? []
    list.push({
      assignmentId: doc.id,
      documentPath: `connections/${doc.id}`,
      status: data.status ?? null,
      assignmentNumber: data.assignmentNumber ?? null,
      ruknId: data.ruknId ?? null,
      endedDate: data.endedDate ?? null,
    })
    connectionsByKarkun.set(karkunId, list)
  }

  const byMobile = new Map()
  const verificationRows = []

  for (const doc of karkunsSnap.docs) {
    const data = doc.data()
    const mobileKey = normalizeMobileKey(data.mobile)
    const connections = connectionsByKarkun.get(doc.id) ?? []
    const row = {
      documentId: doc.id,
      karkunId: data.id || doc.id,
      name: data.name ?? '',
      mobile: data.mobile ?? '',
      mobileKey,
      documentPath: `karkuns/${doc.id}`,
      isArchived: Boolean(data.isArchived),
      assignedRuknId: data.assignedRuknId ?? '',
      connectionStatus: connectionStatusLabel(connections),
      connections,
      createdAt: data.createdAt ?? null,
    }
    verificationRows.push(row)
    if (!mobileKey || data.isArchived) continue
    const list = byMobile.get(mobileKey) ?? []
    list.push(row)
    byMobile.set(mobileKey, list)
  }

  const duplicateGroups = []
  const mergeCandidates = []

  for (const [mobileKey, members] of byMobile) {
    if (members.length < 2) continue
    duplicateGroups.push({
      mobileKey,
      count: members.length,
      members: members.map((m) => ({
        documentId: m.documentId,
        karkunId: m.karkunId,
        name: m.name,
        mobile: m.mobile,
        documentPath: m.documentPath,
        connectionStatus: m.connectionStatus,
        assignedRuknId: m.assignedRuknId,
        createdAt: m.createdAt,
      })),
      verdict: 'OPTION_A_DISTINCT_FIRESTORE_DOCUMENTS',
    })

    const connected = members.filter((m) =>
      m.connections.some((c) => c.status === 'Active'),
    )
    const disconnected = members.filter(
      (m) => !m.connections.some((c) => c.status === 'Active'),
    )
    const keep =
      connected[0] ??
      [...members].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))[0]
    const duplicates = members.filter((m) => m.documentId !== keep.documentId)

    mergeCandidates.push({
      mobileKey,
      original: {
        documentId: keep.documentId,
        karkunId: keep.karkunId,
        name: keep.name,
        mobile: keep.mobile,
        documentPath: keep.documentPath,
        connectionStatus: keep.connectionStatus,
      },
      duplicate: duplicates.map((d) => ({
        documentId: d.documentId,
        karkunId: d.karkunId,
        name: d.name,
        mobile: d.mobile,
        documentPath: d.documentPath,
        connectionStatus: d.connectionStatus,
      })),
      reason: 'Same normalized mobile on multiple karkuns/* documents',
      connectedRecord: connected.map((c) => c.documentId),
      disconnectedRecord: disconnected.map((d) => d.documentId),
      recommendation:
        connected.length === 1
          ? `Keep ${keep.documentId} (Active). Review/archive ${duplicates
              .map((d) => d.documentId)
              .join(', ')} after migrating any lingering refs. Manual admin decision only — no auto-delete.`
          : `Multiple or zero Active records for ${mobileKey}. Manual review required before any merge.`,
    })
  }

  const report = {
    ticket: 'KC-0069',
    generatedAt: new Date().toISOString(),
    projectId: projectId ?? null,
    readOnly: true,
    summary: {
      karkunDocuments: karkunsSnap.size,
      connectionDocuments: connectionsSnap.size,
      duplicateMobileGroups: duplicateGroups.length,
      mergeCandidates: mergeCandidates.length,
      verdict:
        duplicateGroups.length > 0
          ? 'DATABASE_ISSUE_DISTINCT_DOCUMENTS'
          : 'NO_DUPLICATE_MOBILE_DOCUMENTS',
    },
    highlightedExamples: mergeCandidates.filter((c) =>
      ['9741397389', '9606209716', '9738148593'].includes(c.mobileKey),
    ),
    duplicateGroups,
    mergeCandidates,
    note: 'No automatic merge or delete. Administrator decides.',
  }

  const dir = resolve('production-data/exports')
  mkdirSync(dir, { recursive: true })
  const path = resolve(
    dir,
    `kc0069-duplicate-verification-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ reportPath: path, summary: report.summary }, null, 2))
}

main().catch((error) => {
  console.error('[KC-0069] failed', error)
  process.exitCode = 1
})
