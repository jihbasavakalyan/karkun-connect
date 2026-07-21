#!/usr/bin/env node
/**
 * KC-0061 Final Production Validation
 * Executes Admin login → hydrate → assign → verify → Rukn confirm → metrics
 * using production Firebase client SDK + Admin custom tokens (same auth path as app).
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  query,
  where,
  runTransaction,
} from 'firebase/firestore'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const ADMIN_UID = 'VQkrDSDGoQUptRlyghtlFxmcJN03'
const VALIDATION_TAG = 'KC-0061-final-validation'

function loadViteEnv() {
  for (const name of ['.env.local', '.env']) {
    const path = resolve(ROOT, name)
    if (!existsSync(path)) continue
    for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const line = raw.trim()
      if (!line || line.startsWith('#') || !line.includes('=')) continue
      const eq = line.indexOf('=')
      const key = line.slice(0, eq).trim()
      let value = line.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = value
    }
  }
}

function clientConfig() {
  loadViteEnv()
  return {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  }
}

function errInfo(error) {
  return {
    code: error?.code ?? null,
    message: error?.message ?? String(error),
    name: error?.name ?? null,
    stack: error?.stack ?? null,
  }
}

function formatAsn(n) {
  return `ASN-${String(n).padStart(6, '0')}`
}

function parseAsn(asn) {
  const m = String(asn ?? '').trim().match(/^ASN-(\d+)$/i)
  return m ? Number.parseInt(m[1], 10) : null
}

function step(steps, id, status, extra = {}) {
  const record = { id, status, at: new Date().toISOString(), ...extra }
  steps.push(record)
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏳'
  console.error(`${icon} Step ${id}: ${status}${extra.message ? ` — ${extra.message}` : ''}`)
  return record
}

async function createClientSession(label, uid, authAdmin) {
  const config = clientConfig()
  const app = initializeApp(config, `${VALIDATION_TAG}-${label}-${Date.now()}`)
  const auth = getAuth(app)
  const db = getFirestore(app)
  const token = await authAdmin.createCustomToken(uid)
  await signInWithCustomToken(auth, token)
  await auth.currentUser.getIdToken(true)
  const tokenResult = await auth.currentUser.getIdTokenResult(false)
  return {
    app,
    auth,
    db,
    uid: auth.currentUser.uid,
    claims: {
      role: tokenResult.claims.role ?? null,
      ruknId: tokenResult.claims.ruknId ?? null,
      issuedAtTime: tokenResult.issuedAtTime,
      expirationTime: tokenResult.expirationTime,
    },
  }
}

async function destroySession(session) {
  try {
    await signOut(session.auth)
  } catch {
    // ignore
  }
  try {
    await deleteApp(session.app)
  } catch {
    // ignore
  }
}

async function adminCriticalHydrate(db) {
  const [campaigns, rukns, karkuns, karkunCounter, connections, connectionMeta] =
    await Promise.all([
      getDocs(collection(db, 'campaigns')),
      getDocs(collection(db, 'rukns')),
      getDocs(collection(db, 'karkuns')),
      getDoc(doc(db, 'settings', 'karkunCounter')),
      getDocs(collection(db, 'connections')),
      getDoc(doc(db, 'settings', 'connectionMeta')),
    ])
  return {
    campaigns: campaigns.size,
    rukns: rukns.size,
    karkuns: karkuns.size,
    karkunCounter: karkunCounter.exists() ? karkunCounter.data() : null,
    connections: connections.size,
    connectionMeta: connectionMeta.exists() ? connectionMeta.data() : null,
  }
}

async function ruknCriticalHydrate(db, ruknId) {
  const [ruknDoc, karkunsAssigned, karkunsUnassigned, connections, connectionMeta] =
    await Promise.all([
      getDoc(doc(db, 'rukns', ruknId)),
      getDocs(query(collection(db, 'karkuns'), where('assignedRuknId', '==', ruknId))),
      getDocs(query(collection(db, 'karkuns'), where('assignedRuknId', '==', ''))),
      getDocs(query(collection(db, 'connections'), where('ruknId', '==', ruknId))),
      getDoc(doc(db, 'settings', 'connectionMeta')),
    ])
  return {
    ruknExists: ruknDoc.exists(),
    karkunsAssigned: karkunsAssigned.size,
    karkunsUnassignedPool: karkunsUnassigned.size,
    connections: connections.size,
    connectionMeta: connectionMeta.exists() ? connectionMeta.data() : null,
  }
}

async function loadActiveKarkunIds(dbAdmin) {
  const snap = await dbAdmin.collection('connections').where('status', '==', 'Active').get()
  return new Set(snap.docs.map((d) => d.data().karkunId).filter(Boolean))
}

async function pickUnassignedKarkun(dbAdmin, excludeIds = new Set()) {
  const active = await loadActiveKarkunIds(dbAdmin)
  const karkuns = await dbAdmin.collection('karkuns').get()
  for (const d of karkuns.docs) {
    const data = d.data()
    if (data.isArchived) continue
    if (active.has(d.id)) continue
    if (excludeIds.has(d.id)) continue
    return { id: d.id, data }
  }
  return null
}

async function pickRuknWithCapacity(dbAdmin) {
  const rukns = await dbAdmin.collection('rukns').get()
  for (const d of rukns.docs) {
    const active = await dbAdmin
      .collection('connections')
      .where('ruknId', '==', d.id)
      .where('status', '==', 'Active')
      .get()
    if (active.size < 50) return { id: d.id, data: d.data(), connected: active.size }
  }
  return null
}

async function countConnectedForRukn(dbAdmin, ruknId) {
  const snap = await dbAdmin
    .collection('connections')
    .where('ruknId', '==', ruknId)
    .where('status', '==', 'Active')
    .get()
  return snap.size
}

async function allocateAndAssign(session, { ruknId, karkunId, assignedBy }) {
  const { db } = session
  const metaRef = doc(db, 'settings', 'connectionMeta')
  const now = new Date().toISOString()
  const today = now.slice(0, 10)

  const allocated = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(metaRef)
    const meta = snapshot.exists() ? snapshot.data() ?? {} : {}
    const current = Number(meta.nextSequence)
    const seq = Number.isFinite(current) && current >= 1 ? current : 1
    const assignmentNumber = formatAsn(seq)
    transaction.set(
      metaRef,
      {
        nextSequence: seq + 1,
        asnRepairVersion: meta.asnRepairVersion ?? 1,
      },
      { merge: true },
    )
    return { assignmentNumber, nextSequence: seq + 1 }
  })

  const assignmentId = `asgn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const payload = {
    assignmentId,
    assignmentNumber: allocated.assignmentNumber,
    ruknId,
    karkunId,
    status: 'Active',
    assignedBy,
    effectiveFrom: today,
    assignedDate: today,
    createdAt: now,
    updatedAt: now,
    remarks: VALIDATION_TAG,
  }

  await setDoc(doc(db, 'connections', assignmentId), payload)
  return { assignmentId, ...allocated, payload }
}

async function pickRuknUser(authAdmin) {
  let pageToken
  do {
    const page = await authAdmin.listUsers(1000, pageToken)
    for (const user of page.users) {
      if (user.customClaims?.role === 'rukn' && user.customClaims?.ruknId) {
        return user
      }
    }
    pageToken = page.pageToken
  } while (pageToken)
  throw new Error('No rukn user with claims')
}

async function main() {
  const { auth: authAdmin, db: dbAdmin } = initFirebaseAdmin()
  const steps = []
  const report = {
    ticket: 'KC-0061',
    validation: VALIDATION_TAG,
    startedAt: new Date().toISOString(),
    steps,
    failures: [],
    recommendClose: false,
  }

  let adminSession = null
  let ruknSession = null
  let adminAssignment = null
  let ruknAssignment = null
  let baselineHighestAsn = 0
  let baselineNextSequence = null

  try {
    const metaBefore = await dbAdmin.collection('settings').doc('connectionMeta').get()
    baselineNextSequence = metaBefore.data()?.nextSequence ?? null
    const allConn = await dbAdmin.collection('connections').get()
    for (const d of allConn.docs) {
      const n = parseAsn(d.data().assignmentNumber)
      if (n !== null) baselineHighestAsn = Math.max(baselineHighestAsn, n)
    }

    // Step 1 — Admin login
    try {
      const adminUser = await authAdmin.getUser(ADMIN_UID)
      adminSession = await createClientSession('admin', adminUser.uid, authAdmin)
      step(steps, 1, 'PASS', {
        uid: adminSession.uid,
        email: adminUser.email,
        role: adminSession.claims.role,
      })
    } catch (error) {
      step(steps, 1, 'FAIL', errInfo(error))
      report.failures.push({ step: 1, ...errInfo(error) })
      throw error
    }

    // Step 2 — Dashboard hydration (critical reads)
    try {
      const hydrate = await adminCriticalHydrate(adminSession.db)
      step(steps, 2, 'PASS', hydrate)
    } catch (error) {
      step(steps, 2, 'FAIL', errInfo(error))
      report.failures.push({ step: 2, ...errInfo(error) })
      throw error
    }

    // Step 3 — Assign one Karkun (Admin)
    const adminRukn = await pickRuknWithCapacity(dbAdmin)
    const adminKarkun = await pickUnassignedKarkun(dbAdmin)
    if (!adminRukn || !adminKarkun) {
      step(steps, 3, 'FAIL', { message: 'No available rukn/karkun pair for admin assign' })
      report.failures.push({ step: 3, message: 'No available rukn/karkun pair' })
      throw new Error('No available rukn/karkun pair for admin assign')
    }
    const connectedBeforeAdmin = await countConnectedForRukn(dbAdmin, adminRukn.id)
    try {
      adminAssignment = await allocateAndAssign(adminSession, {
        ruknId: adminRukn.id,
        karkunId: adminKarkun.id,
        assignedBy: 'Administrator',
      })
      step(steps, 3, 'PASS', {
        assignmentId: adminAssignment.assignmentId,
        assignmentNumber: adminAssignment.assignmentNumber,
        ruknId: adminRukn.id,
        karkunId: adminKarkun.id,
      })
    } catch (error) {
      step(steps, 3, 'FAIL', errInfo(error))
      report.failures.push({ step: 3, ...errInfo(error) })
      throw error
    }

    // Step 4 — Verify Firestore write
    try {
      const snap = await dbAdmin.collection('connections').doc(adminAssignment.assignmentId).get()
      if (!snap.exists) throw new Error('Connection document not found after assign')
      step(steps, 4, 'PASS', { path: snap.ref.path, data: snap.data() })
    } catch (error) {
      step(steps, 4, 'FAIL', errInfo(error))
      report.failures.push({ step: 4, ...errInfo(error) })
      throw error
    }

    // Step 5 — Verify ASN > current highest
    try {
      const asnNum = parseAsn(adminAssignment.assignmentNumber)
      if (asnNum === null || asnNum <= baselineHighestAsn) {
        throw new Error(
          `Assigned ASN ${adminAssignment.assignmentNumber} not > baseline highest ${formatAsn(baselineHighestAsn)}`,
        )
      }
      step(steps, 5, 'PASS', {
        assigned: adminAssignment.assignmentNumber,
        baselineHighest: formatAsn(baselineHighestAsn),
      })
    } catch (error) {
      step(steps, 5, 'FAIL', errInfo(error))
      report.failures.push({ step: 5, ...errInfo(error) })
      throw error
    }

    // Step 6 — Connected count update
    try {
      const connectedAfter = await countConnectedForRukn(dbAdmin, adminRukn.id)
      if (connectedAfter !== connectedBeforeAdmin + 1) {
        throw new Error(
          `Connected count expected ${connectedBeforeAdmin + 1}, got ${connectedAfter}`,
        )
      }
      step(steps, 6, 'PASS', {
        ruknId: adminRukn.id,
        before: connectedBeforeAdmin,
        after: connectedAfter,
      })
    } catch (error) {
      step(steps, 6, 'FAIL', errInfo(error))
      report.failures.push({ step: 6, ...errInfo(error) })
      throw error
    }

    // Step 7 — Logout Admin
    try {
      await destroySession(adminSession)
      adminSession = null
      step(steps, 7, 'PASS', { message: 'Admin signed out' })
    } catch (error) {
      step(steps, 7, 'FAIL', errInfo(error))
      report.failures.push({ step: 7, ...errInfo(error) })
      throw error
    }

    // Step 8 — Rukn login
    let ruknUser
    try {
      ruknUser = await pickRuknUser(authAdmin)
      ruknSession = await createClientSession('rukn', ruknUser.uid, authAdmin)
      step(steps, 8, 'PASS', {
        uid: ruknSession.uid,
        phone: ruknUser.phoneNumber,
        role: ruknSession.claims.role,
        ruknId: ruknSession.claims.ruknId,
      })
    } catch (error) {
      step(steps, 8, 'FAIL', errInfo(error))
      report.failures.push({ step: 8, ...errInfo(error) })
      throw error
    }

    const ruknId = ruknSession.claims.ruknId
    if (!ruknId) {
      step(steps, 8, 'FAIL', { message: 'Rukn session missing ruknId claim' })
      throw new Error('Rukn session missing ruknId claim')
    }

    // Step 9 — Rukn confirm one Karkun
    const ruknKarkun = await pickUnassignedKarkun(dbAdmin, new Set([adminKarkun.id]))
    if (!ruknKarkun) {
      step(steps, 9, 'FAIL', { message: 'No unassigned karkun available for Rukn confirm' })
      report.failures.push({ step: 9, message: 'No unassigned karkun' })
      throw new Error('No unassigned karkun for Rukn confirm')
    }
    const connectedBeforeRukn = await countConnectedForRukn(dbAdmin, ruknId)
    try {
      ruknAssignment = await allocateAndAssign(ruknSession, {
        ruknId,
        karkunId: ruknKarkun.id,
        assignedBy: 'Rukn',
      })
      step(steps, 9, 'PASS', {
        assignmentId: ruknAssignment.assignmentId,
        assignmentNumber: ruknAssignment.assignmentNumber,
        ruknId,
        karkunId: ruknKarkun.id,
      })
    } catch (error) {
      step(steps, 9, 'FAIL', errInfo(error))
      report.failures.push({ step: 9, ...errInfo(error) })
      throw error
    }

    // Step 10 — Rukn dashboard hydration
    try {
      const hydrate = await ruknCriticalHydrate(ruknSession.db, ruknId)
      if (!hydrate.ruknExists) throw new Error(`Rukn doc missing: rukns/${ruknId}`)
      step(steps, 10, 'PASS', hydrate)
    } catch (error) {
      step(steps, 10, 'FAIL', errInfo(error))
      report.failures.push({ step: 10, ...errInfo(error) })
      throw error
    }

    // Step 11 — Metrics
    try {
      const connectedAfterRukn = await countConnectedForRukn(dbAdmin, ruknId)
      if (connectedAfterRukn !== connectedBeforeRukn + 1) {
        throw new Error(
          `Rukn connected count expected ${connectedBeforeRukn + 1}, got ${connectedAfterRukn}`,
        )
      }
      const metaAfter = await dbAdmin.collection('settings').doc('connectionMeta').get()
      step(steps, 11, 'PASS', {
        ruknId,
        connectedBefore: connectedBeforeRukn,
        connectedAfter: connectedAfterRukn,
        nextSequenceBefore: baselineNextSequence,
        nextSequenceAfter: metaAfter.data()?.nextSequence ?? null,
        adminAssignment: adminAssignment.assignmentNumber,
        ruknAssignment: ruknAssignment.assignmentNumber,
      })
    } catch (error) {
      step(steps, 11, 'FAIL', errInfo(error))
      report.failures.push({ step: 11, ...errInfo(error) })
      throw error
    }

    report.recommendClose = report.failures.length === 0
    step(steps, 'summary', report.recommendClose ? 'PASS' : 'FAIL', {
      message: report.recommendClose
        ? 'All 11 validation steps passed'
        : `${report.failures.length} step(s) failed`,
    })
  } catch (error) {
    if (!report.failures.some((f) => f.stack)) {
      report.failures.push({ fatal: true, ...errInfo(error) })
    }
  } finally {
    if (adminSession) await destroySession(adminSession)
    if (ruknSession) await destroySession(ruknSession)
  }

  report.finishedAt = new Date().toISOString()
  report.adminAssignment = adminAssignment
  report.ruknAssignment = ruknAssignment
  report.baseline = {
    highestAsn: formatAsn(baselineHighestAsn),
    nextSequence: baselineNextSequence,
  }

  const outPath = resolve(ROOT, 'production-data/exports/kc0061-final-production-validation.json')
  writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ recommendClose: report.recommendClose, failures: report.failures, wrote: outPath }, null, 2))
  process.exit(report.recommendClose ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
