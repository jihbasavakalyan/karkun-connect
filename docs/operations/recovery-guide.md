# Recovery Guide — P1 / KC-027.1

**Data drills:** [Non-Production Recovery Runbook](./firestore-nonprod-recovery-runbook.md)  
**Baseline:** [Firestore Backup & Recovery Baseline](./firestore-backup-recovery-baseline.md)

## Application Rollback

### When to Rollback

- Critical auth failure (no login)
- Data corruption visible on dashboard
- JavaScript crash on all pages
- Firestore rules blocking all admin operations

### Procedure

1. Identify last known-good git tag / build artifact
2. Redeploy `dist/` from that artifact (Vercel previous deployment or hosting rollback)
3. If Firestore rules changed: redeploy rules from same tag
4. Verify smoke test (admin login, dashboard counts)
5. Communicate to pilot users

**Target RTO:** 15 minutes for application-only rollback.

## Data Recovery

### Non-production drill (required path for KC-027.1)

1. Open [firestore-nonprod-recovery-runbook.md](./firestore-nonprod-recovery-runbook.md)
2. Choose Path A (managed backup → new DB), B (PITR/clone → new DB), or C (GCS → staging)
3. Validate collections and counts
4. Optionally attach **Preview** to **staging** project only
5. Record evidence; delete drill databases when done

**Do not** import or restore into production `(default)`.

### From Firestore Export (staging / drill target only)

```bash
# List backups
gsutil ls gs://karkun-connect-75c68-firestore-backups/firestore/

# Import into NON-PRODUCTION project/database only
gcloud firestore import gs://BUCKET/PATH --project=STAGING_PROJECT --database='(default)'
```

### From managed backup

```bash
gcloud firestore backups list --database='(default)' --project=karkun-connect-75c68
gcloud firestore databases restore \
  --source-backup=projects/karkun-connect-75c68/locations/LOCATION/backups/BACKUP_ID \
  --destination-database=recovery-drill-YYYYMMDD
```

Destination must **not** be `(default)`.

### From Application JSON Backup

1. Administrator → Settings → Data Migration
2. Restore from backup index
3. Verify rukn/karkun/assignment counts
4. Re-run compliance initialization if needed (reload app)

## Auth Recovery

| Issue | Fix |
|-------|-----|
| Admin locked out | Firebase Console → reset password |
| Claims missing | Re-run Admin SDK claim script |
| OTP not delivered | Check Blaze plan, quota, authorized domain |
| Wrong role after login | Verify custom claims; check `VITE_ADMIN_EMAILS` |

Firestore data restore does **not** recreate Firebase Auth users.

## Firestore Rules Recovery

```bash
git checkout LAST_GOOD_TAG -- firestore.rules
firebase deploy --only firestore:rules --project karkun-connect-75c68
```

## Communication Template

> Karkun Connect experienced [issue] at [time]. We have [rolled back / restored data]. Please refresh your browser and sign in again. Contact [coordinator] if issues persist.

## Related

- [Firestore Backup & Recovery Baseline](./firestore-backup-recovery-baseline.md)
- [Non-Production Recovery Runbook](./firestore-nonprod-recovery-runbook.md)
- [Backup Guide](./backup-guide.md)
- [Incident Response](./incident-response.md)
- [Pilot Runbook](./pilot-runbook.md)
- [Troubleshooting Guide](./troubleshooting-guide.md)
- [Go-Live Approval](../pilot/go-live-approval.md)
