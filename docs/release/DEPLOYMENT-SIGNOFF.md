# Deployment Sign-Off — Karkun Connect 1.0.0-rc.1

**Product:** Karkun Connect  
**Version / tag:** 1.0.0-rc.1 / `v1.0.0-rc1`  
**Production URL:** https://karkun-connect.vercel.app  
**Firebase:** `karkun-connect-75c68`  
**Sign-off date:** _YYYY-MM-DD_

Companion: [RC1-CERTIFICATE.md](RC1-CERTIFICATE.md) · [Go-Live Approval](../pilot/go-live-approval.md)

---

## Pre-Deploy Checklist

| Item | Confirmed |
|------|-----------|
| Tag `v1.0.0-rc1` exists on `origin/main` | ☐ |
| `npm run lint` / `build` / `verify:rc1` / `verify:production` / `verify:p3` / `verify:rc1-cert` passed on release commit | ☐ |
| Vercel env: all `VITE_FIREBASE_*`, `VITE_REPOSITORY_PROVIDER=firestore` | ☐ |
| Firestore rules and indexes deployed | ☐ |
| Email/Password + Phone OTP enabled; authorized domains include production URL | ☐ |
| Administrator accounts + claims configured | ☐ |
| Rukn Master mobiles verified (Login IDs) | ☐ |
| Backup taken (Firestore export and/or JSON) | ☐ |
| Zero Critical / Zero High in [known-issues.md](../pilot/known-issues.md) | ☐ |
| Rollback owner identified | ☐ |

---

## Deployment Record

| Field | Value |
|-------|-------|
| Deployed by | |
| Deploy time (IST) | |
| Vercel deployment ID | |
| Verified commit / tag | `v1.0.0-rc1` |
| Smoke login (Admin) | ☐ Pass |
| Smoke login (Rukn OTP ×2) | ☐ Pass |
| Dashboard counts (49 / ~493) | ☐ Pass |

---

## Rollback Acknowledgement

Signatories confirm they have reviewed [Recovery Guide](../operations/recovery-guide.md) and accept:

- Application rollback target RTO: **15 minutes**
- Data restore via Firestore export or in-app JSON backup
- Rollback triggers: auth outage > 30 min; data loss; widespread permission-denied

**Rollback tested (procedure walkthrough or staging drill):** ☐ Yes — date: _______

---

## Decision

| Decision | Selected |
|----------|----------|
| **APPROVED** — deploy / keep production on `v1.0.0-rc1` for pilot | ☐ |
| **HOLD** — blockers listed below | ☐ |

**Blockers (if HOLD):**

_

---

## Signatures

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Technical Lead | | | |
| Pilot Lead | | | |
| Administrator Lead | | | |
| Organizational Leadership | | | |

---

## After Sign-Off

1. Announce pilot start per [Pilot Runbook](../operations/pilot-runbook.md)  
2. Monitor first 48 hours ([Incident Response](../operations/incident-response.md))  
3. Log defects only in [known-issues.md](../pilot/known-issues.md)  
4. Do not start Version 1.1 until pilot feedback is reviewed  
