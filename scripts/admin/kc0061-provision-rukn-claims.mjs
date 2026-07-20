#!/usr/bin/env node
/**
 * KC-0061 — Provision missing Rukn custom claims (production restore).
 *
 * Root cause: App Auth resolves Rukn via phone→ruknMaster, but Firestore rules
 * require JWT claims { role: 'rukn', ruknId }. Production had 0 Rukn claims.
 *
 * Usage:
 *   node scripts/admin/kc0061-provision-rukn-claims.mjs --dry-run
 *   node scripts/admin/kc0061-provision-rukn-claims.mjs --yes
 */
import { initFirebaseAdmin } from './_firebase-init.mjs'

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

async function loadRuknMasterFromFirestore(db) {
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

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const yes = process.argv.includes('--yes')
  if (!dryRun && !yes) {
    console.error('Refusing to write claims without --yes (or pass --dry-run).')
    process.exit(2)
  }

  const { auth, db } = initFirebaseAdmin()
  const rukns = await loadRuknMasterFromFirestore(db)
  const byMobile = new Map()
  for (const rukn of rukns) {
    const mobile = normalizePhone(rukn.mobile)
    if (mobile.length !== 10) continue
    if (byMobile.has(mobile)) {
      console.warn(`[warn] duplicate mobile ${mobile} for ${byMobile.get(mobile).id} and ${rukn.id}`)
      continue
    }
    byMobile.set(mobile, rukn)
  }

  const users = await listAllUsers(auth)
  const report = {
    ruknMasterActive: rukns.length,
    firebaseUsers: users.length,
    alreadyClaimed: 0,
    provisioned: 0,
    skippedNoMatch: 0,
    skippedAdmin: 0,
    errors: [],
    rows: [],
  }

  for (const user of users) {
    const existingRole = user.customClaims?.role
    if (existingRole === 'administrator') {
      report.skippedAdmin++
      continue
    }
    if (existingRole === 'rukn' && user.customClaims?.ruknId) {
      report.alreadyClaimed++
      continue
    }

    const phone = user.phoneNumber
    if (!phone) {
      report.skippedNoMatch++
      continue
    }
    const mobile = normalizePhone(phone)
    const rukn = byMobile.get(mobile)
    if (!rukn) {
      report.skippedNoMatch++
      continue
    }

    const nextClaims = {
      ...(user.customClaims ?? {}),
      role: 'rukn',
      ruknId: rukn.id,
    }
    report.rows.push({
      uid: user.uid,
      phone: toE164(mobile),
      ruknId: rukn.id,
      name: rukn.name,
      before: user.customClaims ?? null,
      after: nextClaims,
    })

    if (dryRun) {
      report.provisioned++
      continue
    }

    try {
      await auth.setCustomUserClaims(user.uid, nextClaims)
      report.provisioned++
      console.log(`✓ ${user.uid} → rukn ${rukn.id} (${rukn.name})`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      report.errors.push({ uid: user.uid, message })
      console.error(`✗ ${user.uid}`, message)
    }
  }

  console.log(JSON.stringify(report, null, 2))
  if (report.errors.length > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
