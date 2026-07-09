#!/usr/bin/env node
/**
 * P2 — Set Firebase custom claims for administrators and Rukns.
 *
 * Usage:
 *   node scripts/admin/set-custom-claims.mjs --csv config/claims/administrators.csv
 *   node scripts/admin/set-custom-claims.mjs --csv config/claims/rukn.csv
 *   node scripts/admin/set-custom-claims.mjs --email admin@jih.org --role administrator
 *   node scripts/admin/set-custom-claims.mjs --phone +919876543210 --role rukn --ruknId R001
 *
 * CSV columns (header row required):
 *   administrators: email, role
 *   rukns: phone, ruknId, role
 *
 * Note: Application and Firestore rules expect role "administrator" (not "admin").
 */
import { readFileSync } from 'node:fs'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const VALID_ROLES = new Set(['administrator', 'rukn'])

function parseArgs(argv) {
  const options = {
    csv: null,
    email: null,
    phone: null,
    uid: null,
    role: null,
    ruknId: null,
    dryRun: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--csv') {
      options.csv = argv[index + 1]
      index += 1
      continue
    }
    if (token === '--email') {
      options.email = argv[index + 1]
      index += 1
      continue
    }
    if (token === '--phone') {
      options.phone = argv[index + 1]
      index += 1
      continue
    }
    if (token === '--uid') {
      options.uid = argv[index + 1]
      index += 1
      continue
    }
    if (token === '--role') {
      options.role = argv[index + 1]
      index += 1
      continue
    }
    if (token === '--ruknId') {
      options.ruknId = argv[index + 1]
      index += 1
      continue
    }
    if (token === '--dry-run') {
      options.dryRun = true
    }
  }

  return options
}

function parseCsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))

  if (lines.length < 2) {
    return []
  }

  const headers = lines[0].split(',').map((header) => header.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim())
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })
    return row
  })
}

function normalizeRole(role) {
  const normalized = String(role ?? '').trim().toLowerCase()
  if (normalized === 'admin') {
    return 'administrator'
  }
  return normalized
}

function normalizePhone(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (digits.length === 10) {
    return `+91${digits}`
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`
  }
  if (String(phone ?? '').startsWith('+')) {
    return String(phone).trim()
  }
  return digits ? `+${digits}` : ''
}

async function resolveUid(auth, { email, phone, uid }) {
  if (uid) {
    return uid
  }

  if (email) {
    const user = await auth.getUserByEmail(email.trim().toLowerCase())
    return user.uid
  }

  if (phone) {
    const e164 = normalizePhone(phone)
    const user = await auth.getUserByPhoneNumber(e164)
    return user.uid
  }

  throw new Error('Each row must include uid, email, or phone')
}

function buildClaims(role, ruknId) {
  const normalizedRole = normalizeRole(role)
  if (!VALID_ROLES.has(normalizedRole)) {
    throw new Error(`Invalid role "${role}". Use administrator or rukn.`)
  }

  if (normalizedRole === 'administrator') {
    return { role: 'administrator' }
  }

  if (!ruknId?.trim()) {
    throw new Error('Rukn claims require ruknId (must match ruknMaster.id, e.g. R001).')
  }

  return { role: 'rukn', ruknId: ruknId.trim() }
}

async function applyClaim(auth, target, dryRun) {
  const uid = await resolveUid(auth, target)
  const claims = buildClaims(target.role, target.ruknId)

  if (dryRun) {
    console.log(`[dry-run] ${uid}: ${JSON.stringify(claims)}`)
    return
  }

  await auth.setCustomUserClaims(uid, claims)
  console.log(`Set claims for ${uid}: ${JSON.stringify(claims)}`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const { auth } = initFirebaseAdmin()

  const targets = []

  if (options.csv) {
    const rows = parseCsv(readFileSync(options.csv, 'utf8'))
    for (const row of rows) {
      targets.push({
        email: row.email,
        phone: row.phone,
        uid: row.uid,
        role: row.role,
        ruknId: row.ruknid ?? row.rukn_id ?? row['rukn id'],
      })
    }
  } else if (options.role) {
    targets.push({
      email: options.email,
      phone: options.phone,
      uid: options.uid,
      role: options.role,
      ruknId: options.ruknId,
    })
  } else {
    console.error('Provide --csv or --role with --email/--phone/--uid')
    process.exit(1)
  }

  let success = 0
  let failed = 0

  for (const target of targets) {
    try {
      await applyClaim(auth, target, options.dryRun)
      success += 1
    } catch (error) {
      failed += 1
      const label = target.email ?? target.phone ?? target.uid ?? 'unknown'
      console.error(`Failed for ${label}: ${error instanceof Error ? error.message : error}`)
    }
  }

  console.log(`Done. ${success} succeeded, ${failed} failed.`)
  if (failed > 0) {
    process.exit(1)
  }

  if (!options.dryRun) {
    console.log('Users must sign out and sign in again for claims to refresh.')
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
