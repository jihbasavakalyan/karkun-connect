# Recovery Guide — P1

## Application Rollback

### When to Rollback

- Critical auth failure (no login)
- Data corruption visible on dashboard
- JavaScript crash on all pages
- Firestore rules blocking all admin operations

### Procedure

1. Identify last known-good git tag / build artifact
2. Redeploy `dist/` from that artifact
3. If Firestore rules changed: redeploy rules from same tag
4. Verify smoke test (admin login, dashboard counts)
5. Communicate to pilot users

**Target RTO:** 15 minutes for application-only rollback.

## Data Recovery

### From Firestore Export

```bash
# List backups
gsutil ls gs://YOUR_BUCKET/backups/

# Import (DESTRUCTIVE to target collections)
gcloud firestore import gs://YOUR_BUCKET/backups/YYYYMMDD
```

Test on staging project before production import.

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

## Firestore Rules Recovery

```bash
git checkout LAST_GOOD_TAG -- firestore.rules
firebase deploy --only firestore:rules
```

## Communication Template

> Karkun Connect experienced [issue] at [time]. We have [rolled back / restored data]. Please refresh your browser and sign in again. Contact [coordinator] if issues persist.

## Related

- [Backup Guide](backup-guide.md)
- [Incident Response](incident-response.md)
