#!/usr/bin/env node
/**
 * KC-0100.2 — Rukn custom-claims audit + idempotent reconciliation.
 *
 * Compares Active Rukn Master (Firestore) → Firebase Auth → custom claims
 * and repairs only missing/incorrect Rukn claims. Does not create Auth users,
 * does not touch administrators, and does not change KC-0100 login logic.
 *
 * Usage:
 *   node scripts/admin/kc0100-reconcile-rukn-claims.mjs --audit
 *   node scripts/admin/kc0100-reconcile-rukn-claims.mjs --dry-run
 *   node scripts/admin/kc0100-reconcile-rukn-claims.mjs --yes
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const EXPORT_DIR = resolve(ROOT, 'production-data/exports')

function normalizePhone(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

function toE164(digits10) {
  return `+91${digits10}`
}

function parseArgs(argv) {
  const auditOnly = argv.includes('--audit')
  const dryRun = argv.includes('--dry-run') || auditOnly
  const yes = argv.includes('--yes')
  return { auditOnly, dryRun, yes }
}

async function loadActiveRukns(db) {
  const snap = await db.collection('rukns').get()
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((r) => r.status === 'active' && !r.isArchived && String(r.mobile ?? '').trim())
}

async function listAllUsers(auth) {
  const users = []
  let pageToken
  do {
    const page = await auth.listUsers(1000, pageToken)
    users.push(...page.users)
    pageToken = page.pageToken
  } while (pageToken)
  return users
}

function summarizeUser(user) {
  return {
    uid: user.uid,
    phoneNumber: user.phoneNumber ?? null,
    email: user.email ?? null,
    disabled: user.disabled,
    claims: user.customClaims ?? null,
  }
}

function classifyRukn(rukn, authByMobile, claimOwnersByRuknId) {
  const mobile = normalizePhone(rukn.mobile)
  const matches = authByMobile.get(mobile) ?? []
  const claimOwners = claimOwnersByRuknId.get(rukn.id) ?? []

  if (mobile.length !== 10) {
    return {
      status: 'invalid_mobile',
      ruknId: rukn.id,
      name: rukn.name,
      mobile: rukn.mobile,
      authUsers: matches.map(summarizeUser),
      reason: 'Rukn Master mobile is not a valid 10-digit number',
    }
  }

  if (matches.length === 0) {
    return {
      status: 'missing_auth',
      ruknId: rukn.id,
      name: rukn.name,
      mobile: toE164(mobile),
      authUsers: [],
      claimOwners: claimOwners.map(summarizeUser),
      reason: 'No Firebase Auth user with matching phone',
    }
  }

  if (matches.length > 1) {
    return {
      status: 'duplicate_auth',
      ruknId: rukn.id,
      name: rukn.name,
      mobile: toE164(mobile),
      authUsers: matches.map(summarizeUser),
      reason: `Expected 1 Auth user, found ${matches.length}`,
    }
  }

  const user = matches[0]
  const role = user.customClaims?.role
  const ruknId = user.customClaims?.ruknId

  if (role === 'administrator') {
    return {
      status: 'admin_phone_conflict',
      ruknId: rukn.id,
      name: rukn.name,
      mobile: toE164(mobile),
      authUsers: [summarizeUser(user)],
      reason: 'Phone Auth user has administrator claims; skipped',
    }
  }

  if (role === 'rukn' && ruknId === rukn.id) {
    return {
      status: 'ok',
      ruknId: rukn.id,
      name: rukn.name,
      mobile: toE164(mobile),
      authUsers: [summarizeUser(user)],
      reason: null,
    }
  }

  const expected = { role: 'rukn', ruknId: rukn.id }
  const actual = { role: role ?? null, ruknId: typeof ruknId === 'string' ? ruknId : null }
  const needsRepair =
    actual.role !== 'rukn' || actual.ruknId !== rukn.id

  return {
    status: needsRepair ? (actual.role || actual.ruknId ? 'wrong_claims' : 'missing_claims') : 'ok',
    ruknId: rukn.id,
    name: rukn.name,
    mobile: toE164(mobile),
    uid: user.uid,
    authUsers: [summarizeUser(user)],
    expected,
    actual,
    reason:
      actual.role !== 'rukn'
        ? `Expected role "rukn", actual ${JSON.stringify(actual.role)}`
        : `Expected ruknId "${rukn.id}", actual ${JSON.stringify(actual.ruknId)}`,
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!options.dryRun && !options.yes && !options.auditOnly) {
    console.error('Pass --audit, --dry-run, or --yes.')
    process.exit(2)
  }

  const { auth, db, projectId } = initFirebaseAdmin()
  const rukns = await loadActiveRukns(db)
  const users = await listAllUsers(auth)

  const masterMobileCounts = new Map()
  for (const rukn of rukns) {
    const mobile = normalizePhone(rukn.mobile)
    if (mobile.length !== 10) continue
    const list = masterMobileCounts.get(mobile) ?? []
    list.push(rukn.id)
    masterMobileCounts.set(mobile, list)
  }
  const duplicateMasterMobiles = [...masterMobileCounts.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([mobile, ruknIds]) => ({ mobile: toE164(mobile), ruknIds }))

  const authByMobile = new Map()
  const claimOwnersByRuknId = new Map()
  for (const user of users) {
    if (user.phoneNumber) {
      const mobile = normalizePhone(user.phoneNumber)
      if (mobile.length === 10) {
        const list = authByMobile.get(mobile) ?? []
        list.push(user)
        authByMobile.set(mobile, list)
      }
    }
    const claimRuknId = user.customClaims?.ruknId
    if (user.customClaims?.role === 'rukn' && typeof claimRuknId === 'string') {
      const list = claimOwnersByRuknId.get(claimRuknId) ?? []
      list.push(user)
      claimOwnersByRuknId.set(claimRuknId, list)
    }
  }

  const rows = rukns.map((rukn) => classifyRukn(rukn, authByMobile, claimOwnersByRuknId))

  const correctlyProvisioned = rows.filter((r) => r.status === 'ok')
  const missingAuth = rows.filter((r) => r.status === 'missing_auth')
  const duplicateAuth = rows.filter((r) => r.status === 'duplicate_auth')
  const repairCandidates = rows.filter(
    (r) => r.status === 'missing_claims' || r.status === 'wrong_claims',
  )
  const skipped = rows.filter(
    (r) =>
      r.status === 'admin_phone_conflict' ||
      r.status === 'invalid_mobile' ||
      r.status === 'duplicate_auth',
  )

  const repairs = []
  const failedRepairs = []

  for (const row of repairCandidates) {
    const user = row.authUsers?.[0]
    if (!user?.uid) {
      failedRepairs.push({ ...row, error: 'Missing Auth uid for repair candidate' })
      continue
    }

    const existing = user.claims ?? {}
    const nextClaims = {
      ...existing,
      role: 'rukn',
      ruknId: row.ruknId,
    }

    const entry = {
      uid: user.uid,
      ruknId: row.ruknId,
      name: row.name,
      mobile: row.mobile,
      before: existing,
      after: nextClaims,
      status: row.status,
    }

    if (options.dryRun) {
      repairs.push({ ...entry, applied: false })
      continue
    }

    try {
      await auth.setCustomUserClaims(user.uid, nextClaims)
      repairs.push({ ...entry, applied: true })
      console.log(`✓ repaired ${user.uid} → ${row.ruknId} (${row.name})`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failedRepairs.push({ ...entry, error: message })
      console.error(`✗ ${user.uid}`, message)
    }
  }

  const appliedCount = repairs.filter((r) => r.applied).length
  const summary = {
    ticket: 'KC-0100.2',
    generatedAt: new Date().toISOString(),
    projectId: projectId ?? null,
    mode: options.yes ? 'apply' : options.auditOnly ? 'audit' : 'dry-run',
    totalActiveRukns: rukns.length,
    firebaseAuthUsers: users.length,
    correctlyProvisionedBefore: correctlyProvisioned.length,
    correctlyProvisioned:
      correctlyProvisioned.length + (options.yes ? appliedCount : 0),
    claimsRepaired: appliedCount,
    claimsWouldRepair: options.dryRun ? repairs.length : appliedCount,
    missingAuthUsers: missingAuth.length,
    duplicateAuthPhones: duplicateAuth.length,
    duplicateMasterMobiles: duplicateMasterMobiles.length,
    failedRepairs: failedRepairs.length,
    skipped: skipped.length,
  }

  const report = {
    summary,
    duplicateMasterMobiles,
    missingAuthUsers: missingAuth,
    duplicateAuthUsers: duplicateAuth,
    repairCandidates: repairCandidates.map((r) => ({
      ruknId: r.ruknId,
      name: r.name,
      mobile: r.mobile,
      uid: r.uid,
      status: r.status,
      expected: r.expected,
      actual: r.actual,
      reason: r.reason,
    })),
    repairs,
    failedRepairs,
    correctlyProvisionedSample: correctlyProvisioned.slice(0, 5).map((r) => ({
      ruknId: r.ruknId,
      name: r.name,
      mobile: r.mobile,
      uid: r.authUsers?.[0]?.uid,
    })),
    allRows: rows,
  }

  mkdirSync(EXPORT_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outPath = resolve(EXPORT_DIR, `kc0100-rukn-claims-audit-${stamp}.json`)
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({ summary, reportPath: outPath }, null, 2))

  if (failedRepairs.length > 0) process.exit(1)
  if (options.yes && missingAuth.length > 0) {
    // Repairs succeeded, but some Active Rukns still lack Auth users (expected until first OTP).
    console.warn(
      `[warn] ${missingAuth.length} Active Rukn(s) still have no Firebase Auth user (first OTP not yet completed).`,
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
