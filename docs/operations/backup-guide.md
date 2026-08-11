# Backup Guide — P1 / KC-027.1

**Canonical baseline:** [Firestore Backup & Recovery Baseline](./firestore-backup-recovery-baseline.md)  
**Non-prod drills:** [Non-Production Recovery Runbook](./firestore-nonprod-recovery-runbook.md)

This page is the operator summary. Prefer Google-managed Firestore backups, PITR, and GCS export/import. Do **not** build a custom in-app backup engine for DR.

## Production target (inventory)

| Item | Value |
|------|-------|
| Project | `karkun-connect-75c68` |
| Database | `(default)` |
| Region | Confirm `locationId` (recommended `asia-south1`) — see baseline |

Preview/staging must use an **isolated** Firebase project — never production.

## Backup Methods

### 1. Firestore managed scheduled backups (primary DR)

Daily + weekly schedules on `(default)`. Restore only to a **new** database ID (see runbook).

```bash
gcloud firestore backups schedules list --database='(default)' --project=karkun-connect-75c68
gcloud firestore backups list --database='(default)' --project=karkun-connect-75c68
```

### 2. Point-in-time recovery (PITR)

Enable on `(default)` for a 7-day minute-level window. Use for recent accidental deletes; validate in non-prod first.

### 3. Firestore managed export → Cloud Storage (archive / cross-project)

```bash
gcloud firestore export gs://karkun-connect-75c68-firestore-backups/firestore/$(date +%Y%m%d) \
  --database='(default)' \
  --project=karkun-connect-75c68
```

| Item | Recommendation |
|------|----------------|
| Schedule | Daily at 02:00 IST |
| Retention | 30 daily, 12 monthly |
| Bucket | Dedicated locked bucket in prod project |
| Encryption | Google-managed or CMEK |

### 4. Application JSON Backup (Administrator) — supplemental

Built-in via **Admin → Settings → Data Migration**:

- **Export current dataset** — downloads full JSON snapshot
- **Pre-import backup** — automatic before migration wizard

Snapshot includes: rukns, karkuns, assignments, campaigns, migration version.

**Not** a substitute for managed backups / PITR / GCS exports.

### 5. Git / Build Artifacts

| Asset | Location | Purpose |
|-------|----------|---------|
| Source code | `origin/main` | Rollback build |
| `dist/` | CI artifact | Known-good deploy |
| `firestore.rules` | Repository | Rule rollback |
| `firestore.indexes.json` | Repository | Index rollback |

## Restore Process

### Non-production first (mandatory for drills)

Follow [firestore-nonprod-recovery-runbook.md](./firestore-nonprod-recovery-runbook.md).

### Firestore import (staging / drill only)

```bash
gcloud firestore import gs://YOUR_BUCKET/backups/YYYYMMDD --database='(default)'
```

**Warning:** Import overwrites existing documents in target collections. **Never** target production `(default)` during KC-027.1 drills.

### Application JSON Restore

1. Administrator → Settings → Data Migration
2. Load backup from index or upload JSON
3. Confirm restore — replaces people registry and assignments in repository
4. Verify counts on dashboard

### Programmatic Migration

`migrateLocalStorageToFirestore()` — one-time local → cloud migration (M8). Not a restore tool.

## Disaster Recovery

| Scenario | RTO Target | Procedure |
|----------|------------|-----------|
| Bad deploy | 15 min | Redeploy previous `dist/` artifact |
| Firestore data corruption | 4 hours | Non-prod validate from backup/PITR; production cutover only via separate approval |
| Firebase project compromise | 24 hours | New project, restore export, update env, redeploy |
| Auth outage | 1 hour | Check Firebase status; verify authorized domains |

## Rollback Strategy

1. **Application:** Redeploy previous build (tag/commit documented in release notes)
2. **Rules:** `firebase deploy --only firestore:rules` from previous git tag
3. **Data:** Non-prod restore drill first; production data restore is change-controlled
4. **Auth claims:** Re-run Admin SDK claim script from backup roster

## Backup Schedule

| Backup | Frequency | Owner |
|--------|-----------|-------|
| Managed Firestore backups | Daily + weekly | Ops / GCP admin |
| Firestore GCS export | Daily | Ops / GCP admin |
| JSON manual export | Before each data migration | Administrator |
| Build artifact | Each release | CI/CD |
| Rules/index snapshot | Each release | Git tag |

## Retention Policy

| Type | Retention |
|------|-----------|
| Managed daily backups | 14 days |
| Managed weekly backups | 14 weeks |
| PITR | 7 days |
| Daily GCS exports | 30 days |
| Monthly GCS archives | 12 months |
| Migration JSON backups (in-app) | Last 5 (automatic) |
| Release build artifacts | 6 months |

## Related

- [Firestore Backup & Recovery Baseline](./firestore-backup-recovery-baseline.md)
- [Non-Production Recovery Runbook](./firestore-nonprod-recovery-runbook.md)
- [Recovery Guide](./recovery-guide.md)
- [Deployment Guide](./deployment-guide.md)
