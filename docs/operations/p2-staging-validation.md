# P2 — Production Configuration & Staging Validation

Operational runbook for preparing the production Firebase project, deploying infrastructure, configuring Vercel, importing production data, and validating the complete application before the Basavakalyan pilot.

**Scope:** Configuration and validation only. No application code, UI, business rules, repository, or Firestore architecture changes.

## Prerequisites

- Firebase CLI (`firebase-tools`)
- Firebase Blaze billing (phone OTP)
- Vercel project (or staging URL on Firebase Hosting)
- Service account JSON for Admin SDK scripts
- RC1 build passing: `npm run verify:rc1`

## Part 1 — Firebase Project

Verify in [Firebase Console](https://console.firebase.google.com) (see [Firebase Production Audit](firebase-production-audit.md)):

| Item | Required state | Verified |
|------|----------------|----------|
| Email/Password auth | Enabled | ☐ |
| Phone auth | Enabled | ☐ |
| Firestore database | Created | ☐ |
| Firestore region | `asia-south1` (or confirmed) | ☐ |
| Authorized domains | Staging + production URLs | ☐ |
| Billing | Blaze plan active | ☐ |
| SMS region | India (+91) | ☐ |
| Auth quotas | Sufficient for 49 Rukns + admins | ☐ |

Copy `.firebaserc.example` to `.firebaserc` and set project IDs (do not commit if sensitive).

## Part 2 — Firestore Deploy

```bash
firebase login
firebase use staging   # or production after staging sign-off
firebase deploy --only firestore:rules,firestore:indexes
```

Verify:

| Check | How | Pass |
|-------|-----|------|
| Rules active | Firebase Console → Firestore → Rules tab shows deployed rules | ☐ |
| Indexes built | Firestore → Indexes — no pending composite indexes | ☐ |
| Database accessible | Admin login on staging URL loads data | ☐ |

## Part 3 — Custom Claims

**Important:** Use `role: "administrator"` (not `admin`). Firestore rules and `roleResolver.ts` expect `administrator` and `rukn`.

### Create accounts

1. **Administrators:** Firebase Console → Authentication → Add user (email/password).
2. **Rukns:** First OTP login creates the phone user; then set claims.

### Assign claims (Admin SDK)

```bash
npm install
$env:FIREBASE_SERVICE_ACCOUNT_PATH = "C:\path\to\service-account.json"

# Copy and fill CSV templates from config/claims/
node scripts/admin/set-custom-claims.mjs --csv config/claims/administrators.csv --dry-run
node scripts/admin/set-custom-claims.mjs --csv config/claims/administrators.csv

node scripts/admin/set-custom-claims.mjs --csv config/claims/rukn.csv --dry-run
node scripts/admin/set-custom-claims.mjs --csv config/claims/rukn.csv
```

### Verify claims

| Check | Steps | Pass |
|-------|-------|------|
| Admin claim | Login as admin → `/admin` loads | ☐ |
| Rukn claim | Login via OTP → `/rukn` loads with correct scope | ☐ |
| Token refresh | Sign out, sign in — role persists without `VITE_ADMIN_EMAILS` | ☐ |

See [Admin Setup](admin-setup.md) and [scripts/admin/README.md](../../scripts/admin/README.md).

## Part 4 — Vercel

Follow [Vercel Configuration](vercel-configuration.md).

Set all variables for **staging** first:

| Variable | Value |
|----------|-------|
| `VITE_FIREBASE_*` | From Firebase project settings |
| `VITE_REPOSITORY_PROVIDER` | `firestore` |
| `VITE_ADMIN_EMAILS` | Bootstrap admins (remove after claims) |

Redeploy staging after env changes. Confirm build embeds Firestore mode.

## Part 5 — Production Data

### Option A — Admin SDK import (recommended for empty Firestore)

```bash
npm run admin:export-seed
node scripts/admin/import-dataset-backup.mjs production-data/exports/seed-backup.json --dry-run
node scripts/admin/import-dataset-backup.mjs production-data/exports/seed-backup.json
node scripts/admin/verify-firestore-production.mjs
```

### Option B — In-app migration wizard

1. Deploy staging with `VITE_REPOSITORY_PROVIDER=firestore`.
2. Admin → Settings → Data Migration.
3. Import final Rukn Master and Karkun Master files from `production-data/`.

### Verify data

| Check | Expected | Pass |
|-------|----------|------|
| Rukn count | 49 | ☐ |
| Karkun count | Per final master (~493) | ☐ |
| Duplicate IDs | None | ☐ |
| Connections | Valid ruknId/karkunId references | ☐ |
| Journey scaffolding | Compliance records per karkun | ☐ |

## Part 6 — End-to-End Validation

Run [Smoke Test](smoke-test.md) on the **staging URL** against staging Firebase.

### Administrator

| Area | Pass |
|------|------|
| Login | ☐ |
| Campaign | ☐ |
| Rukn | ☐ |
| Karkun | ☐ |
| Connect | ☐ |
| Execution | ☐ |
| Communication | ☐ |
| Compliance | ☐ |
| Reports | ☐ |
| Logout | ☐ |

### Rukn

| Area | Pass |
|------|------|
| OTP Login | ☐ |
| Home | ☐ |
| Connected Karkun | ☐ |
| Record Visit | ☐ |
| Journey | ☐ |
| Logout | ☐ |

## Part 7 — Multi-Device Test

| Scenario | Pass |
|----------|------|
| Desktop ↔ Desktop sync | ☐ |
| Desktop ↔ Mobile sync | ☐ |
| Offline → Online recovery | ☐ |
| Concurrent updates | ☐ |
| Conflict handling | ☐ |
| Snapshot listeners update UI | ☐ |

## Part 8 — Security Test

| Scenario | Expected | Pass |
|----------|----------|------|
| Unauthorized routes | Redirect to login or home | ☐ |
| Rukn → `/admin` | Blocked | ☐ |
| Admin → `/rukn` | Allowed or redirected per policy | ☐ |
| Firestore rules | Unauthenticated reads denied | ☐ |
| Session expiry | Re-auth required | ☐ |
| Logout | Session cleared | ☐ |
| Invalid OTP | Error shown, no access | ☐ |
| Invalid password | Error shown, no access | ☐ |

## Part 9 — Performance

Record measurements in [Go-Live Report](go-live-report.md):

| Metric | Target (guidance) | Measured |
|--------|-------------------|----------|
| Initial load (staging) | < 5s on 4G | |
| Authentication | < 3s | |
| Firestore cold read (admin home) | < 2s | |
| Firestore write (assignment) | < 1s perceived | |
| Snapshot listener update | < 2s cross-device | |
| Offline recovery | Data intact after reconnect | |

Use browser DevTools → Network and Performance tabs. See [Performance Review](performance-review.md).

## Part 10 — Go-Live Report

Complete [Go-Live Report](go-live-report.md) with configuration summary, smoke results, security status, known issues, and **Go / No-Go** recommendation.

## Automated Checks (Repo)

```bash
npm run lint
npm run build
npm run verify:rc1
npm run verify:production
npm run verify:p2
```

Live Firebase/Vercel steps require credentials and cannot run in CI without secrets.

## Sign-Off

| Role | Name | Date | Result |
|------|------|------|--------|
| Technical lead | | | ☐ Go ☐ No-Go |
| Operations | | | ☐ Go ☐ No-Go |
| Pilot coordinator | | | ☐ Go ☐ No-Go |

After approval → **P3 — Basavakalyan Pilot Launch** ([Pilot Launch Guide](pilot-launch-guide.md)).
