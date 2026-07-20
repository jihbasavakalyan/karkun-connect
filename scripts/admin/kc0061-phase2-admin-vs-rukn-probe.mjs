#!/usr/bin/env node
/**
 * KC-0061 Phase 2 — Prove Admin vs Rukn assignment failure point on production.
 *
 * For each identity (administrator, rukn):
 *   1. Custom-token sign-in
 *   2. Capture JWT claims + times
 *   3. getDoc(settings/connectionMeta)
 *   4. runTransaction no-op merge on connectionMeta (ASN allocator equivalent)
 *   5. Attempt create of a temporary connections/{id} doc, then Admin-SDK cleanup
 *
 * Usage:
 *   node scripts/admin/kc0061-phase2-admin-vs-rukn-probe.mjs
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc, deleteDoc, runTransaction } from 'firebase/firestore'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const ADMIN_UID = 'VQkrDSDGoQUptRlyghtlFxmcJN03'

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

async function pickRukn(authAdmin) {
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

async function probeIdentity(label, uid, authAdmin, dbAdmin) {
  const config = clientConfig()
  const app = initializeApp(config, `kc0061p2-${label}-${Date.now()}`)
  const auth = getAuth(app)
  const db = getFirestore(app)
  const timeline = []
  const t0 = Date.now()
  const mark = (step, status, extra = {}) => {
    timeline.push({
      step,
      status,
      durationMs: Date.now() - t0,
      ...extra,
    })
  }

  const report = {
    label,
    uid,
    firebaseProjectId: config.projectId,
    timeline,
    auth: null,
    failures: [],
    firstFailure: null,
  }

  try {
    mark('auth.createCustomToken', 'ENTER')
    const token = await authAdmin.createCustomToken(uid)
    mark('auth.createCustomToken', 'EXIT')

    mark('auth.signInWithCustomToken', 'ENTER')
    await signInWithCustomToken(auth, token)
    mark('auth.signInWithCustomToken', 'EXIT')

    mark('auth.getIdTokenResult(forceRefresh)', 'ENTER')
    const tokenResult = await auth.currentUser.getIdTokenResult(true)
    mark('auth.getIdTokenResult(forceRefresh)', 'EXIT', {
      role: tokenResult.claims.role ?? null,
      ruknId: tokenResult.claims.ruknId ?? null,
    })

    report.auth = {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      phone: auth.currentUser.phoneNumber,
      role: tokenResult.claims.role ?? null,
      ruknId: tokenResult.claims.ruknId ?? null,
      tokenIssuedAt: tokenResult.issuedAtTime,
      tokenExpiration: tokenResult.expirationTime,
      authTime: tokenResult.authTime,
      firebaseProjectId: config.projectId,
      claimKeys: Object.keys(tokenResult.claims),
    }

    // --- connectionMeta get ---
    const metaRef = doc(db, 'settings', 'connectionMeta')
    mark('firestore.getDoc(settings/connectionMeta)', 'ENTER', {
      collection: 'settings',
      document: 'connectionMeta',
      operation: 'get',
    })
    try {
      const snap = await getDoc(metaRef)
      mark('firestore.getDoc(settings/connectionMeta)', 'EXIT', {
        exists: snap.exists(),
        nextSequence: snap.exists() ? snap.data()?.nextSequence : null,
      })
    } catch (error) {
      const info = errInfo(error)
      mark('firestore.getDoc(settings/connectionMeta)', 'EXCEPTION', {
        collection: 'settings',
        document: 'connectionMeta',
        operation: 'get',
        ...info,
      })
      report.failures.push({
        step: 'firestore.getDoc(settings/connectionMeta)',
        ...info,
        path: 'settings/connectionMeta',
        operation: 'get',
      })
      if (!report.firstFailure) {
        report.firstFailure = report.failures[report.failures.length - 1]
      }
    }

    // --- ASN-equivalent transaction (no-op nextSequence) ---
    mark('firestore.runTransaction(settings/connectionMeta)', 'ENTER', {
      collection: 'settings',
      document: 'connectionMeta',
      operation: 'runTransaction/set(merge) no-op',
    })
    try {
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(metaRef)
        const meta = snapshot.exists() ? snapshot.data() ?? {} : {}
        const current = Number(meta.nextSequence)
        transaction.set(
          metaRef,
          {
            nextSequence: Number.isFinite(current) && current >= 1 ? current : 1,
            asnRepairVersion: meta.asnRepairVersion ?? 1,
          },
          { merge: true },
        )
      })
      mark('firestore.runTransaction(settings/connectionMeta)', 'EXIT', { ok: true })
    } catch (error) {
      const info = errInfo(error)
      mark('firestore.runTransaction(settings/connectionMeta)', 'EXCEPTION', {
        collection: 'settings',
        document: 'connectionMeta',
        operation: 'runTransaction/set',
        ...info,
      })
      report.failures.push({
        step: 'firestore.runTransaction(settings/connectionMeta)',
        ...info,
        path: 'settings/connectionMeta',
        operation: 'runTransaction/set',
      })
      if (!report.firstFailure) {
        report.firstFailure = report.failures[report.failures.length - 1]
      }
    }

    // --- connections create (temp) ---
    const tempId = `kc0061p2-probe-${label}-${Date.now()}`
    const connRef = doc(db, 'connections', tempId)
    const ruknIdForCreate =
      report.auth.role === 'rukn' ? report.auth.ruknId : 'R001'
    const payload = {
      assignmentId: tempId,
      assignmentNumber: 'ASN-PROBE-000',
      ruknId: ruknIdForCreate,
      karkunId: 'kr-probe-do-not-use',
      status: 'Active',
      assignedBy: label === 'admin' ? 'Administrator' : 'Rukn',
      effectiveFrom: new Date().toISOString().slice(0, 10),
      assignedDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    mark('firestore.setDoc(connections/{temp})', 'ENTER', {
      collection: 'connections',
      document: tempId,
      operation: 'set',
      ruknId: ruknIdForCreate,
    })
    try {
      await setDoc(connRef, payload)
      mark('firestore.setDoc(connections/{temp})', 'EXIT', { ok: true, tempId })
      // cleanup via Admin SDK (rules block client delete)
      await dbAdmin.collection('connections').doc(tempId).delete()
      mark('admin.cleanup(connections/{temp})', 'EXIT', { tempId })
    } catch (error) {
      const info = errInfo(error)
      mark('firestore.setDoc(connections/{temp})', 'EXCEPTION', {
        collection: 'connections',
        document: tempId,
        operation: 'set',
        ...info,
      })
      report.failures.push({
        step: 'firestore.setDoc(connections/{temp})',
        ...info,
        path: `connections/${tempId}`,
        operation: 'set',
      })
      if (!report.firstFailure) {
        report.firstFailure = report.failures[report.failures.length - 1]
      }
      // best-effort cleanup
      try {
        await dbAdmin.collection('connections').doc(tempId).delete()
      } catch {
        // ignore
      }
    }
  } finally {
    try {
      await signOut(auth)
    } catch {
      // ignore
    }
    try {
      await deleteApp(app)
    } catch {
      // ignore
    }
  }

  report.totalMs = Date.now() - t0
  return report
}

async function main() {
  const { auth: authAdmin, db: dbAdmin } = initFirebaseAdmin()
  const adminUser = await authAdmin.getUser(ADMIN_UID)
  const ruknUser = await pickRukn(authAdmin)

  const adminReport = await probeIdentity('admin', adminUser.uid, authAdmin, dbAdmin)
  const ruknReport = await probeIdentity('rukn', ruknUser.uid, authAdmin, dbAdmin)

  const comparison = {
    Authentication: {
      Admin: adminReport.auth?.uid ? 'OK' : 'FAIL',
      Rukn: ruknReport.auth?.uid ? 'OK' : 'FAIL',
    },
    JWTClaims: {
      Admin: adminReport.auth?.role ?? null,
      Rukn: `${ruknReport.auth?.role ?? null}/${ruknReport.auth?.ruknId ?? null}`,
    },
    connectionMetaGet: {
      Admin: adminReport.timeline.find((s) => s.step.includes('getDoc') && s.status !== 'ENTER')
        ?.status,
      Rukn: ruknReport.timeline.find((s) => s.step.includes('getDoc') && s.status !== 'ENTER')
        ?.status,
    },
    connectionMetaTxn: {
      Admin: adminReport.timeline.find((s) => s.step.includes('runTransaction') && s.status !== 'ENTER')
        ?.status,
      Rukn: ruknReport.timeline.find((s) => s.step.includes('runTransaction') && s.status !== 'ENTER')
        ?.status,
    },
    connectionsCreate: {
      Admin: adminReport.timeline.find((s) => s.step.includes('setDoc') && s.status !== 'ENTER')
        ?.status,
      Rukn: ruknReport.timeline.find((s) => s.step.includes('setDoc') && s.status !== 'ENTER')
        ?.status,
    },
    FailurePoint: {
      Admin: adminReport.firstFailure?.step ?? null,
      Rukn: ruknReport.firstFailure?.step ?? null,
    },
    OriginalException: {
      Admin: adminReport.firstFailure
        ? {
            code: adminReport.firstFailure.code,
            message: adminReport.firstFailure.message,
            path: adminReport.firstFailure.path,
            operation: adminReport.firstFailure.operation,
          }
        : null,
      Rukn: ruknReport.firstFailure
        ? {
            code: ruknReport.firstFailure.code,
            message: ruknReport.firstFailure.message,
            path: ruknReport.firstFailure.path,
            operation: ruknReport.firstFailure.operation,
          }
        : null,
    },
  }

  const shared =
    adminReport.firstFailure &&
    ruknReport.firstFailure &&
    adminReport.firstFailure.path === ruknReport.firstFailure.path &&
    adminReport.firstFailure.code === ruknReport.firstFailure.code

  const rootCause = {
    bothFail: Boolean(adminReport.firstFailure && ruknReport.firstFailure),
    bothSucceed: !adminReport.firstFailure && !ruknReport.firstFailure,
    sharedFirstFailure: shared
      ? {
          path: adminReport.firstFailure.path,
          code: adminReport.firstFailure.code,
          operation: adminReport.firstFailure.operation,
        }
      : null,
    adminOnlyFailure: adminReport.firstFailure && !ruknReport.firstFailure,
    ruknOnlyFailure: !adminReport.firstFailure && ruknReport.firstFailure,
    divergeAt: !shared
      ? {
          admin: adminReport.firstFailure?.step ?? 'none',
          rukn: ruknReport.firstFailure?.step ?? 'none',
        }
      : 'same Firestore path',
    serverClaims: {
      admin: adminUser.customClaims ?? null,
      rukn: ruknUser.customClaims ?? null,
    },
  }

  const out = {
    ticket: 'KC-0061-Phase2',
    generatedAt: new Date().toISOString(),
    adminReport,
    ruknReport,
    comparison,
    rootCause,
  }

  const outPath = resolve(ROOT, 'production-data/exports/kc0061-phase2-admin-vs-rukn.json')
  writeFileSync(outPath, JSON.stringify(out, null, 2))
  console.log(JSON.stringify(out, null, 2))
  console.log('Wrote', outPath)

  if (out.rootCause.bothSucceed) {
    console.log('PROBE: both Admin and Rukn succeed at ASN path + connection create with current claims')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
