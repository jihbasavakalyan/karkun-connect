# KC-0100.3 — Rukn Activation Reliability Audit

**Project:** `karkun-connect-75c68`  
**Audit time:** 2026-07-24T18:36:51Z  
**Raw export:** `production-data/exports/kc0100-rukn-claims-audit-2026-07-24T18-36-51-866Z.json`  
**Policy:** KC-ARCH-001 (Reliability & Persistence) · KC-0100 fail-closed JWT claims

No users were manually patched during this investigation.

---

## 1. Classification summary

| Category | Count | Exact failing condition |
|----------|------:|-------------------------|
| **Total Active Rukns** | **49** | `status === 'active' && !isArchived` in Rukn Master |
| Active + Auth + **valid claims** (fully activated) | **37** | JWT/custom claims `role=rukn` and `ruknId` match Master |
| Active + Auth + **missing claims** | **4** | Auth user exists for phone; custom claims null/`{}` |
| Active + Auth + **invalid/wrong claims** | **0** | — |
| Active + **no Firebase Auth user** | **8** | Never completed phone OTP (Auth user not created) |
| Inactive / Archived | **0** | All 49 Master rows are Active |
| Duplicate Auth users (same phone) | **0** | — |
| Duplicate Master mobile numbers | **0** | — |
| Phone mismatches / invalid mobile | **0** | — |
| Other (admin phone conflict, etc.) | **0** | — |

**Users who hit the activation error today** are the **4 missing-claims** Rukns (OTP already succeeded; JWT has no `role`/`ruknId`).

---

## 2. Affected Rukns

### A. Missing / invalid claims (blocked at Activation Check)

Failing step: **Custom Claims → JWT** (Auth exists; claims never provisioned).

| Rukn | Name | Mobile | Auth UID | Actual claims |
|------|------|--------|----------|---------------|
| R002 | Amir Khan | +919035668228 | `poxNVuCYbLOaWKPAx1UT5HhzYPw2` | `{}` |
| R024 | Abdul Khader Er | +919916811010 | `UQ0ygkRaRhfAprEe3kGzVKmv9Rj1` | `{}` |
| R026 | Syed Sher Ali | +918123738051 | `IUP8qiPLPVYJ5rAFAiDhwhpKeLC2` | `{}` |
| R031 | Abdul Khaleel Gobre | +919986791928 | `mb6mchoFdiR9dz6OtrbEHLq05Hr1` | `{}` |

User-facing message (code): *“Your Rukn access is not activated yet. Please contact your administrator…”* (`MISSING_RUKN_JWT_CLAIMS_ERROR`).

### B. No Firebase Auth user (never onboarded via OTP)

Failing step: **Phone Number → Firebase Auth User** (Master OK; no OTP completed yet).

| Rukn | Name | Mobile |
|------|------|--------|
| R001 | Ruqia Tahaniyat | +918095788236 |
| R010 | Shahida Banu Qureshi | +919986022289 |
| R014 | Syeda Amatul Azeez Kokab | +916366346489 |
| R017 | Shah Jahan Begum | +917411172327 |
| R021 | Qyamuddin Baagh | +917975422103 |
| R025 | Bushra Fathima | +917019400343 |
| R042 | Ishrat Khanum | +917795661980 |
| R049 | Mujahid Pasha Qureshi | +919742319121 |

These are **not** claim bugs. First successful OTP will create Auth; with KC-0100.3 auto-provision they become fully activated without manual ops.

---

## 3. Activation flow — exact failing step

```
Rukn Master (Active)     ✅ for all 49
    → Phone Number       ✅
    → Firebase Auth User ✅ for 41 Active phones / ❌ for 8 never-OTP’d
    → Custom Claims      ❌ for R002, R024, R026, R031 (null)
    → JWT                ❌ no role/ruknId in ID token
    → Activation Check   ❌ mapFirebaseUser / finalizeLogin fail-closed (KC-0100)
    → Dashboard          never reached
```

For the symptomatic users, **OTP and Auth succeed**. The break is **claim provisioning**, not Master data or phone identity.

---

## 4. First-time OTP onboarding audit

