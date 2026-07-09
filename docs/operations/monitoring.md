# Monitoring — P1

The application does not ship a built-in APM dashboard. Use the following recommended stack for production.

## Recommended Tools

| Layer | Tool | Purpose |
|-------|------|---------|
| Errors (client) | Sentry / Firebase Crashlytics | JS exceptions, auth failures |
| Performance | Firebase Performance Monitoring | Page load, network |
| Auth | Firebase Authentication dashboard | Sign-in failures, OTP quota |
| Database | Firebase Console → Firestore | Usage, denials, latency |
| Uptime | UptimeRobot / Pingdom | HTTPS availability |
| Logs (serverless) | Cloud Logging | Custom claim scripts, exports |

## What to Monitor

### Authentication Failures

| Signal | Source | Alert Threshold |
|--------|--------|-----------------|
| Failed email login spike | Firebase Auth | > 10/min same IP |
| OTP failures | Firebase Auth Phone | > 5 failures/user/hour |
| `auth/too-many-requests` | Client error mapping | Any sustained burst |

### Firestore Failures

| Signal | Source | Alert Threshold |
|--------|--------|-----------------|
| `permission-denied` | Firestore usage / client | Any admin workflow |
| `resource-exhausted` | Firestore quota | 80% daily quota |
| Write latency | Firebase console | p95 > 2s |

### Repository Failures

Client-side `RepositoryResult` errors map to:

- `Permission` — rules or claims misconfiguration
- `StorageFailure` — offline / network
- `Duplicate` — conflict detected

**Recommendation:** Integrate Sentry breadcrumb on `!result.ok` in repository layer (post-pilot).

### Offline / Sync

| Signal | Source |
|--------|--------|
| `offlineSyncPort.getStatus()` | `pending`, `offline`, `conflict` |
| User reports stale data | Support channel |

## Alerting Matrix

| Severity | Condition | Response |
|----------|-----------|----------|
| P1 | Production down / no login | Incident response — 15 min |
| P2 | Firestore permission denials for admins | Check rules + claims — 1 hour |
| P3 | Elevated OTP failures | Check quota / reCAPTCHA — 4 hours |
| P4 | Performance degradation | Review indexes — next business day |

## Dashboards to Create

1. **Firebase Overview** — Auth users, Firestore reads/writes
2. **Pilot Health** — Daily active Rukns, assignments created, visits recorded
3. **Error Rate** — Client errors per session (when Sentry added)

## Logging Recommendations

| Event | Log Level | Include |
|-------|-----------|---------|
| Auth login success | Info | uid, role (no PII in production logs) |
| Auth login failure | Warn | error message (mapped, no Firebase codes to user) |
| Repository write failure | Error | entity, error code |
| Migration complete | Info | version, counts |

**Do not log:** passwords, OTP codes, full phone numbers in production.

## Related

- [Incident Response](incident-response.md)
- [Performance Review](performance-review.md)
