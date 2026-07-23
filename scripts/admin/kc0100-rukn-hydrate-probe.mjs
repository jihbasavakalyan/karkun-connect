#!/usr/bin/env node
/**
 * KC-0100 — Probe Rukn-scoped Firestore reads (same queries as client hydrate).
 *
 * Usage:
 *   node scripts/admin/kc0100-rukn-hydrate-probe.mjs [ruknId]
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth'
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore'
import { initFirebaseAdmin } from './_firebase-init.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const path = resolve(ROOT, name)
    if (!existsSync(path)) continue
    for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq <= 0) continue
      const key = line.slice(0, eq).trim()
      let value = line.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = value
      }
    }
  }
}

loadEnv()

const TARGET = process.argv[2] || 'R041'
const { auth: adminAuth } = initFirebaseAdmin()

const users = []
let pageToken
do {
  const page = await adminAuth.listUsers(1000, pageToken)
  users.push(...page.users)
  pageToken = page.pageToken
} while (pageToken)

const ruknUser = users.find(
  (u) => u.customClaims?.role === 'rukn' && u.customClaims?.ruknId === TARGET,
)

if (!ruknUser) {
  const sample = users
    .filter((u) => u.customClaims?.role === 'rukn')
    .slice(0, 10)
    .map((u) => ({ uid: u.uid, ruknId: u.customClaims?.ruknId, phone: u.phoneNumber }))
  console.log(JSON.stringify({ error: 'no firebase user for target', TARGET, sample }, null, 2))
  process.exit(1)
}

const customToken = await adminAuth.createCustomToken(ruknUser.uid)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig, 'kc0100-probe')
const auth = getAuth(app)
const db = getFirestore(app)
await signInWithCustomToken(auth, customToken)
const idToken = await auth.currentUser.getIdTokenResult(true)
const ruknId = idToken.claims.ruknId

const results = {
  target: TARGET,
  uid: auth.currentUser.uid,
  claims: { role: idToken.claims.role, ruknId },
}

async function probe(label, run) {
  try {
    results[label] = await run()
  } catch (error) {
    results[label] = {
      error: error?.code || (error instanceof Error ? error.message : String(error)),
    }
  }
}

await probe('connections', async () => {
  const snap = await getDocs(
    query(collection(db, 'connections'), where('ruknId', '==', ruknId)),
  )
  return {
    count: snap.size,
    active: snap.docs.filter((d) => d.data().status === 'Active').length,
    karkunIds: snap.docs.map((d) => d.data().karkunId),
  }
})

await probe('karkunsMine', async () => {
  const snap = await getDocs(
    query(collection(db, 'karkuns'), where('assignedRuknId', '==', ruknId)),
  )
  return {
    count: snap.size,
    ids: snap.docs.map((d) => d.id),
  }
})

await probe('karkunsAvailable', async () => {
  const snap = await getDocs(
    query(collection(db, 'karkuns'), where('assignedRuknId', '==', '')),
  )
  return { count: snap.size }
})

await probe('ownRukn', async () => {
  const own = await getDoc(doc(db, 'rukns', ruknId))
  return { exists: own.exists(), name: own.data()?.name ?? null }
})

await probe('campaigns', async () => {
  const snap = await getDocs(collection(db, 'campaigns'))
  return { count: snap.size }
})

await probe('connectionMeta', async () => {
  const meta = await getDoc(doc(db, 'settings', 'connectionMeta'))
  return { exists: meta.exists(), nextSequence: meta.data()?.nextSequence ?? null }
})

console.log(JSON.stringify(results, null, 2))

await signOut(auth)
await deleteApp(app)
