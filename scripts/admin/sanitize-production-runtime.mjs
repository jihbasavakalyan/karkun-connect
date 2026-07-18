#!/usr/bin/env node
/**
 * KC-017.1 — Production data sanitization for public go-live.
 *
 * Removes runtime/test execution data while preserving master registry:
 * - campaigns, rukns, karkuns (identity fields), settings counter/migration
 * - Firebase Auth production accounts
 *
 * Deletes:
 * - connections (+ connectionMeta)
 * - followUps, activityLogs
 * - executions (visits / annexure / guidance)
 * - communications state
 * - compliance runtime docs
 * - broadcast_* and backup_* settings docs (keeps karkunCounter, migrationVersion)
 *
 * Resets derived fields on every karkun so all show Unconnected.
 *
 * Usage:
 *   node scripts/admin/sanitize-production-runtime.mjs
 *   node scripts/admin/sanitize-production-runtime.mjs --dry-run
 *   node scripts/admin/sanitize-production-runtime.mjs --yes
 *
 * Requires Firebase CLI login (`firebase login`) for project karkun-connect-75c68,
 * OR FIREBASE_SERVICE_ACCOUNT_PATH / GOOGLE_APPLICATION_CREDENTIALS.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID?.trim() || 'karkun-connect-75c68'
const DRY_RUN = process.argv.includes('--dry-run')
const AUTO_YES = process.argv.includes('--yes')

const COLLECTIONS_WIPE = ['connections', 'followUps', 'activityLogs', 'executions', 'compliance']

const DEMO_EMAIL_PATTERNS = [/@demo\.com$/i, /^admin@example\.com$/i, /test@/i, /dummy@/i]


function loadFirebaseToolsAuth() {
  const path = join(homedir(), '.config', 'configstore', 'firebase-tools.json')
  if (!existsSync(path)) return null
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  const tokens = raw.tokens || {}
  return {
    refresh_token: raw.refresh_token || tokens.refresh_token || null,
    access_token: tokens.access_token || raw.access_token || null,
    expires_at: Number(tokens.expires_at || raw.expires_at || 0),
    client_id:
      tokens.client_id ||
      '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    client_secret: tokens.client_secret || null,
  }
}

async function getAccessTokenFromFirebaseCli() {
  const auth = loadFirebaseToolsAuth()
  if (!auth) {
    throw new Error('Firebase CLI credentials not found. Run: firebase login')
  }

  const now = Date.now()
  if (auth.access_token && auth.expires_at > now + 60_000) {
    return auth.access_token
  }

  if (!auth.refresh_token) {
    throw new Error('Firebase CLI token expired. Run: firebase login')
  }

  if (!auth.client_secret) {
    throw new Error(
      'Firebase CLI access token expired and client_secret is unavailable. Run: firebase login',
    )
  }

  const body = new URLSearchParams({
    client_id: auth.client_id,
    client_secret: auth.client_secret,
    refresh_token: auth.refresh_token,
    grant_type: 'refresh_token',
  })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) {
    throw new Error(`OAuth refresh failed: ${response.status} ${await response.text()}`)
  }
  const json = await response.json()
  return json.access_token
}

function tryInitAdminSdk() {
  try {
    const { initFirebaseAdmin } = require('./_firebase-init.mjs')
    return initFirebaseAdmin()
  } catch {
    return null
  }
}

async function deleteCollectionViaCli(collectionId) {
  const args = [
    'firestore:delete',
    collectionId,
    '--recursive',
    '--force',
    '--project',
    PROJECT_ID,
  ]
  if (DRY_RUN) {
    console.log(`[dry-run] firebase ${args.join(' ')}`)
    return { ok: true, dryRun: true }
  }
  const result = spawnSync('firebase', args, { encoding: 'utf8', shell: true })
  if (result.status !== 0) {
    console.error(result.stdout || '')
    console.error(result.stderr || '')
    throw new Error(`Failed to delete collection ${collectionId}`)
  }
  console.log(`✓ Deleted collection: ${collectionId}`)
  return { ok: true }
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
    const json = await firestoreRest(
      accessToken,
      'GET',
      `/${collectionId}?${query.toString()}`,
    )
    for (const doc of json?.documents ?? []) {
      documents.push(doc)
    }
    pageToken = json?.nextPageToken || ''
  } while (pageToken)
  return documents
}

async function listCollectionDocNames(accessToken, collectionId) {
  const docs = await listCollectionDocuments(accessToken, collectionId)
  return docs.map((doc) => doc.name.split('/').pop())
}

async function deleteDoc(accessToken, collectionId, docId) {
  if (DRY_RUN) {
    console.log(`[dry-run] delete ${collectionId}/${docId}`)
    return
  }
  await firestoreRest(accessToken, 'DELETE', `/${collectionId}/${encodeURIComponent(docId)}`)
}

function fromFirestoreValue(value) {
  if (value == null) return undefined
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('nullValue' in value) return null
  if ('mapValue' in value) {
    const out = {}
    for (const [k, v] of Object.entries(value.mapValue.fields || {})) {
      out[k] = fromFirestoreValue(v)
    }
    return out
  }
  return undefined
}

function toFirestoreString(value) {
  if (value === undefined) return undefined
  if (value === null) return { nullValue: null }
  return { stringValue: String(value) }
}

async function commitWrites(accessToken, writes) {
  if (writes.length === 0) return
  if (DRY_RUN) {
    console.log(`[dry-run] commit ${writes.length} writes`)
    return
  }
  // Firestore commit limit is 500
  for (let offset = 0; offset < writes.length; offset += 400) {
    const chunk = writes.slice(offset, offset + 400)
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ writes: chunk }),
    })
    if (!response.ok) {
      throw new Error(`commit failed: ${response.status} ${await response.text()}`)
    }
  }
}

async function resetKarkunDerivedFields(accessToken) {
  const documents = await listCollectionDocuments(accessToken, 'karkuns')
  let assignedBefore = 0
  const writes = []

  for (const doc of documents) {
    const id = doc.name.split('/').pop()
    const fields = {}
    for (const [key, value] of Object.entries(doc.fields || {})) {
      fields[key] = fromFirestoreValue(value)
    }

    const wasAssigned =
      fields.assignmentStatus === 'Assigned' ||
      Boolean(fields.assignedRuknId) ||
      Boolean(fields.assignedRukn)

    if (wasAssigned) assignedBefore += 1

    const status = fields.status
    const campaignStatus = status === 'active' ? 'not_assigned' : 'inactive'

    if (DRY_RUN) {
      if (wasAssigned) console.log(`[dry-run] reset karkun ${id}`)
      continue
    }

    writes.push({
      update: {
        name: doc.name,
        fields: {
          assignmentStatus: toFirestoreString('Available'),
          assignedRuknId: toFirestoreString(''),
          assignedRukn: toFirestoreString(''),
          campaignStatus: toFirestoreString(campaignStatus),
          visitStatus: toFirestoreString('none'),
          lastVisit: { nullValue: null },
          commitment: { nullValue: null },
          currentCommitment: toFirestoreString(''),
        },
      },
      updateMask: {
        fieldPaths: [
          'assignmentStatus',
          'assignedRuknId',
          'assignedRukn',
          'assignmentDate',
          'campaignStatus',
          'visitStatus',
          'lastVisit',
          'commitment',
          'currentCommitment',
        ],
      },
    })
  }

  await commitWrites(accessToken, writes)

  return {
    totalKarkuns: documents.length,
    assignedBefore,
    resetCount: documents.length,
  }
}

async function wipeSettingsRuntimeDocs(accessToken) {
  const names = await listCollectionDocNames(accessToken, 'settings')
  let deleted = 0
  for (const id of names) {
    // Keep structural settings only.
    if (id === 'karkunCounter' || id === 'migrationVersion' || id === 'karkunRequests') continue

    await deleteDoc(accessToken, 'settings', id)
    deleted += 1
  }
  try {
    await deleteDoc(accessToken, 'communications', 'state')
    deleted += 1
  } catch {
    // ignore missing doc
  }
  return deleted
}

async function listAuthUsersViaCli() {
  const outPath = resolve('production-data/exports/auth-users-temp.json')
  mkdirSync(resolve('production-data/exports'), { recursive: true })
  if (DRY_RUN) {
    console.log('[dry-run] firebase auth:export')
    return []
  }
  const result = spawnSync(
    'firebase',
    ['auth:export', outPath, '--format', 'json', '--project', PROJECT_ID],
    { encoding: 'utf8', shell: true },
  )
  if (result.status !== 0) {
    console.warn('⚠ auth:export failed — skipping test-user scan')
    console.warn(result.stderr || result.stdout)
    return []
  }
  if (!existsSync(outPath)) return []
  const raw = JSON.parse(readFileSync(outPath, 'utf8'))
  return raw.users || raw || []
}

function isDemoAuthUser(user) {
  const email = user.email || ''
  const phone = user.phoneNumber || ''
  if (DEMO_EMAIL_PATTERNS.some((pattern) => pattern.test(email))) return true
  // Keep all phone-authenticated Rukns (production). Only flag obvious demo emails.
  void phone
  return false
}

async function deleteDemoAuthUsers(users) {
  const demo = users.filter(isDemoAuthUser)
  if (demo.length === 0) {
    console.log('• No demo/test Auth users matched removal patterns')
    return { scanned: users.length, removed: 0 }
  }

  const admin = tryInitAdminSdk()
  if (!admin) {
    console.warn(
      `⚠ Found ${demo.length} demo Auth user(s) but no service account — list only:`,
    )
    for (const user of demo) {
      console.warn(`  - ${user.localId || user.uid} ${user.email || user.phoneNumber || ''}`)
    }
    return { scanned: users.length, removed: 0, pending: demo.length }
  }

  let removed = 0
  for (const user of demo) {
    const uid = user.localId || user.uid
    if (DRY_RUN) {
      console.log(`[dry-run] delete auth user ${uid} ${user.email || ''}`)
      continue
    }
    await admin.auth.deleteUser(uid)
    console.log(`✓ Removed demo Auth user ${uid} (${user.email || ''})`)
    removed += 1
  }
  return { scanned: users.length, removed }
}

async function countCollection(accessToken, collectionId) {
  const names = await listCollectionDocNames(accessToken, collectionId)
  return names.length
}

async function main() {
  console.log(`\nKC-017.1 Production sanitization — project ${PROJECT_ID}`)
  console.log(DRY_RUN ? 'Mode: DRY RUN (no writes)\n' : 'Mode: LIVE\n')

  if (!DRY_RUN && !AUTO_YES) {
    console.log('This will permanently delete runtime data (connections, visits, activity, etc.).')
    console.log('Master rukns/karkuns identity fields are preserved; assignment fields are reset.')
    console.log('Re-run with --yes to proceed, or --dry-run to preview.\n')
    console.log('Example: node scripts/admin/sanitize-production-runtime.mjs --yes')
    process.exit(2)
  }

  const accessToken = await getAccessTokenFromFirebaseCli()

  const before = {
    rukns: await countCollection(accessToken, 'rukns'),
    karkuns: await countCollection(accessToken, 'karkuns'),
    connections: await countCollection(accessToken, 'connections'),
    followUps: await countCollection(accessToken, 'followUps'),
    activityLogs: await countCollection(accessToken, 'activityLogs'),
    executions: await countCollection(accessToken, 'executions'),
    compliance: await countCollection(accessToken, 'compliance'),
  }

  console.log('Before:')
  console.log(before)

  for (const collectionId of COLLECTIONS_WIPE) {
    await deleteCollectionViaCli(collectionId)
  }

  // connectionMeta + broadcasts + backups + communication state
  const settingsDeleted = await wipeSettingsRuntimeDocs(accessToken)
  console.log(`✓ Settings runtime docs removed: ${settingsDeleted}`)

  const karkunReset = await resetKarkunDerivedFields(accessToken)
  console.log(
    `✓ Karkuns reset: ${karkunReset.resetCount}/${karkunReset.totalKarkuns} (were assigned: ${karkunReset.assignedBefore})`,
  )

  const authUsers = await listAuthUsersViaCli()
  const authResult = await deleteDemoAuthUsers(authUsers)

  const after = {
    rukns: await countCollection(accessToken, 'rukns'),
    karkuns: await countCollection(accessToken, 'karkuns'),
    connections: await countCollection(accessToken, 'connections'),
    followUps: await countCollection(accessToken, 'followUps'),
    activityLogs: await countCollection(accessToken, 'activityLogs'),
    executions: await countCollection(accessToken, 'executions'),
    compliance: await countCollection(accessToken, 'compliance'),
  }

  console.log('\nAfter:')
  console.log(after)

  const report = {
    sprint: 'KC-017.1',
    projectId: PROJECT_ID,
    dryRun: DRY_RUN,
    timestamp: new Date().toISOString(),
    before,
    after,
    karkunReset,
    authResult,
    connectionsRemoved: before.connections,
    visitsRemoved: before.executions,
    followUpsRemoved: before.followUps,
    activityRemoved: before.activityLogs,
    complianceRemoved: before.compliance,
    mastersPreserved: {
      rukns: after.rukns === before.rukns,
      karkuns: after.karkuns === before.karkuns,
    },
  }

  mkdirSync(resolve('production-data/exports'), { recursive: true })
  const reportPath = resolve('production-data/exports/kc-017-1-sanitization-report.json')
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\nReport written: ${reportPath}`)

  const ok =
    after.connections === 0 &&
    after.followUps === 0 &&
    after.activityLogs === 0 &&
    after.executions === 0 &&
    after.compliance === 0 &&
    after.rukns === before.rukns &&
    after.karkuns === before.karkuns

  if (!ok && !DRY_RUN) {
    console.error('\nSanitization verification failed — inspect counts above.')
    process.exit(1)
  }

  console.log(DRY_RUN ? '\nDry run complete.' : '\nSanitization complete.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
