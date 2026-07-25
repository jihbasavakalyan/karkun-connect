# KC-0100.5 — Production Authentication Trace (Blocker)

**Status:** Root cause proven and fixed  
**Affected sample:** R026 Syed Sher Ali (`+918123738051`, uid `IUP8qiPLPVYJ5rAFAiDhwhpKeLC2`)  
**Policy:** KC-ARCH-001 · KC-0100 fail-closed (no JWT bypass)

---

## Exact failing stage

**Step 6 — Admin SDK `verifyIdToken()` on production**

Production `/api/rukn-claims-provision` received a **valid** Firebase ID token (aud=`karkun-connect-75c68`, phone present) and returned:

```json
{"ok":false,"error":"Invalid or expired ID token"}
```

The **same token** verified successfully with local Admin SDK (`verifyIdToken` with and without `checkRevoked`).

Pipeline never reached `setCustomUserClaims` for affected users → Auth claims stayed empty → KC-0100 activation guard failed → activation error.

---

## Production trace (R026) — before fix

| Step | Name | Result |
|-----:|------|--------|
| 1 | OTP verification success | Assumed (user reported post-OTP error) |
| 2 | Firebase Auth UID | `IUP8qiPLPVYJ5rAFAiDhwhpKeLC2` |
| 3 | ID token generated | Success (aud=`karkun-connect-75c68`, phone=`+918123738051`) |
| 4 | POST `/api/rukn-claims-provision` | Invoked (API deployed; client bundle contains provision path) |
| 5 | Request authentication (Bearer present) | Success |
| 6 | **`verifyIdToken()`** | **FAILURE — 401 Invalid or expired ID token** |
| 7–11 | Rukn lookup / setClaims / confirm | Not reached |
| 12–15 | Client refresh / guard / dashboard | Fail-closed at activation guard |

### Supporting probes (pre-fix)

- `POST` without token → `401 Missing Authorization Bearer token` (route live)
- Fake bearer → `401 Invalid or expired ID token` (Admin init reached verify)
- Valid token + local Admin → verify **OK**
- Valid token + prod API → verify **FAIL**
- Vercel env listing: **`FIREBASE_SERVICE_ACCOUNT_JSON` absent**; only `GOOGLE_TTS_CREDENTIALS_JSON` present for server creds
- `FIREBASE_PROJECT_ID` absent on Vercel

---

## Root cause

**Code location:** `src/server/ruknClaims/firebaseAdmin.ts` (credential load) + `src/server/ruknClaims/provisionHandler.ts` (`verifyIdToken`)

KC-0100.3 fell back to `GOOGLE_TTS_CREDENTIALS_JSON` when `FIREBASE_SERVICE_ACCOUNT_JSON` was unset. That initialized Admin “successfully” but **could not verify ID tokens for Firebase project `karkun-connect-75c68`**, so every real OTP provision attempt failed at step 6 with an opaque 401. Client correctly fail-closed (KC-0100).

Not a Master-data issue. Not a missing Auth user. Not JWT validation being “too strict.”

Secondary hardening (not the primary blocker): `onAuthStateChanged` could `signOut` while `finalizeLogin` was still provisioning — guarded with `claimsProvisionInFlight`.

---

## Permanent fix

1. **Ops:** Set Vercel Production + Preview:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = firebase-adminsdk for `karkun-connect-75c68`
   - `FIREBASE_PROJECT_ID` = `karkun-connect-75c68`
2. **Code:** Prefer dedicated Auth SA; **reject** credentials whose `project_id` ≠ expected project (no silent TTS mismatch).
3. **Instrumentation:** KC-0100.5 structured `[KC-0100.5]` JSON traces for steps 1–15; `GET /api/rukn-claims-provision` returns safe Admin diagnostics.
4. **Race:** Defer subscribe `signOut` while claims provision is in flight.
5. **Deploy:** Production redeployed with env + code.

---

## Verification (post-fix)

### Admin diagnostics

```json
{
  "ok": true,
  "expectedProject": "karkun-connect-75c68",
  "projectId": "karkun-connect-75c68",
  "serviceAccountProjectId": "karkun-connect-75c68",
  "serviceAccountEmail": "firebase-adminsdk-fbsvc@karkun-connect-75c68.iam.gserviceaccount.com",
  "credentialSource": "FIREBASE_SERVICE_ACCOUNT_JSON",
  "projectMatch": true
}
```

### R026 production provision

| | Before | After |
|--|--------|-------|
| Claims | `null` | `{ "role": "rukn", "ruknId": "R026" }` |
| API | `401 Invalid or expired ID token` | `200 provisioned: true` |
| `getUser` confirm | empty | role+ruknId match |

Idempotent re-call returned `alreadyProvisioned: true`.

Also provisioned through the same production API: **R002, R024, R031**.

### Contracts

```bash
npm run verify:kc0100.3
npm run verify:kc0100.5
```

---

## How to re-trace in production

1. Open browser DevTools → Console during OTP login; filter `[KC-0100.5]`.
2. Vercel function logs for `/api/rukn-claims-provision` (same JSON shape).
3. `GET https://<host>/api/rukn-claims-provision` for Admin project alignment (no secrets).
4. `node --env-file=.env.local scripts/admin/kc0100-5-prod-provision-probe.mjs`
