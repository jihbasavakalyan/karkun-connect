# Authentication Certification — Version 1.0

**Product:** Karkun Connect  
**Version:** 1.0.0-rc.1 (`v1.0.0-rc1`)  
**Firebase project:** `karkun-connect-75c68`  
**Production URL:** https://karkun-connect.vercel.app  
**Certification date:** 11 July 2026  
**Status:** **CERTIFIED — Authentication frozen for Version 1.0**

---

## Production Readiness Statement

Firebase Authentication for Karkun Connect Pilot V1 is **fully operational and production ready**. Administrator email/password and Rukn phone OTP flows are verified end-to-end. Temporary diagnostic instrumentation has been removed. User-facing errors are mapped; internal Firebase codes are not exposed in production.

**Authentication is frozen for Version 1.0.** No architecture, workflow, or provider redesign until after pilot feedback review (Version 1.1 backlog).

---

## Authentication Architecture

| Layer | Responsibility |
|-------|----------------|
| **Firebase Authentication** | Identity verification only (email/password ownership, phone OTP ownership) |
| **Karkun Connect** | Authorization (role, Rukn Master lookup, route guards, session) |
| **Rukn Master** | Single source of truth for Rukn Login ID (registered mobile) |

Constitution (M7.1): OTP is never sent unless the mobile exists in Rukn Master.

Architecture references:

- [docs/architecture/authentication.md](../architecture/authentication.md)
- [docs/architecture/rukn-authentication.md](../architecture/rukn-authentication.md)

---

## Administrator Login

```
Email → Password → Firebase Email/Password → Role resolution → /admin
```

| Item | Status |
|------|--------|
| Email/Password provider enabled | ✅ |
| Login | ✅ |
| Logout | ✅ |
| Session restore (Remember Me) | ✅ |
| Password reset | ✅ |
| Unauthorized route isolation | ✅ |

---

## Rukn OTP Login

```
Enter mobile
    ↓
Identity lookup (ruknIdentityService)
    ↓
Registered?
    No  → "This mobile number is not registered with the campaign.
           Please contact the Administrator."
           (no reCAPTCHA, no Firebase, no OTP)
    Yes → Invisible reCAPTCHA
    ↓
signInWithPhoneNumber (E.164 +91)
    ↓
OTP SMS → Verify OTP
    ↓
Phone match vs rukn.mobile
    ↓
Session → /rukn
```

| Item | Status |
|------|--------|
| Identity lookup before OTP | ✅ |
| Unregistered rejection | ✅ |
| Firebase Phone Authentication | ✅ |
| OTP SMS delivery | ✅ |
| OTP verification | ✅ |
| Session creation | ✅ |
| Role routing to Rukn dashboard | ✅ |

---

## Firebase Configuration

| Setting | Value |
|---------|-------|
| Project ID | `karkun-connect-75c68` |
| Auth domain | `karkun-connect-75c68.firebaseapp.com` |
| Web app | Configured via `VITE_FIREBASE_*` on Vercel |
| Repository provider (production) | `firestore` |

Client initialization: `src/lib/firebase/firebase.ts` — single app / single `Auth` instance.

---

## Blaze Billing

| Item | Status |
|------|--------|
| Blaze (pay-as-you-go) active | ✅ |
| Phone SMS supported | ✅ |

**Note:** Spark does not support Phone Auth SMS. Diagnostic run previously confirmed `auth/billing-not-enabled` until Blaze was enabled.

---

## SMS Region Policy

| Item | Status |
|------|--------|
| SMS region policy configured | ✅ |
| India (`IN` / `+91`) allowed for Basavakalyan | ✅ |

App always converts mobiles with `toE164IndianPhone` → `+91…`.

---

## Authorized Domains

| Domain | Purpose | Status |
|--------|---------|--------|
| `localhost` | Local development | ✅ |
| `karkun-connect.vercel.app` | Production | ✅ |
| `karkun-connect-75c68.firebaseapp.com` | Firebase default | ✅ |
| Preview hosts (as needed) | Vercel previews | ✅ As configured |

---

## Security Notes

- Unregistered mobiles never reach Firebase (AUTH-04)
- Firebase proves phone ownership only (AUTH-05)
- Application authorizes role and access (AUTH-06)
- Auth attempts logged via `[rukn-auth]` structured logger (AUTH-07) — production audit, not diagnostic dumps
- Production UI never shows raw Firebase `code` / stack traces
- In development only, unmapped auth codes may emit `console.warn('[auth]', …)`
- Custom claims (`administrator` / `rukn` + `ruknId`) recommended; `VITE_ADMIN_EMAILS` bootstrap until claims are set
- Post-OTP phone mismatch → immediate sign-out + “Authentication could not be verified.”

---

## Final Verification Checklist

| Check | Result |
|-------|--------|
| Administrator Email/Password login | ✅ |
| Rukn Phone OTP login | ✅ |
| Firebase Phone Authentication | ✅ |
| OTP SMS delivery | ✅ |
| OTP verification | ✅ |
| Identity lookup before OTP | ✅ |
| Session creation | ✅ |
| Authorization / role routing | ✅ |
| Blaze billing active | ✅ |
| SMS Region Policy configured | ✅ |
| Authorized domains configured | ✅ |
| Diagnostic instrumentation removed | ✅ |
| Production error mapping restored | ✅ |
| `npm run lint` | ✅ (release commit) |
| `npm run build` | ✅ |
| `npm run verify:production` | ✅ |
| `npm run verify:rc1` | ✅ |

---

## Freeze Policy (Version 1.0)

Effective with this certification:

- No authentication architecture changes
- No OTP / identity workflow redesign
- No provider or session-flow redesign
- Only Critical / High defect fixes allowed before / during pilot
- Enhancements → Version 1.1 backlog after pilot feedback review

---

## Related

| Document | Purpose |
|----------|---------|
| [RC1-CERTIFICATE.md](RC1-CERTIFICATE.md) | Release Candidate certification |
| [KNOWN-LIMITATIONS.md](KNOWN-LIMITATIONS.md) | Non-defect boundaries |
| [SUPPORT-HANDBOOK.md](SUPPORT-HANDBOOK.md) | Pilot support triage |
| [Rukn Quick Guide](../operations/rukn-quick-guide.md) | Operator OTP instructions |
