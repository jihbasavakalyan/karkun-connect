# Go-Live Report — P2 Staging Validation

**Project:** Karkun Connect — Basavakalyan Pilot  
**Report date:** _YYYY-MM-DD_  
**Staging URL:** _https://..._  
**Firebase project:** _project-id_  
**Build / commit:** _hash_  
**Prepared by:** _name_

---

## Executive Summary

_One paragraph: readiness for pilot, key risks, recommendation._

**Recommendation:** ☐ **Go** — proceed to P3 pilot launch  ☐ **No-Go** — blockers listed below

---

## 1. Configuration Summary

### Firebase Authentication

| Item | Status | Notes |
|------|--------|-------|
| Email/Password | ☐ Enabled | |
| Phone OTP | ☐ Enabled | |
| Anonymous auth | ☐ Disabled | |
| Authorized domains | ☐ Configured | |

### Firestore

| Item | Status | Notes |
|------|--------|-------|
| Region | | e.g. `asia-south1` |
| Rules deployed | ☐ | Commit: _hash_ |
| Indexes built | ☐ | Pending: _none / list_ |
| Billing (Blaze) | ☐ | |

### Vercel / Hosting

| Item | Status | Notes |
|------|--------|-------|
| `VITE_REPOSITORY_PROVIDER=firestore` | ☐ | |
| All `VITE_FIREBASE_*` set | ☐ | |
| `VITE_ADMIN_EMAILS` | ☐ Bootstrap / ☐ Removed | |
| SPA routing | ☐ | `vercel.json` or equivalent |
| HTTPS | ☐ | |

### Custom Claims

| Role | Accounts configured | Verified after re-login |
|------|---------------------|-------------------------|
| Administrator (`role: administrator`) | _n_ | ☐ |
| Rukn (`role: rukn`, `ruknId`) | _n_ | ☐ |

---

## 2. Environment Summary

| Environment | URL | Firebase project | Repository | Status |
|-------------|-----|------------------|------------|--------|
| Staging | | | firestore | ☐ Validated |
| Production | | | firestore | ☐ Not yet / ☐ Ready |

---

## 3. Production Data

| Dataset | Expected | Actual | Duplicates | Pass |
|---------|----------|--------|------------|------|
| Rukn Master | 49 | | None | ☐ |
| Karkun Master | ~493 | | None | ☐ |
| Connections | _n_ | | Valid refs | ☐ |
| Journey / compliance scaffolding | Per karkun | | | ☐ |

**Import method:** ☐ Admin SDK (`import-dataset-backup.mjs`)  ☐ In-app migration wizard

**Verification command:** `node scripts/admin/verify-firestore-production.mjs`

---

## 4. Smoke Test Results

Reference: [smoke-test.md](smoke-test.md)

### Authentication

| ID | Result | Notes |
|----|--------|-------|
| A1–A7 | ☐ Pass ☐ Fail | |

### Administrator workflows (B1–B9)

| Result | Notes |
|--------|-------|
| ☐ Pass ☐ Fail | |

### Rukn workflows (C1–C6)

| Result | Notes |
|--------|-------|
| ☐ Pass ☐ Fail | |

### Infrastructure (D1–D5)

| Result | Notes |
|--------|-------|
| ☐ Pass ☐ Fail | |

---

## 5. Multi-Device Validation

| Test | Result | Notes |
|------|--------|-------|
| Desktop ↔ Desktop | ☐ | |
| Desktop ↔ Mobile | ☐ | |
| Offline → Online | ☐ | |
| Concurrent updates | ☐ | |
| Conflict handling | ☐ | |
| Snapshot sync | ☐ | |

---

## 6. Security Status

| Control | Result | Notes |
|---------|--------|-------|
| Unauthorized routes blocked | ☐ | |
| Role restrictions enforced | ☐ | |
| Firestore rules (unauth denied) | ☐ | |
| Session / logout | ☐ | |
| Invalid OTP / password | ☐ | |
| Secrets not in repository | ☐ | |
| Service account key secured | ☐ | |

---

## 7. Performance Measurements

| Metric | Target | Measured | Pass |
|--------|--------|----------|------|
| Initial load | < 5s (4G) | | ☐ |
| Authentication | < 3s | | ☐ |
| Firestore reads (admin home) | < 2s | | ☐ |
| Firestore writes | < 1s perceived | | ☐ |
| Listener update (cross-device) | < 2s | | ☐ |
| Offline recovery | Data intact | | ☐ |

---

## 8. Known Issues

| ID | Severity | Description | Mitigation | Blocks pilot? |
|----|----------|-------------|------------|---------------|
| | | | | ☐ |

---

## 9. Automated Verification (Repo)

| Command | Result | Date |
|---------|--------|------|
| `npm run lint` | ☐ Pass | |
| `npm run build` | ☐ Pass | |
| `npm run verify:rc1` | ☐ Pass | |
| `npm run verify:production` | ☐ Pass | |
| `npm run verify:p2` | ☐ Pass | |

---

## 10. Sign-Off

| Role | Name | Signature / Date | Go / No-Go |
|------|------|------------------|------------|
| Technical lead | | | |
| Operations | | | |
| Pilot coordinator | | | |

---

## Next Steps

- ☐ **Go:** Proceed to [P3 — Basavakalyan Pilot Launch](pilot-launch-guide.md)
- ☐ **No-Go:** Resolve blockers in [Incident Response](incident-response.md); re-run P2 validation
