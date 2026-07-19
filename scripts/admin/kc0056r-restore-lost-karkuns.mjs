#!/usr/bin/env node
/**
 * KC-0056R — Restore Karkuns lost to pre-KC-0056 ID collision.
 *
 * Default (no payload): scans sources, writes a blocked/ready report, creates nothing.
 * With verified payload + --yes: creates new docs via free IDs (never overwrite).
 *
 * Usage:
 *   node scripts/admin/kc0056r-restore-lost-karkuns.mjs
 *   node scripts/admin/kc0056r-restore-lost-karkuns.mjs --payload production-data/exports/kc0056r-verified-payload.json --dry-run
 *   node scripts/admin/kc0056r-restore-lost-karkuns.mjs --payload production-data/exports/kc0056r-verified-payload.json --yes
 *
 * Payload shape:
 * {
 *   "people": [
 *     { "fullName": "Shamsheer Khan", "mobile": "9876543210", "gender": "Male", "area": "", "notes": "" }
 *   ]
 * }
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const DRY_RUN = process.argv.includes('--dry-run')
const AUTO_YES = process.argv.includes('--yes')
const EXPORT_DIR = resolve('production-data/exports')
const DEFAULT_PLACE = 'Bengaluru'

const VICTIMS = [
  'Shamsheer Khan',
  'Mehboob Pasha',
  'Mateen',
  'Mohsin Sir Chemistry',
  'Mohsin sir Chemistry',
  'Shahbaz Khan',
]

function argValue(flag) {
  const idx = process.argv.indexOf(flag)
  if (idx < 0 || idx + 1 >= process.argv.length) return null
  return process.argv[idx + 1]
}

function normalizeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function isVictimName(name) {
  const n = normalizeName(name)
  return VICTIMS.some((v) => {
    const vv = normalizeName(v)
    return n === vv || n.includes(vv) || vv.includes(n)
  })
}

function canonicalizeDisplayName(name) {
  const n = normalizeName(name)
  if (n.includes('shamsheer')) return 'Shamsheer Khan'
  if (n.includes('mehboob')) return 'Mehboob Pasha'
  if (n.includes('mateen')) return 'Mateen'
  if (n.includes('mohsin')) return 'Mohsin Sir Chemistry'
  if (n.includes('shahbaz')) return 'Shahbaz Khan'
  return String(name || '').trim()
}

function parseKarkunNum(id) {
  const match = /^kr-(\d+)$/i.exec(String(id || '').trim())
  if (!match) return null
  const num = Number.parseInt(match[1], 10)
  return Number.isFinite(num) && num > 0 ? num : null
}

function formatKarkunId(num) {
  return `kr-${String(num).padStart(3, '0')}`
}

function normalizeMobile(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '')
  if (digits.length >= 10) return digits.slice(-10)
  return digits
}

function isValidMobile(mobile) {
  return /^[6-9]\d{9}$/.test(normalizeMobile(mobile))
}

async function loadSources(db) {
  const [karkunsSnap, counterSnap, logsSnap, ruknSnap] = await Promise.all([
    db.collection('karkuns').get(),
    db.collection('settings').doc('karkunCounter').get(),
    db.collection('activityLogs').get(),
    db.collection('rukns').doc('R046').get(),
  ])

  const karkunsById = new Map()
  const byName = new Map()
  let maxNum = 0
  for (const doc of karkunsSnap.docs) {
    const data = doc.data()
    const record = { id: doc.id, ...data }
    karkunsById.set(doc.id, record)
    const key = normalizeName(data.name)
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key).push(record)
    const num = parseKarkunNum(doc.id)
    if (num != null && num > maxNum) maxNum = num
  }

  const activity = []
  for (const doc of logsSnap.docs) {
    const data = doc.data()
    if (!isVictimName(data.message)) continue
    activity.push({ id: doc.id, ...data })
  }
  activity.sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')))

  return {
    karkunsById,
    byName,
    maxNum,
    counter: counterSnap.exists ? Number(counterSnap.data()?.nextKarkunNum ?? 1) : 1,
    activity,
    rukn: ruknSnap.exists ? { id: 'R046', ...ruknSnap.data() } : null,
  }
}

function buildRecoveryPlan(sources, payloadPeople) {
  const payloadByName = new Map()
  for (const person of payloadPeople || []) {
    payloadByName.set(normalizeName(canonicalizeDisplayName(person.fullName)), person)
  }

  const canonicalVictims = [
    'Shamsheer Khan',
    'Mehboob Pasha',
    'Mateen',
    'Mohsin Sir Chemistry',
    'Shahbaz Khan',
  ]

  return canonicalVictims.map((fullName) => {
    const key = normalizeName(fullName)
    const existing = sources.byName.get(key) || []
    const relatedActivity = sources.activity.filter((a) =>
      normalizeName(a.message || '').includes(key.split(' ')[0]),
    )
    const approval = relatedActivity.find((a) => /Approved new Karkun/i.test(a.message || ''))
    const submission = relatedActivity.find((a) => /request submitted/i.test(a.message || ''))
    const payload = payloadByName.get(key) || null

    const recovered = {
      fullName,
      requestingRuknId: approval?.ruknId || submission?.ruknId || 'R046',
      requestingRuknName: sources.rukn?.name || 'Asadulla Khan Zaki',
      requestingRuknGender: sources.rukn?.gender || null,
      submittedAt: submission?.timestamp || null,
      approvedAt: approval?.timestamp || null,
      claimedCollisionIds: relatedActivity
        .map((a) => a.karkunId)
        .filter(Boolean)
        .filter((id, i, arr) => arr.indexOf(id) === i),
      mobile: payload?.mobile ? normalizeMobile(payload.mobile) : null,
      gender: payload?.gender || null,
      area: payload?.area?.trim?.() || '',
      notes: payload?.notes?.trim?.() || '',
    }

    const missing = []
    if (!recovered.mobile || !isValidMobile(recovered.mobile)) missing.push('mobile')
    if (recovered.gender !== 'Male' && recovered.gender !== 'Female') missing.push('gender')

    let status = 'blocked_missing_fields'
    let reason =
      'Mandatory fields missing from durable logs/request store. Do not guess — supply verified payload.'

    if (existing.length > 0) {
      status = 'already_present'
      reason = 'Unique Karkun already exists — skip create.'
    } else if (missing.length === 0) {
      status = 'ready_to_restore'
      reason = 'Verified payload supplies mandatory fields.'
    }

    // Gender may be inferred from Rukn invariant, but still require explicit payload gender
    // to avoid silent guessing (KC-0056R rules).
    const fieldsRequiringManualConfirmation = [...missing]
    if (!payload) {
      fieldsRequiringManualConfirmation.push(
        ...['mobile', 'gender', 'area'].filter((f) => !fieldsRequiringManualConfirmation.includes(f)),
      )
    }

    return {
      fullName,
      status,
      reason,
      missingMandatoryFields: missing,
      fieldsRequiringManualConfirmation: [...new Set(fieldsRequiringManualConfirmation)],
      recoveredMetadata: recovered,
      existingMatches: existing.map((k) => ({ id: k.id, name: k.name, mobile: k.mobile })),
      relatedActivity: relatedActivity.map((a) => ({
        id: a.id,
        timestamp: a.timestamp,
        message: a.message,
        karkunId: a.karkunId || null,
      })),
    }
  })
}

async function allocateFreeId(db, occupied, startNum) {
  let candidate = startNum
  for (let i = 0; i < 10_000; i += 1) {
    const id = formatKarkunId(candidate)
    if (!occupied.has(id)) {
      const snap = await db.collection('karkuns').doc(id).get()
      if (!snap.exists) {
        return { id, num: candidate }
      }
    }
    console.warn(`[KC-0056R] collision avoided: ${id}`)
    candidate += 1
  }
  throw new Error('Could not allocate a free Karkun ID')
}

async function restoreOne(db, plan, occupied, nextNum, dryRun) {
  const now = new Date().toISOString()
  const meta = plan.recoveredMetadata
  const allocation = await allocateFreeId(db, occupied, nextNum)
  const id = allocation.id

  const record = {
    id,
    name: meta.fullName,
    gender: meta.gender,
    mobile: meta.mobile,
    place: DEFAULT_PLACE,
    status: 'active',
    createdAt: meta.submittedAt || now,
    updatedAt: now,
    updatedBy: 'KC-0056R Restoration',
    address: '',
    area: meta.area || '',
    assignedRukn: '',
    assignedRuknId: '',
    assignmentStatus: 'Available',
    campaignStatus: 'not_assigned',
    visitStatus: 'none',
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes:
      meta.notes ||
      `Restored by KC-0056R after ID-collision loss. Original collision IDs: ${(meta.claimedCollisionIds || []).join(', ') || 'n/a'}. Requesting Rukn: ${meta.requestingRuknId}.`,
    isArchived: false,
    restoration: {
      ticket: 'KC-0056R',
      restoredAt: now,
      requestingRuknId: meta.requestingRuknId,
      claimedCollisionIds: meta.claimedCollisionIds || [],
      submittedAt: meta.submittedAt,
      approvedAt: meta.approvedAt,
    },
  }

  const activityId = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const activity = {
    id: activityId,
    type: 'complete',
    message: `KC-0056R restored Karkun ${meta.fullName} as ${id} (ID-collision recovery).`,
    karkunId: id,
    ruknId: meta.requestingRuknId,
    actor: 'Administrator',
    timestamp: now,
    severity: 'INFO',
  }

  if (!dryRun) {
    const existing = await db.collection('karkuns').doc(id).get()
    if (existing.exists) {
      throw new Error(`Refusing overwrite of existing ${id}`)
    }
    await db.collection('karkuns').doc(id).create(record)
    await db.collection('activityLogs').doc(activityId).set(activity)
    occupied.add(id)
  }

  return {
    fullName: meta.fullName,
    status: dryRun ? 'dry_run_would_restore' : 'restored',
    newKarkunId: id,
    activityId,
    recordPreview: {
      name: record.name,
      mobile: record.mobile,
      gender: record.gender,
      area: record.area,
    },
  }
}

async function main() {
  const payloadPath = argValue('--payload')
  let payloadPeople = []
  if (payloadPath) {
    const abs = resolve(payloadPath)
    if (!existsSync(abs)) throw new Error(`Payload not found: ${abs}`)
    const parsed = JSON.parse(readFileSync(abs, 'utf8'))
    payloadPeople = Array.isArray(parsed.people) ? parsed.people : []
  }

  if (payloadPeople.length > 0 && !DRY_RUN && !AUTO_YES) {
    throw new Error('Pass --dry-run or --yes when providing --payload')
  }

  const { db, projectId } = initFirebaseAdmin()
  const sources = await loadSources(db)
  const plan = buildRecoveryPlan(sources, payloadPeople)

  const occupied = new Set(sources.karkunsById.keys())
  let nextNum = Math.max(sources.counter || 1, sources.maxNum + 1)

  const results = []
  for (const item of plan) {
    if (item.status === 'already_present') {
      results.push({
        fullName: item.fullName,
        status: 'already_present',
        newKarkunId: item.existingMatches[0]?.id || null,
        fieldsRequiringManualConfirmation: [],
      })
      continue
    }
    if (item.status !== 'ready_to_restore') {
      results.push({
        fullName: item.fullName,
        status: item.status,
        newKarkunId: null,
        missingMandatoryFields: item.missingMandatoryFields,
        fieldsRequiringManualConfirmation: item.fieldsRequiringManualConfirmation,
        reason: item.reason,
        recoveredMetadata: {
          requestingRuknId: item.recoveredMetadata.requestingRuknId,
          submittedAt: item.recoveredMetadata.submittedAt,
          approvedAt: item.recoveredMetadata.approvedAt,
          claimedCollisionIds: item.recoveredMetadata.claimedCollisionIds,
          requestingRuknGender: item.recoveredMetadata.requestingRuknGender,
        },
      })
      continue
    }

    const write = AUTO_YES && !DRY_RUN
    const restored = await restoreOne(db, item, occupied, nextNum, !write)
    const usedNum = parseKarkunNum(restored.newKarkunId)
    if (usedNum != null) nextNum = usedNum + 1
    results.push({
      ...restored,
      fieldsRequiringManualConfirmation: item.fieldsRequiringManualConfirmation.filter(
        (f) => f === 'area',
      ),
    })
  }

  // Heal counter if any restores applied
  const applied = results.filter((r) => r.status === 'restored')
  if (applied.length > 0 && !DRY_RUN) {
    const maxAfter = Math.max(
      sources.maxNum,
      ...applied.map((r) => parseKarkunNum(r.newKarkunId) || 0),
    )
    await db.collection('settings').doc('karkunCounter').set(
      { nextKarkunNum: maxAfter + 1 },
      { merge: true },
    )
  }

  // Verify registry presence for restored IDs
  for (const row of results) {
    if (row.status !== 'restored' || !row.newKarkunId) continue
    const snap = await db.collection('karkuns').doc(row.newKarkunId).get()
    row.registryVerified = snap.exists && normalizeName(snap.data()?.name) === normalizeName(row.fullName)
  }

  const report = {
    ticket: 'KC-0056R',
    projectId,
    generatedAt: new Date().toISOString(),
    dryRun: DRY_RUN || applied.length === 0,
    payloadProvided: Boolean(payloadPath),
    summary: {
      restored: results.filter((r) => r.status === 'restored').length,
      dryRunWouldRestore: results.filter((r) => r.status === 'dry_run_would_restore').length,
      alreadyPresent: results.filter((r) => r.status === 'already_present').length,
      blockedMissingFields: results.filter((r) => r.status === 'blocked_missing_fields').length,
    },
    results,
    plan,
    note:
      'Durable activity/request sources do not contain mobile numbers for these approvals. Restoration requires a verified --payload with mobile + gender.',
  }

  if (!existsSync(EXPORT_DIR)) mkdirSync(EXPORT_DIR, { recursive: true })
  const outPath = resolve(EXPORT_DIR, 'kc0056r-restoration-report.json')
  writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  console.log(`Wrote ${outPath}`)

  if (report.summary.blockedMissingFields > 0 && report.summary.restored === 0) {
    console.error(
      '\nKC-0056R stopped: mandatory fields missing. Provide verified payload before restore.',
    )
    process.exitCode = 2
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