| Question | Finding (before KC-0100.3) | After permanent fix |
|----------|----------------------------|---------------------|
| Is claim provisioning automatic? | **No.** Phone OTP creates Auth only. Claims required Admin SDK scripts (`kc0100-reconcile`, `set-custom-claims`). No Cloud Function. | **Yes** — `POST /api/rukn-claims-provision` after OTP when claims missing/wrong |
| Can provisioning fail silently? | **Yes.** User only saw activation error; no automatic retry/provision. | Failures are logged (`[KC-0100.3]`); user still fail-closed if provision/refresh fails |
| Can provisioning be retried? | Only via ops reconcile scripts | Every subsequent OTP `finalizeLogin` retries provision + force token refresh |
| Race conditions? | Token refresh without claims → permanent block until Admin set claims | Provision → `getIdToken(true)` → re-`mapFirebaseUser`; still fail-closed if JWT incomplete |
| Can authenticated Rukn stay permanently unprovisioned? | **Yes** — Auth user with empty claims forever | **No** for production with service account configured; next OTP self-heals |

### Code path that previously allowed OTP + Auth without claims

1. `signInWithPhoneNumber` / `confirmation.confirm` → Firebase creates Auth user  
2. No server hook set `role` / `ruknId`  
3. `mapFirebaseUser` → KC-0100 rejects missing JWT claims  
4. User permanently stuck until manual Admin SDK repair  

That gap is closed by auto-provision in `finalizeLogin` (still **no JWT bypass**).

---

## 5. Root cause(s)

1. **Systemic (primary):** First OTP creates a Firebase Auth user but **never provisions custom claims**. KC-0100 correctly fail-closes sessions without `role=rukn` + `ruknId`, so Active Master Rukns with Auth but empty claims see the activation error forever.  
2. **Operational lag:** KC-0100.2 reconcile scripts can repair existing holes, but **new first-time OTP users reintroduce the same class of failure** without an automatic provision path.  
3. **Not a root cause:** Master status, phone duplicates, or JWT validation being “too strict” — fail-closed must remain.

---

## 6. Permanent fix (implemented)

### Design (KC-0100 preserved)

```
OTP success
  → if JWT lacks/mismatches Rukn claims
  → POST /api/rukn-claims-provision (Bearer ID token)
  → Admin SDK: verify phone → Active Master → setCustomUserClaims({ role: 'rukn', ruknId })
  → client force-refresh ID token
  → mapFirebaseUser + Master validation (fail-closed if still invalid)
  → Dashboard
```

### Files

| Piece | Path |
|-------|------|
| Provision handler | `src/server/ruknClaims/provisionHandler.ts` |
| Admin init | `src/server/ruknClaims/firebaseAdmin.ts` |
| Vercel API | `api/rukn-claims-provision.ts` |
| Client helper | `src/lib/auth/requestRuknClaimsProvision.ts` |
| OTP wiring | `src/services/authenticationService.ts` (`finalizeLogin`) |
| Verify | `npm run verify:kc0100.3` |

### Security constraints

- Requires verified phone ID token  
- Grants only `role: 'rukn'` + Master `ruknId` for that phone  
- Refuses administrator accounts / unknown / duplicate Active mobiles  
- Does **not** bypass JWT validation or weaken fail-closed checks  

### Deploy requirement

Set **`FIREBASE_SERVICE_ACCOUNT_JSON`** (or reuse `GOOGLE_TTS_CREDENTIALS_JSON`) on Vercel. Without it the API returns 503 and users remain fail-closed until credentials are configured. See `docs/operations/vercel-configuration.md`.

### Existing affected users (R002, R024, R026, R031)

Do **not** require a one-off manual patch if auto-provision is deployed: their next OTP will provision claims and activate. Ops may still run `npm run admin:kc0100:claims:apply` for immediate repair without waiting for OTP.

### Future Rukns

First OTP → Auth created → auto-provision → refreshed JWT → dashboard. Manual activation is no longer part of the happy path.

---

## 7. Verification

```bash
npm run verify:kc0100.3
npm run admin:kc0100:claims:audit   # read-only classification
```

Contract verify confirms: Admin SDK provision, Bearer verification, OTP auto-provision + token refresh, KC-0100 fail-closed message/gate preserved.
