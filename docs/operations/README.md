# Operations — Karkun Connect Production Readiness (P1)

Operational documentation for deploying and running Karkun Connect in production. Core product development is complete; this folder covers configuration, security, deployment, recovery, and pilot launch.

## Quick Links

| Document | Purpose |
|----------|---------|
| [Production Checklist](production-checklist.md) | Master go-live checklist |
| [Deployment Guide](deployment-guide.md) | Build, configure, deploy |
| [Firebase Production Audit](firebase-production-audit.md) | Firebase console verification |
| [Security Audit](security-audit.md) | Rules, auth, secrets review |
| [Environment Management](environment-management.md) | Dev / staging / production vars |
| [Backup Guide](backup-guide.md) | Export, restore, retention |
| [Recovery Guide](recovery-guide.md) | Disaster recovery and rollback |
| [Monitoring](monitoring.md) | Logging and alerting recommendations |
| [Performance Review](performance-review.md) | Firestore and listener audit |
| [Smoke Test](smoke-test.md) | Production smoke test procedures |
| [Admin Setup](admin-setup.md) | Administrator accounts and claims |
| [Pilot Launch Guide](pilot-launch-guide.md) | Basavakalyan pilot runbook |
| [Incident Response](incident-response.md) | Severity levels and escalation |
| [Release Candidate](release-candidate.md) | RC1 release notes, risks, go-live |

## Verification Commands

```bash
npm run lint
npm run build
npm run verify:rc1
npm run verify:production   # P1 operational readiness checks
```

## Architecture References

- [Authentication (M7)](../architecture/authentication.md)
- [Firestore Backend (M8)](../architecture/firestore.md)
- [Repository Layer (M6.9)](../architecture/repository-layer.md)
