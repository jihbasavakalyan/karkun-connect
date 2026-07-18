# Firebase Admin Scripts — P2

Operational scripts for production configuration. These require a Firebase **service account** with Auth Admin and Firestore access.

## Prerequisites

1. Download service account JSON from Firebase Console → Project Settings → Service Accounts.
2. Set credentials (do not commit the key file):

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_PATH = "C:\secrets\karkun-connect-sa.json"
# or
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\secrets\karkun-connect-sa.json"
```

3. Install dependencies (includes `firebase-admin`):

```bash
npm install
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run admin:export-seed` | Export bundled Rukn/Karkun master to `production-data/exports/seed-backup.json` |
| `node scripts/admin/import-dataset-backup.mjs <file>` | Import backup JSON to Firestore |
| `node scripts/admin/set-custom-claims.mjs --csv <file>` | Set administrator / Rukn custom claims |
| `node scripts/admin/verify-firestore-production.mjs` | Verify row counts, duplicates, connection integrity |
| `npm run admin:sanitize-runtime:dry` | Preview KC-017.1 runtime wipe (no writes) |
| `npm run admin:sanitize-runtime -- --yes` | **KC-017.1** Wipe connections/visits/activity; reset karkuns to Unconnected |

## KC-017.1 — Production runtime sanitization

Removes test/demo execution data while preserving master registry (rukns, karkuns identity, campaign config, auth).

```powershell
firebase login
npm run admin:sanitize-runtime:dry
npm run admin:sanitize-runtime -- --yes
npm run admin:verify-firestore
```

After sanitization, ask users to hard-refresh (or clear site data once) so IndexedDB offline cache does not resurrect deleted docs.

## Custom Claims

The application expects these claim values (not `admin`):

| Role | Claims |
|------|--------|
| Administrator | `{ "role": "administrator" }` |
| Rukn | `{ "role": "rukn", "ruknId": "R001" }` |

CSV templates: `config/claims/`

Users must **sign out and sign in** after claims are set.

## Typical Staging Flow

```bash
firebase use staging
firebase deploy --only firestore:rules,firestore:indexes

npm run admin:export-seed
node scripts/admin/import-dataset-backup.mjs production-data/exports/seed-backup.json --dry-run
node scripts/admin/import-dataset-backup.mjs production-data/exports/seed-backup.json

node scripts/admin/set-custom-claims.mjs --csv config/claims/administrators.csv
node scripts/admin/verify-firestore-production.mjs
```

See [P2 Staging Validation](../../docs/operations/p2-staging-validation.md) for the full runbook.
