#!/usr/bin/env node
/**
 * KC-017.2 — Controlled, idempotent recovery of missing production Karkuns.
 *
 * Inserts ONLY seed karkuns missing from Firestore (expected kr-321..kr-493).
 * Does not overwrite existing docs. Repairs settings/karkunCounter to 494 after success.
 *
 * Usage:
 *   node scripts/admin/recover-missing-karkuns.mjs --dry-run
 *   node scripts/admin/recover-missing-karkuns.mjs --yes
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID?.trim() || 'karkun-connect-75c68'
const DRY_RUN = process.argv.includes('--dry-run')
const AUTO_YES = process.argv.includes('--yes')
const SEED_PATH = resolve('production-data/exports/seed-backup.json')
const EXPORT_DIR = resolve('production-data/exports')
const EXPECTED = {
  rukns: 49,
  karkuns: 493,
  male: 196,
  female: 297,
  counter: 494,
}

function loadFirebaseToolsAuth() {
  const path = join(homedir(), '.config', 'configstore', 'firebase-tools.json')
  if (!existsSync(path)) return null
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  const tokens = raw.tokens || {}
  return {
    access_token: tokens.access_token || raw.access_token || null,
    expires_at: Number(tokens.expires_at || raw.expires_at || 0),
  }
}

function getAccessToken() {
  const auth = loadFirebaseToolsAuth()
  if (!auth?.access_token || auth.expires_at <= Date.now() + 60_000) {
    throw new Error('Firebase CLI access token missing/expired. Run: firebase login')
  }
  return auth.access_token
}

async function firestoreRest(accessToken, method, path, body) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents${path}`
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`Firestore REST ${method} ${path}: ${response.status} ${await response.text()}`)
  }
  if (response.status === 204) return null
  return response.json()
}

async function listCollectionDocuments(accessToken, collectionId) {
  const documents = []
  let pageToken = ''
  do {
    const query = new URLSearchParams({ pageSize: '300' })
    if (pageToken) query.set('pageToken', pageToken)
    const json = await firestoreRest(accessToken, 'GET', `/${collectionId}?${query}`)
    documents.push(...(json?.documents ?? []))
    pageToken = json?.nextPageToken || ''
  } while (pageToken)
  return documents
}

function fromFirestoreValue(value) {
  if (value == null) return undefined
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('nullValue' in value) return null
  if ('timestampValue' in value) return value.timestampValue
  if ('mapValue' in value) {
    const out = {}
    for (const [k, v] of Object.entries(value.mapValue.fields || {})) {
      out[k] = fromFirestoreValue(v)
    }
    return out
  }
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(fromFirestoreValue)
  }
  return undefined
}

function toFirestoreValue(value) {
  if (value === undefined) return undefined
  if (value === null) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: String(value) }
    return { doubleValue: value }
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue).filter(Boolean) } }
  }
  if (typeof value === 'object') {
    const fields = {}
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue
      fields[k] = toFirestoreValue(v)
    }
    return { mapValue: { fields } }
  }
  return { stringValue: String(value) }
}

function recordToFirestoreFields(record) {
  const fields = {}
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue
    fields[key] = toFirestoreValue(value)
  }
  return fields
}

function docToPlain(doc) {
  const id = doc.name.split('/').pop()
  const fields = {}
  for (const [key, value] of Object.entries(doc.fields || {})) {
    fields[key] = fromFirestoreValue(value)
  }
  return { id, ...fields }
}

function validateSeedKarkun(record) {
  const problems = []
  if (!record?.id || typeof record.id !== 'string') problems.push('missing id')
  if (!record?.name?.trim()) problems.push('missing name')
  if (!record?.gender) problems.push('missing gender')
  if (!record?.mobile) problems.push('missing mobile')
  for (const [key, value] of Object.entries(record || {})) {
    if (value === undefined) problems.push(`undefined:${key}`)
  }
  return problems
}

function census(karkuns) {
  const genders = { Male: 0, Female: 0, other: 0 }
  let assigned = 0
  const ids = []
  for (const k of karkuns) {
    ids.push(k.id)
    if (k.gender === 'Male') genders.Male += 1
    else if (k.gender === 'Female') genders.Female += 1
    else genders.other += 1
    if (k.assignmentStatus === 'Assigned') assigned += 1
  }
  const unique = new Set(ids)
  return {
    total: karkuns.length,
    male: genders.Male,
    female: genders.Female,
    other: genders.other,
    assigned,
    duplicateIds: ids.length - unique.size,
  }
}

async function readCounter(accessToken) {
  const doc = await firestoreRest(accessToken, 'GET', '/settings/karkunCounter')
  if (!doc?.fields) return null
  return fromFirestoreValue(doc.fields.nextKarkunNum) ?? null
}

async function commitWrites(accessToken, writes) {
  if (writes.length === 0) return
  if (DRY_RUN) {
    console.log(`[dry-run] commit ${writes.length} writes`)
    return
  }
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ writes }),
  })
  if (!response.ok) {
    throw new Error(`commit failed: ${response.status} ${await response.text()}`)
  }
}

function abort(message, report) {
  console.error(`\nABORT: ${message}`)
  if (report) {
    const errorPath = resolve(EXPORT_DIR, 'kc-017-2-recovery-error.json')
    writeFileSync(errorPath, JSON.stringify({ aborted: true, message, ...report }, null, 2))
    console.error(`Error report: ${errorPath}`)
  }
  process.exit(1)
}

async function main() {
  console.log(`\nKC-017.2 Production master registry recovery — ${PROJECT_ID}`)
  console.log(DRY_RUN ? 'Mode: DRY RUN\n' : 'Mode: LIVE\n')

  if (!existsSync(SEED_PATH)) {
    abort(`Seed file missing: ${SEED_PATH}`)
  }

  if (!DRY_RUN && !AUTO_YES) {
    console.log('Re-run with --yes to execute recovery, or --dry-run to preview.')
    console.log('Example: node scripts/admin/recover-missing-karkuns.mjs --yes')
    process.exit(2)
  }

  const accessToken = getAccessToken()
  mkdirSync(EXPORT_DIR, { recursive: true })

  // ── Phase 1: backup ──────────────────────────────────────────────
  console.log('Phase 1 — Backup current production state…')
  let liveRukns
  let liveKarkuns
  let liveConnections
  let beforeCounter
  try {
    const [ruknDocs, karkunDocs, connectionDocs] = await Promise.all([
      listCollectionDocuments(accessToken, 'rukns'),
      listCollectionDocuments(accessToken, 'karkuns'),
      listCollectionDocuments(accessToken, 'connections'),
    ])
    liveRukns = ruknDocs.map(docToPlain)
    liveKarkuns = karkunDocs.map(docToPlain)
    liveConnections = connectionDocs.map(docToPlain)
    beforeCounter = await readCounter(accessToken)
  } catch (error) {
    abort(`Backup failed while reading Firestore: ${error instanceof Error ? error.message : error}`)
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = resolve(EXPORT_DIR, `kc-017-2-pre-recovery-backup-${stamp}.json`)
  const backup = {
    sprint: 'KC-017.2',
    projectId: PROJECT_ID,
    timestamp: new Date().toISOString(),
    rukns: liveRukns,
    karkuns: liveKarkuns,
    connections: liveConnections,
    nextKarkunNum: beforeCounter,
  }
  try {
    writeFileSync(backupPath, JSON.stringify(backup, null, 2))
    if (!existsSync(backupPath) || backup.karkuns.length !== liveKarkuns.length) {
      abort('Backup verification failed (file incomplete).')
    }
  } catch (error) {
    abort(`Backup write failed: ${error instanceof Error ? error.message : error}`)
  }
  console.log(`✓ Backup written: ${backupPath}`)
  console.log(`  rukns=${liveRukns.length} karkuns=${liveKarkuns.length} connections=${liveConnections.length} counter=${beforeCounter}`)

  // ── Phase 2: differential recovery ───────────────────────────────
  console.log('\nPhase 2 — Differential recovery…')
  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'))
  const seedRukns = seed.rukns ?? []
  const seedKarkuns = seed.karkuns ?? []

  if (seedRukns.length !== EXPECTED.rukns || seedKarkuns.length !== EXPECTED.karkuns) {
    abort(`Seed counts unexpected (rukns=${seedRukns.length}, karkuns=${seedKarkuns.length}).`, {
      backupPath,
    })
  }

  const seedIds = seedKarkuns.map((k) => k.id)
  if (new Set(seedIds).size !== seedIds.length) {
    abort('Duplicate IDs detected in seed-backup.json.', { backupPath })
  }

  for (const record of seedKarkuns) {
    const problems = validateSeedKarkun(record)
    if (problems.length > 0) {
      abort(`Invalid seed record ${record?.id}: ${problems.join(', ')}`, { backupPath })
    }
  }

  const liveIdSet = new Set(liveKarkuns.map((k) => k.id))
  const missing = seedKarkuns.filter((k) => !liveIdSet.has(k.id))
  const extra = liveKarkuns.filter((k) => !seedIds.includes(k.id))
  const beforeCensus = census(liveKarkuns)

  console.log(`Missing IDs detected: ${missing.length}`)
  console.log(`Extra live IDs (not in seed): ${extra.length}`)
  if (missing.length > 0) {
    console.log(`  first=${missing[0].id} last=${missing[missing.length - 1].id}`)
  }

  if (extra.length > 0) {
    abort(`Extra Firestore records not in seed (count=${extra.length}). Recovery aborted.`, {
      backupPath,
      extraIds: extra.map((k) => k.id).slice(0, 50),
    })
  }

  let inserted = 0
  let skipped = liveKarkuns.length

  if (missing.length > 0) {
    if (!DRY_RUN && missing.length !== 173 && liveKarkuns.length === 320) {
      console.warn(`Note: expected 173 missing from a 320 baseline; found ${missing.length}.`)
    }

    const writes = missing.map((record) => ({
      update: {
        name: `projects/${PROJECT_ID}/databases/(default)/documents/karkuns/${record.id}`,
        fields: recordToFirestoreFields(record),
      },
      currentDocument: { exists: false },
    }))

    // Include counter repair in the same atomic commit when inserting.
    writes.push({
      update: {
        name: `projects/${PROJECT_ID}/databases/(default)/documents/settings/karkunCounter`,
        fields: {
          nextKarkunNum: { integerValue: String(EXPECTED.counter) },
        },
      },
    })

    try {
      await commitWrites(accessToken, writes)
      inserted = missing.length
      console.log(`✓ Inserted ${inserted} missing karkuns + set counter=${EXPECTED.counter}`)
    } catch (error) {
      abort(`Firestore write failure: ${error instanceof Error ? error.message : error}`, {
        backupPath,
        attemptedInserts: missing.map((k) => k.id),
      })
    }
  } else {
    console.log('✓ No missing karkuns — idempotent skip (Recovered: 0)')
    const currentCounter = await readCounter(accessToken)
    if (currentCounter !== EXPECTED.counter) {
      try {
        await commitWrites(accessToken, [
          {
            update: {
              name: `projects/${PROJECT_ID}/databases/(default)/documents/settings/karkunCounter`,
              fields: {
                nextKarkunNum: { integerValue: String(EXPECTED.counter) },
              },
            },
          },
        ])
        console.log(`✓ Counter repaired ${currentCounter} → ${EXPECTED.counter}`)
      } catch (error) {
        abort(`Counter update failure: ${error instanceof Error ? error.message : error}`, {
          backupPath,
        })
      }
    } else {
      console.log(`✓ Counter already ${EXPECTED.counter}`)
    }
  }

  // ── Phase 4–5: validation ────────────────────────────────────────
  console.log('\nPhase 4–5 — Validation…')
  if (DRY_RUN) {
    const projected = beforeCensus.total + missing.length
    console.log(`[dry-run] projected karkuns=${projected} inserts=${missing.length}`)
    const report = {
      sprint: 'KC-017.2',
      dryRun: true,
      before: { ...beforeCensus, rukns: liveRukns.length, counter: beforeCounter },
      recovery: {
        missingIds: missing.map((k) => k.id),
        inserted: missing.length,
        skipped,
        errors: [],
      },
      backupPath,
    }
    writeFileSync(resolve(EXPORT_DIR, 'kc-017-2-recovery-report.json'), JSON.stringify(report, null, 2))
    console.log('\nDry run complete.')
    return
  }

  const [afterRuknDocs, afterKarkunDocs, afterConnectionDocs] = await Promise.all([
    listCollectionDocuments(accessToken, 'rukns'),
    listCollectionDocuments(accessToken, 'karkuns'),
    listCollectionDocuments(accessToken, 'connections'),
  ])
  const afterRukns = afterRuknDocs.map(docToPlain)
  const afterKarkuns = afterKarkunDocs.map(docToPlain)
  const afterConnections = afterConnectionDocs.map(docToPlain)
  const afterCounter = await readCounter(accessToken)
  const afterCensus = census(afterKarkuns)

  const afterIds = afterKarkuns.map((k) => k.id).sort((a, b) => {
    return Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, ''))
  })
  const seedIdSet = new Set(seedIds)
  const afterIdSet = new Set(afterIds)
  const stillMissing = seedIds.filter((id) => !afterIdSet.has(id))
  const stillExtra = afterIds.filter((id) => !seedIdSet.has(id))
  const expectedIds = Array.from({ length: 493 }, (_, i) => `kr-${String(i + 1).padStart(3, '0')}`)
  const continuityGaps = expectedIds.filter((id) => !afterIdSet.has(id))

  const checks = [
    ['Rukns = 49', afterRukns.length === 49],
    ['Karkuns = 493', afterCensus.total === 493],
    ['Male = 196', afterCensus.male === 196],
    ['Female = 297', afterCensus.female === 297],
    ['Missing IDs = 0', stillMissing.length === 0],
    ['Duplicate IDs = 0', afterCensus.duplicateIds === 0],
    ['Assigned = 0', afterCensus.assigned === 0],
    ['Connections = 0', afterConnections.length === 0],
    ['Counter = 494', afterCounter === 494],
    ['No extra records', stillExtra.length === 0],
    ['ID continuity kr-001..kr-493', continuityGaps.length === 0],
    ['Every seed karkun exists', seedIds.every((id) => afterIdSet.has(id))],
  ]

  let pass = true
  for (const [label, ok] of checks) {
    console.log(`${ok ? '✓' : '✗'} ${label}`)
    if (!ok) pass = false
  }

  const report = {
    sprint: 'KC-017.2',
    projectId: PROJECT_ID,
    dryRun: false,
    timestamp: new Date().toISOString(),
    backupPath,
    before: {
      rukns: liveRukns.length,
      karkuns: beforeCensus.total,
      male: beforeCensus.male,
      female: beforeCensus.female,
      counter: beforeCounter,
      connections: liveConnections.length,
      assigned: beforeCensus.assigned,
    },
    recovery: {
      missingIdsDetected: missing.length,
      missingIds: missing.map((k) => k.id),
      recordsInserted: inserted,
      recordsSkipped: skipped,
      errors: [],
    },
    after: {
      rukns: afterRukns.length,
      karkuns: afterCensus.total,
      male: afterCensus.male,
      female: afterCensus.female,
      counter: afterCounter,
      connections: afterConnections.length,
      assigned: afterCensus.assigned,
      stillMissing,
      stillExtra,
      continuityGaps,
    },
    finalVerification: pass ? 'PASS' : 'FAIL',
  }

  const reportPath = resolve(EXPORT_DIR, 'kc-017-2-recovery-report.json')
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\nReport: ${reportPath}`)

  if (!pass) {
    abort('Validation failed after recovery.', report)
  }

  console.log('\nFinal Verification: PASS')
  console.log('Production master registry recovered.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
