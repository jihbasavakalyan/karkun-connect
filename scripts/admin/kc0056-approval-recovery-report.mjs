#!/usr/bin/env node
/**
 * KC-0056 — Recovery report for approvals affected by ID reuse.
 * Does NOT recreate Karkun records automatically.
 *
 * Usage:
 *   node scripts/admin/kc0056-approval-recovery-report.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const EXPORT_DIR = resolve('production-data/exports')

const KNOWN_VICTIMS = [
  'Shamsheer Khan',
  'Mehboob Pasha',
  'Mateen',
  'Mohsin Sir Chemistry',
  'Mohsin sir Chemistry',
  'Shahbaz Khan',
]

function normalizeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function isKnownVictim(name) {
  const n = normalizeName(name)
  return KNOWN_VICTIMS.some((victim) => {
    const v = normalizeName(victim)
    return n === v || n.includes(v) || v.includes(n)
  })
}

function extractClaimedId(message) {
  const match = /\((kr-\d+)\)/i.exec(String(message || ''))
  return match ? match[1].toLowerCase() : null
}

async function main() {
  const { db, projectId } = initFirebaseAdmin()

  const [karkunsSnap, requestsSnap, counterSnap, logsSnap] = await Promise.all([
    db.collection('karkuns').get(),
    db.collection('settings').doc('karkunRequests').get(),
    db.collection('settings').doc('karkunCounter').get(),
    db.collection('activityLogs').get(),
  ])

  const karkunsById = new Map()
  const karkunsByName = new Map()
  let maxNum = 0
  for (const doc of karkunsSnap.docs) {
    const data = doc.data()
    const record = { id: doc.id, ...data }
    karkunsById.set(doc.id, record)
    const key = normalizeName(data.name)
    if (!karkunsByName.has(key)) karkunsByName.set(key, [])
    karkunsByName.get(key).push(record)
    const num = Number.parseInt(String(doc.id).replace(/^kr-/i, ''), 10)
    if (Number.isFinite(num) && num > maxNum) maxNum = num
  }

  const requests = requestsSnap.exists ? requestsSnap.data()?.requests ?? [] : []
  const counter = counterSnap.exists ? Number(counterSnap.data()?.nextKarkunNum ?? null) : null

  const approvalLogs = []
  for (const doc of logsSnap.docs) {
    const data = doc.data()
    const message = String(data.message || '')
    if (!/Approved new Karkun/i.test(message)) continue
    const nameMatch = /Approved new Karkun (.+?) \(kr-/i.exec(message)
    const fullName = nameMatch ? nameMatch[1].trim() : null
    approvalLogs.push({
      id: doc.id,
      timestamp: data.timestamp ?? data.createdAt ?? null,
      message,
      fullName,
      claimedKarkunId: extractClaimedId(message) || data.karkunId || null,
      karkunIdField: data.karkunId ?? null,
      ruknId: data.ruknId ?? null,
      assignmentId: data.assignmentId ?? null,
      actor: data.actor ?? null,
    })
  }
  approvalLogs.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))

  const victimApprovals = approvalLogs.filter(
    (log) => log.fullName && isKnownVictim(log.fullName),
  )

  const cases = []
  const seenNames = new Set()

  for (const log of victimApprovals) {
    const key = normalizeName(log.fullName)
    if (seenNames.has(key)) {
      // Keep duplicate approve attempts as relatedEvidence on first case.
      const existing = cases.find((item) => normalizeName(item.fullName) === key)
      if (existing) {
        existing.relatedApprovals.push(log)
      }
      continue
    }
    seenNames.add(key)

    const matches = karkunsByName.get(key) ?? []
    const claimed = log.claimedKarkunId ? karkunsById.get(log.claimedKarkunId) : null
    const claimedBelongsToRequest =
      claimed && normalizeName(claimed.name) === key

    const requestRow = (Array.isArray(requests) ? requests : []).find(
      (row) => normalizeName(row.fullName) === key,
    )

    let recoveryStatus = 'manual_review_required'
    let recommendation = 'Insufficient durable request payload to auto-recreate safely.'

    if (matches.length > 0) {
      recoveryStatus = 'already_present'
      recommendation = 'Unique Karkun record exists — no recreate needed.'
    } else if (claimed && !claimedBelongsToRequest) {
      recoveryStatus = 'id_reuse_collision'
      recommendation =
        'Approval claimed an occupied ID. Do not overwrite. Recreate under a new free ID after collecting mobile/gender/area from Rukn.'
    }

    cases.push({
      fullName: log.fullName,
      recoveryStatus,
      recommendation,
      approval: log,
      relatedApprovals: [],
      requestStillInStore: Boolean(requestRow),
      requestRow: requestRow ?? null,
      uniqueKarkunExists: matches.length > 0,
      matchingKarkuns: matches.map((k) => ({ id: k.id, name: k.name, mobile: k.mobile })),
      claimedIdOwner: claimed
        ? { id: claimed.id, name: claimed.name, mobile: claimed.mobile }
        : null,
      claimedIdBelongsToRequest: Boolean(claimedBelongsToRequest),
      autoRecreate: false,
      reasonNotAutoRecreated:
        matches.length > 0
          ? 'Record already exists'
          : 'Request row missing or incomplete; preserve audit history and recreate manually with verified contact details',
    })
  }

  // Also flag known victims with no approval log match (name variants).
  for (const victim of [
    'Shamsheer Khan',
    'Mehboob Pasha',
    'Mateen',
    'Mohsin Sir Chemistry',
    'Shahbaz Khan',
  ]) {
    const key = normalizeName(victim)
    if (seenNames.has(key)) continue
    const fuzzy = approvalLogs.filter((log) => log.fullName && isKnownVictim(log.fullName))
    const matches = karkunsByName.get(key) ?? []
    cases.push({
      fullName: victim,
      recoveryStatus: matches.length > 0 ? 'already_present' : 'manual_review_required',
      recommendation:
        matches.length > 0
          ? 'Unique Karkun record exists — no recreate needed.'
          : 'No durable approval/request payload found for exact name. Review activityLogs and Rukn for contact details before recreate.',
      approval: null,
      relatedApprovals: fuzzy.filter((log) => normalizeName(log.fullName).includes(key.split(' ')[0])),
      requestStillInStore: false,
      requestRow: null,
      uniqueKarkunExists: matches.length > 0,
      matchingKarkuns: matches.map((k) => ({ id: k.id, name: k.name, mobile: k.mobile })),
      claimedIdOwner: null,
      claimedIdBelongsToRequest: false,
      autoRecreate: false,
      reasonNotAutoRecreated: 'Insufficient information for safe automatic recreate',
    })
  }

  const report = {
    ticket: 'KC-0056',
    projectId,
    generatedAt: new Date().toISOString(),
    counter: {
      nextKarkunNum: counter,
      maxExistingKarkunNum: maxNum,
      expectedNextKarkunNum: maxNum + 1,
      lagging: counter != null && counter <= maxNum,
    },
    requestStoreCount: Array.isArray(requests) ? requests.length : 0,
    approvalLogCount: approvalLogs.length,
    cases,
    constraints: {
      autoRecreate: false,
      preserveExistingKarkuns: true,
      preserveAuditHistory: true,
    },
  }

  if (!existsSync(EXPORT_DIR)) mkdirSync(EXPORT_DIR, { recursive: true })
  const outPath = resolve(EXPORT_DIR, `kc0056-approval-recovery-report.json`)
  writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  console.log(`Wrote ${outPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
