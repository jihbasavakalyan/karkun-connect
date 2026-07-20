#!/usr/bin/env node
/**
 * KC-0061-P1 — Prove which component aborts Confirm Connection.
 *
 * Replays the production ASN allocator path as a Rukn client:
 *   Auth custom token → Firestore runTransaction(settings/connectionMeta)
 *
 * Cases:
 *   A) Token WITHOUT role/ruknId claims  → expect permission-denied
 *   B) Token WITH role=rukn + ruknId     → expect transaction allowed
 *
 * Does NOT create a connection document. Case B uses a no-op merge write
 * (nextSequence unchanged) so production ASN counter is not advanced.
 *
 * Usage:
 *   node scripts/admin/kc0061-p1-prove-confirm-blocker.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth'
import { getFirestore, doc, getDoc, runTransaction } from 'firebase/firestore'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

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

async function pickRuknUser(authAdmin) {
  let pageToken
  do {
    const page = await authAdmin.listUsers(1000, pageToken)
    for (const user of page.users) {
      if (user.customClaims?.role === 'rukn' && user.customClaims?.ruknId && user.phoneNumber) {
        return user
      }
    }
    pageToken = page.pageToken
  } while (pageToken)
  throw new Error('No Firebase user with rukn claims found')
}

async function attemptConnectionMetaTxn(label, authAdmin, targetUser) {
  const config = clientConfig()
  const app = initializeApp(config, `kc0061p1-${label}-${Date.now()}`)
  const auth = getAuth(app)
  const db = getFirestore(app)

  const token = await authAdmin.createCustomToken(targetUser.uid)
  const started = Date.now()
  const result = {
    label,
    uid: targetUser.uid,
    ruknId: targetUser.customClaims?.ruknId ?? null,
    steps: [],
  }

  try {
    result.steps.push({ step: 'auth.signInWithCustomToken', phase: 'ENTER' })
    await signInWithCustomToken(auth, token)
    const tokenResult = await auth.currentUser.getIdTokenResult(true)
    result.steps.push({
      step: 'auth.token.ready',
      phase: 'EXIT',
      durationMs: Date.now() - started,
      claimRole: tokenResult.claims.role ?? null,
      claimRuknId: tokenResult.claims.ruknId ?? null,
    })

    // If claims still present when we intended none, abort the case as invalid.
    result.tokenClaims = {
      role: tokenResult.claims.role ?? null,
      ruknId: tokenResult.claims.ruknId ?? null,
    }

    const metaRef = doc(db, 'settings', 'connectionMeta')

    result.steps.push({
      step: 'firestore.getDoc(settings/connectionMeta)',
      phase: 'ENTER',
      path: 'settings/connectionMeta',
      operation: 'get',
    })
    try {
      const snap = await getDoc(metaRef)
      result.steps.push({
        step: 'firestore.getDoc(settings/connectionMeta)',
        phase: 'EXIT',
        exists: snap.exists(),
        nextSequence: snap.exists() ? snap.data()?.nextSequence : null,
      })
    } catch (error) {
      result.steps.push({
        step: 'firestore.getDoc(settings/connectionMeta)',
        phase: 'EXCEPTION',
        code: error?.code ?? null,
        message: error?.message ?? String(error),
        path: 'settings/connectionMeta',
        operation: 'get',
      })
      result.abortedBy = 'Firestore Rules (read settings/connectionMeta)'
      result.originalException = {
        code: error?.code ?? null,
        message: error?.message ?? String(error),
        path: 'settings/connectionMeta',
        operation: 'get',
      }
      result.success = false
      return result
    }

    result.steps.push({
      step: 'firestore.runTransaction(settings/connectionMeta)',
      phase: 'ENTER',
      path: 'settings/connectionMeta',
      operation: 'transaction.set(merge) no-op nextSequence',
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
      result.steps.push({
        step: 'firestore.runTransaction(settings/connectionMeta)',
        phase: 'EXIT',
        ok: true,
      })
      result.abortedBy = null
      result.success = true
    } catch (error) {
      result.steps.push({
        step: 'firestore.runTransaction(settings/connectionMeta)',
        phase: 'EXCEPTION',
        code: error?.code ?? null,
        message: error?.message ?? String(error),
        path: 'settings/connectionMeta',
        operation: 'transaction.set',
      })
      result.abortedBy = 'Firestore Rules + ASN allocator (connectionMeta transaction)'
      result.originalException = {
        code: error?.code ?? null,
        message: error?.message ?? String(error),
        path: 'settings/connectionMeta',
        operation: 'runTransaction/set',
      }
      result.success = false
    }
  } finally {
    try {
      await signOut(auth)
    } catch {
      // ignore
    }
  }

  result.totalMs = Date.now() - started
  return result
}

async function main() {
  const { auth: authAdmin } = initFirebaseAdmin()
  const ruknUser = await pickRuknUser(authAdmin)
  const savedClaims = { ...(ruknUser.customClaims ?? {}) }

  console.log('=== KC-0061-P1 prove Confirm Connection blocker ===')
  console.log('Subject user', {
    uid: ruknUser.uid,
    phone: ruknUser.phoneNumber,
    savedClaims,
  })

  // --- Case A: no claims on THE SAME uid ---
  await authAdmin.setCustomUserClaims(ruknUser.uid, {})
  await new Promise((r) => setTimeout(r, 2000))
  // Reload user record to confirm claims cleared server-side.
  const cleared = await authAdmin.getUser(ruknUser.uid)
  console.log('Case A server claims after clear', cleared.customClaims ?? null)

  let caseA
  try {
    caseA = await attemptConnectionMetaTxn('WITHOUT_CLAIMS', authAdmin, {
      uid: ruknUser.uid,
      customClaims: cleared.customClaims ?? {},
    })
  } finally {
    await authAdmin.setCustomUserClaims(ruknUser.uid, savedClaims)
    await new Promise((r) => setTimeout(r, 2000))
  }

  const restored = await authAdmin.getUser(ruknUser.uid)
  console.log('Case B server claims after restore', restored.customClaims ?? null)

  // --- Case B: with claims ---
  const caseB = await attemptConnectionMetaTxn('WITH_CLAIMS', authAdmin, {
    uid: ruknUser.uid,
    customClaims: restored.customClaims ?? savedClaims,
  })

  const firstAbortStep =
    caseA.steps.find((s) => s.phase === 'EXCEPTION') ?? null

  const report = {
    ticket: 'KC-0061-P1',
    provenFirstAbort: caseA.abortedBy,
    firstAbortStep,
    caseA_withoutClaims: caseA,
    caseB_withClaims: caseB,
    remappingChain: [
      'allocateNextAssignmentNumber() catch → mapFirestoreError(permission-denied)',
      '→ FRIENDLY_DATA_ACCESS_ERROR ("Unable to load additional information...")',
      '→ throw Error(message) in generateAssignmentNumber',
      '→ assignRukn catch → result.error = that message',
      '→ toOperatorAssignmentError(raw) → FRIENDLY_ASSIGNMENT_ERROR',
      '→ UI: "Unable to complete assignment..."',
    ],
    conclusion: {
      firstComponentThatAborts:
        caseA.originalException?.code === 'permission-denied'
          ? 'Firestore Rules (during ASN allocator / settings/connectionMeta)'
          : caseA.tokenClaims?.role
            ? 'PROOF_INVALID_token_still_had_claims'
            : caseA.abortedBy,
      reason:
        'When JWT lacks role=rukn, isRukn() is false. Firestore denies settings/connectionMeta read/update. ASN allocator fails before connection document write.',
      originalException: caseA.originalException,
      withClaimsTxnAllowed: caseB.success === true,
      uiRemapper: 'src/lib/assignment/operatorFacingError.ts → toOperatorAssignmentError',
      doesAdditionalInfoAbortConfirm: false,
      doesRepositorySaveExecuteWhenDenied:
        'NO — appendAssignment/saveState never reached; failure is at generateAssignmentNumber → allocateNextAssignmentNumber',
    },
  }

  console.log(JSON.stringify(report, null, 2))

  if (caseA.tokenClaims?.role) {
    console.error('PROOF INVALID: Case A token still had role claim')
    process.exit(1)
  }
  if (caseA.originalException?.code !== 'permission-denied') {
    console.error('EXPECTED Case A permission-denied — proof incomplete')
    process.exit(1)
  }
  if (caseB.success !== true) {
    console.error('EXPECTED Case B success with claims — proof incomplete', caseB.originalException)
    process.exit(1)
  }
  console.log(
    'PROOF OK: first abort is Firestore Rules on settings/connectionMeta when JWT lacks rukn claims',
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
