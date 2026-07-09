# Backup Guide — P1

## Backup Methods

### 1. Firestore Scheduled Export (Recommended)

Use Google Cloud Firestore managed export to Cloud Storage.

```bash
gcloud firestore export gs://YOUR_BUCKET/backups/$(date +%Y%m%d)
```

| Item | Recommendation |
|------|----------------|
| Schedule | Daily at 02:00 IST |
| Retention | 30 daily, 12 monthly |
| Bucket | Separate GCP project or locked bucket |
| Encryption | Google-managed or CMEK |

### 2. Application JSON Backup (Administrator)

Built-in via **Admin → Settings → Data Migration**:

- **Export current dataset** — downloads full JSON snapshot
- **Pre-import backup** — automatic before migration wizard

Snapshot includes: rukns, karkuns, assignments, campaigns, migration version.

### 3. Git / Build Artifacts

| Asset | Location | Purpose |
|-------|----------|---------|
| Source code | `origin/main` | Rollback build |
| `dist/` | CI artifact | Known-good deploy |
| `firestore.rules` | Repository | Rule rollback |
| `firestore.indexes.json` | Repository | Index rollback |

## Restore Process

### Firestore Import

```bash
gcloud firestore import gs://YOUR_BUCKET/backups/YYYYMMDD
```

**Warning:** Import overwrites existing documents in target collections. Test on staging first.

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
| Firestore data corruption | 4 hours | Import latest daily export |
| Firebase project compromise | 24 hours | New project, restore export, update env, redeploy |
| Auth outage | 1 hour | Check Firebase status; verify authorized domains |

## Rollback Strategy

1. **Application:** Redeploy previous build (tag/commit documented in release notes)
2. **Rules:** `firebase deploy --only firestore:rules` from previous git tag
3. **Data:** Firestore import from pre-change export
4. **Auth claims:** Re-run Admin SDK claim script from backup roster

## Backup Schedule

| Backup | Frequency | Owner |
|--------|-----------|-------|
| Firestore export | Daily | Ops / GCP admin |
| JSON manual export | Before each data migration | Administrator |
| Build artifact | Each release | CI/CD |
| Rules/index snapshot | Each release | Git tag |

## Retention Policy

| Type | Retention |
|------|-----------|
| Daily Firestore exports | 30 days |
| Monthly archives | 12 months |
| Migration JSON backups (in-app) | Last 5 (automatic) |
| Release build artifacts | 6 months |

## Related

- [Recovery Guide](recovery-guide.md)
- [Deployment Guide](deployment-guide.md)
