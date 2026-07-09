# Incident Response — P1

## Severity Levels

| Level | Definition | Response Time | Example |
|-------|------------|---------------|---------|
| **P1 — Critical** | Pilot stopped; no workaround | 15 minutes | Cannot login; data loss |
| **P2 — High** | Major feature broken | 1 hour | Assignments not saving |
| **P3 — Medium** | Degraded experience | 4 hours | Slow sync; intermittent OTP |
| **P4 — Low** | Cosmetic / minor | Next business day | UI alignment issue |

## Response Flow

```
Detect → Triage → Communicate → Mitigate → Resolve → Post-mortem
```

1. **Detect** — User report, monitoring alert, or smoke test failure
2. **Triage** — Assign severity; identify owner
3. **Communicate** — Notify pilot lead and affected users (P1/P2)
4. **Mitigate** — Rollback, restore, or workaround
5. **Resolve** — Fix deployed; smoke test passed
6. **Post-mortem** — Document cause and prevention (P1/P2 only)

## Contacts

| Role | Name | Contact |
|------|------|---------|
| Pilot Lead | | |
| Technical Lead | | |
| Firebase Admin | | |
| Feedback Coordinator | | |

## Common Incidents

### Cannot Login (Administrator)

1. Check Firebase status page
2. Verify authorized domain includes production URL
3. Verify `VITE_FIREBASE_*` in deployed build
4. Test with Firebase Console user reset

### Cannot Login (Rukn OTP)

1. Check phone auth quota
2. Verify mobile matches `ruknMaster`
3. Verify reCAPTCHA on production domain
4. Check custom claim `ruknId`

### Data Not Syncing

1. Check browser online status
2. Verify `VITE_REPOSITORY_PROVIDER=firestore`
3. Check Firestore rules for permission-denied
4. Force refresh; check Firebase console for writes

### Permission Denied on Save

1. Verify custom claims on user
2. Review `firestore.rules` for collection
3. Check Rukn writing outside own `ruknId`

## Escalation

| If unresolved in | Escalate to |
|------------------|-------------|
| 30 min (P1) | Technical Lead + Firebase Admin |
| 2 hours (P2) | Product Owner |
| 1 day (P3) | Sprint planning backlog |

## Post-Mortem Template

- **Date / Duration**
- **Impact** (users affected)
- **Root cause**
- **Resolution**
- **Prevention** (monitoring, docs, automation)
