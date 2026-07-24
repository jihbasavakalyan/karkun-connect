#!/usr/bin/env node
/**
 * KC-0100.5 — Production provision API end-to-end probe for one affected Rukn.
 *
 * Uses Admin SDK to mint a custom token for an Auth UID that already has a phone,
 * exchanges it for an ID token, then POSTs production /api/rukn-claims-provision.
 *
 * Modes:
 *   --dry   do not call setCustomUserClaims path side-effects beyond the API itself
 *           (the API may still provision — use a missing-claims user intentionally)
 *   --trace print step-by-step results (default)
 *
 * Does not invent JWT bypasses; calls the same production endpoint the browser uses.
 */
import { initFirebaseAdmin } from './_firebase-init.mjs'

const PROD_API = process.env.KC0100_5_PROVISION_URL ??
  'https://karkun-connect.vercel.app/api/rukn-claims-provision'
const TARGET_RUKN = process.env.KC0100_5_RUKN_ID ?? 'R026'
const WEB_API_KEY = process.env.VITE_FIREBASE_API_KEY ?? process.env.FIREBASE_WEB_API_KEY

function step(n, name, data) {
  console.log(
    JSON.stringify({
      ticket: 'KC-0100.5',
      step: n,
      name,
      ts: new Date().toISOString(),
      ...data,
    }),
  )
}

function normalizePhone(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

async function exchangeCustomToken(customToken, apiKey) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  })
  const body = await res.json()
  if (!res.ok) {
    throw new Error(`signInWithCustomToken failed: ${JSON.stringify(body)}`)
  }
  return body
}

async function main() {
  if (!WEB_API_KEY) {
    console.error('Set VITE_FIREBASE_API_KEY or FIREBASE_WEB_API_KEY for Identity Toolkit exchange.')
    process.exit(2)
  }

  const { auth, db, projectId } = initFirebaseAdmin()
  step(0, 'admin_init', { success: true, projectId })

  const ruknSnap = await db.collection('rukns').doc(TARGET_RUKN).get()
  if (!ruknSnap.exists) {
    step(7, 'rukn_lookup', { success: false, error: 'Rukn doc missing' })
    process.exit(1)
  }
  const rukn = { id: ruknSnap.id, ...ruknSnap.data() }
  const mobile = normalizePhone(rukn.mobile)
  step(7, 'rukn_lookup', {
    success: true,
    ruknId: rukn.id,
    phone: rukn.mobile,
    status: rukn.status,
    isArchived: !!rukn.isArchived,
  })

  step(8, 'active_status_validation', {
    success: rukn.status === 'active' && !rukn.isArchived,
    status: rukn.status,
    isArchived: !!rukn.isArchived,
  })

  // Find Auth user by phone
  const e164 = `+91${mobile}`
  let user
  try {
    user = await auth.getUserByPhoneNumber(e164)
  } catch (error) {
    step(2, 'firebase_auth_user', {
      success: false,
      phone: e164,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    process.exit(1)
  }

  step(2, 'firebase_auth_user', {
    success: true,
    uid: user.uid,
    phone: user.phoneNumber,
    claimsBefore: user.customClaims ?? null,
  })

  // Mint custom token (uid only). Exchanged ID token may omit phone_number —
  // that is itself a diagnostic for step 6/7 if production API returns 403.
  const customToken = await auth.createCustomToken(user.uid)
  step(3, 'id_token_generated', { success: true, uid: user.uid, via: 'customToken+identityToolkit' })

  const exchanged = await exchangeCustomToken(customToken, WEB_API_KEY)
  const idToken = exchanged.idToken
  step(3, 'id_token_exchanged', {
    success: Boolean(idToken),
    uid: exchanged.localId ?? user.uid,
    expiresIn: exchanged.expiresIn,
  })

  step(4, 'post_rukn_claims_provision_sending', {
    success: true,
    url: PROD_API,
    uid: user.uid,
    phone: user.phoneNumber,
    ruknId: TARGET_RUKN,
    claimsBefore: user.customClaims ?? null,
  })

  const started = Date.now()
  const apiRes = await fetch(PROD_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: '{}',
  })
  const apiBody = await apiRes.json().catch(() => ({}))
  step(4, 'post_rukn_claims_provision_received', {
    success: apiRes.ok && apiBody.ok === true,
    httpStatus: apiRes.status,
    durationMs: Date.now() - started,
    body: apiBody,
    uid: user.uid,
    phone: user.phoneNumber,
    ruknId: TARGET_RUKN,
  })

  // Steps 5–11 are server-side; infer from response + re-read Auth user.
  const after = await auth.getUser(user.uid)
  step(11, 'getUser_confirms_stored_claims', {
    success: after.customClaims?.role === 'rukn' && after.customClaims?.ruknId === TARGET_RUKN,
    uid: after.uid,
    phone: after.phoneNumber,
    ruknId: TARGET_RUKN,
    claimsBefore: user.customClaims ?? null,
    claimsAfter: after.customClaims ?? null,
  })

  if (apiRes.status === 403 && String(apiBody.error ?? '').includes('Phone authentication')) {
    step(6, 'verifyIdToken_phone_claim', {
      success: false,
      note: 'Custom-token ID token lacks phone_number — expected for this probe method. Proves API auth path reached phone gate.',
      body: apiBody,
    })
  }

  console.log(
    JSON.stringify({
      ticket: 'KC-0100.5',
      summary: {
        targetRukn: TARGET_RUKN,
        uid: user.uid,
        apiStatus: apiRes.status,
        apiOk: apiBody.ok === true,
        claimsAfter: after.customClaims ?? null,
        failingHint:
          apiBody.ok === true
            ? null
            : apiBody.error ?? `HTTP ${apiRes.status}`,
      },
    }),
  )
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      ticket: 'KC-0100.5',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }),
  )
  process.exit(1)
})
